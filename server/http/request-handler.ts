import type { IncomingMessage, ServerResponse } from 'node:http';
import type { MockApplication } from '../application.ts';
import type { DomainEvent } from '../contracts.ts';
import { ApiError, toErrorBody } from '../lib/errors.ts';
import type {
  FunctionEvent,
  FunctionHandler,
  FunctionResult,
  HttpMethod,
} from '../functions/types.ts';
import { matchRoute } from '../routes.ts';
import { createContext, normalizeHeaders, resolveAuth } from '../runtime.ts';

/**
 * Node HTTP adapter.
 *
 * Responsibilities, all transport-only:
 *
 *  1. CORS + preflight (the browser is on :8081, the mock server on :9000);
 *  2. body parsing and size limits;
 *  3. route/callable dispatch into `application.registry`;
 *  4. SSE for `/v1/events/stream`;
 *  5. mapping `ApiError` to a JSON error body.
 *
 * Authorization is *not* here: handlers decide. That keeps the GCP and Lambda
 * adapters thin and impossible to mount without the same checks.
 */

const MAX_BODY_BYTES = 1_000_000;
const METHODS: readonly HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
];

function corsHeaders(origin: string): Record<string, string> {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers':
      'authorization,content-type,x-session-token',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string>,
  extra: Record<string, string> = {},
): void {
  const payload = body === null ? '' : JSON.stringify(body);

  response.writeHead(status, {
    ...headers,
    ...extra,
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...(payload
      ? { 'content-length': String(Buffer.byteLength(payload)) }
      : {}),
  });
  response.end(payload || undefined);
}

function readBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    request.on('data', (chunk: Buffer) => {
      size += chunk.length;

      if (size > MAX_BODY_BYTES) {
        fail(ApiError.invalid('Request body is too large'));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on('error', fail);
    request.on('end', () => {
      if (settled) return;
      settled = true;

      if (chunks.length === 0) {
        resolve(undefined);
        return;
      }

      const text = Buffer.concat(chunks).toString('utf8').trim();
      if (text.length === 0) {
        resolve(undefined);
        return;
      }

      try {
        resolve(JSON.parse(text));
      } catch {
        reject(ApiError.invalid('Request body is not valid JSON'));
      }
    });
  });
}

function toHttpMethod(method: string | undefined): HttpMethod | null {
  const upper = (method ?? 'GET').toUpperCase();

  return METHODS.find((candidate) => candidate === upper) ?? null;
}

function queryFrom(url: URL): Record<string, string> {
  const query: Record<string, string> = {};

  for (const [key, value] of url.searchParams.entries()) {
    query[key] = value;
  }

  return query;
}

function writeEvent(response: ServerResponse, event: DomainEvent): void {
  // Deliberately no `event:` line. The browser's EventSource then delivers every
  // frame through `onmessage`, and the payload's `type` field is what the
  // subscription hook switches on. A named event would require the client to
  // pre-register one listener per domain event.
  response.write(`id: ${event.id}\n`);
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

function handleStream(
  request: IncomingMessage,
  response: ServerResponse,
  app: MockApplication,
  url: URL,
  headers: Record<string, string>,
): void {
  const query = queryFrom(url);
  const auth = resolveAuth(app, headers, query);

  if (!auth) {
    sendJson(response, 401, toErrorBody(ApiError.unauthenticated()), headers);
    return;
  }

  const sinceRaw = query.since;
  const since = sinceRaw === undefined ? null : Number(sinceRaw);

  if (since !== null && (!Number.isInteger(since) || since < 0)) {
    sendJson(
      response,
      400,
      toErrorBody(ApiError.invalid('"since" must be a non-negative integer')),
      headers,
    );
    return;
  }

  response.writeHead(200, {
    ...headers,
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  response.write('retry: 3000\n\n');

  if (since !== null) {
    for (const event of app.events.since(since)) {
      writeEvent(response, event);
    }
  }

  response.write(
    `data: ${JSON.stringify({
      id: 0,
      type: 'ready',
      payload: { cursor: app.events.latestId() },
      createdAt: new Date().toISOString(),
    })}\n\n`,
  );

  const unsubscribe = app.events.subscribe((event) => {
    writeEvent(response, event);
  });

  const heartbeat = setInterval(() => {
    response.write(': ping\n\n');
  }, 15_000);

  const cleanup = () => {
    clearInterval(heartbeat);
    unsubscribe();
  };

  request.on('close', cleanup);
  response.on('error', cleanup);
}

async function dispatch(
  handler: FunctionHandler,
  event: FunctionEvent,
  context: ReturnType<typeof createContext>,
): Promise<FunctionResult> {
  return handler(event, context);
}

export function createRequestListener(app: MockApplication) {
  return (request: IncomingMessage, response: ServerResponse): void => {
    const started = Date.now();
    const headers = normalizeHeaders(request.headers);
    const origin = headers.origin ?? app.config.corsOrigin;
    const cors = corsHeaders(
      app.config.corsOrigin === '*' ? origin : app.config.corsOrigin,
    );

    let url: URL;

    try {
      url = new URL(
        request.url ?? '/',
        `http://${headers.host ?? 'localhost'}`,
      );
    } catch {
      sendJson(
        response,
        400,
        toErrorBody(ApiError.invalid('Malformed request URL')),
        cors,
      );
      return;
    }

    const pathname = decodeURIComponent(url.pathname);
    const method = toHttpMethod(request.method);

    if (method === 'OPTIONS') {
      response.writeHead(204, cors);
      response.end();
      return;
    }

    if (!method) {
      sendJson(
        response,
        405,
        toErrorBody(ApiError.invalid('Unsupported HTTP method')),
        cors,
      );
      return;
    }

    if (pathname === '/v1/events/stream') {
      handleStream(request, response, app, url, headers);

      if (app.config.logRequests) {
        console.log(
          `[mock-server] ${method} ${pathname} -> 200 (${Date.now() - started}ms)`,
        );
      }
      return;
    }

    void (async () => {
      let status = 500;

      try {
        const query = queryFrom(url);
        const context = createContext(app, { headers, query });
        const raw = await readBody(request);

        let handler: FunctionHandler | undefined;
        let params: Record<string, string> = {};
        let body = raw;
        let path = pathname;
        let callable = false;

        if (method === 'POST' && pathname.startsWith('/v1/functions/')) {
          const name = decodeURIComponent(
            pathname.slice('/v1/functions/'.length),
          );

          handler = app.registry[name];
          callable = true;

          if (!handler) {
            throw ApiError.notFound(`Unknown function "${name}"`);
          }

          // Firebase callable convention: the client sends `{ data }`.
          if (
            typeof raw === 'object' &&
            raw !== null &&
            'data' in (raw as Record<string, unknown>)
          ) {
            const envelope = raw as {
              data?: unknown;
              params?: Record<string, string>;
              query?: Record<string, string>;
            };

            body = envelope.data;

            if (envelope.params) {
              params = envelope.params;
            }

            if (envelope.query) {
              Object.assign(query, envelope.query);
            }
          }
        } else {
          const matched = matchRoute(method, pathname);

          if (!matched.route) {
            throw matched.methodMismatch
              ? ApiError.invalid(`Method ${method} is not allowed here`)
              : ApiError.notFound(`No route for ${pathname}`);
          }

          handler = app.registry[matched.route.name];
          params = matched.params;
          path = matched.route.path;

          if (!handler) {
            throw new Error(
              `Route "${matched.route.path}" references unknown function "${matched.route.name}"`,
            );
          }
        }

        const event: FunctionEvent = {
          method,
          path,
          params,
          query,
          body,
          headers,
        };

        const result = await dispatch(handler, event, context);

        if (app.config.latencyMs > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, app.config.latencyMs),
          );
        }

        status = result.status;

        if (result.status === 204) {
          response.writeHead(204, { ...cors, ...result.headers });
          response.end();
        } else {
          sendJson(
            response,
            result.status,
            callable ? { result: result.body } : result.body,
            cors,
            result.headers,
          );
        }
      } catch (error) {
        const apiError =
          error instanceof ApiError
            ? error
            : new ApiError(
                'internal',
                error instanceof Error ? error.message : 'Unexpected error',
              );

        status = apiError.status;

        if (apiError.code === 'internal') {
          console.error(`[mock-server] ${method} ${pathname} failed:`, error);
        }

        if (!response.headersSent) {
          sendJson(response, apiError.status, toErrorBody(apiError), cors);
        } else {
          response.end();
        }
      } finally {
        if (app.config.logRequests) {
          console.log(
            `[mock-server] ${method} ${pathname} -> ${status} (${Date.now() - started}ms)`,
          );
        }
      }
    })();
  };
}
