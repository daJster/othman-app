import type { IncomingMessage, ServerResponse } from 'node:http';
import { ApiError, toErrorBody } from '../lib/errors.ts';
import type {
  FunctionEvent,
  FunctionRegistry,
  FunctionResult,
  HttpMethod,
} from '../functions/types.ts';
import {
  createContext,
  normalizeHeaders,
  type RuntimeDeps,
} from '../runtime.ts';

/**
 * Provider adapters.
 *
 * The same handler functions in `server/functions/*` can be mounted on:
 *
 *  - GCP Functions Framework: `functions.http('meetings-list', createGcpHandler(...))`
 *  - AWS Lambda + API Gateway (REST or HTTP API): `export const handler = createLambdaHandler(...)`
 *
 * Neither adapter performs authorization. A handler resolves `context.auth`
 * itself, so a provider cannot mount an unprotected route by forgetting a
 * middleware. The adapters only translate transport shapes.
 */

export type ServerlessDeps = RuntimeDeps & {
  registry: FunctionRegistry;
};

function toResult(
  statusCode: number,
  body: unknown,
): { statusCode: number; body: string } {
  return {
    statusCode,
    body: statusCode === 204 || body === null ? '' : JSON.stringify(body),
  };
}

async function invoke(
  deps: ServerlessDeps,
  name: string,
  event: FunctionEvent,
  headers: Record<string, string>,
  query: Record<string, string>,
): Promise<FunctionResult> {
  const handler = deps.registry[name];

  if (!handler) {
    throw new ApiError('internal', `Unknown function "${name}"`);
  }

  return handler(event, createContext(deps, { headers, query }));
}

/* ─────────────────────────── GCP Functions Framework ─────────────────────────── */

function readNodeBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('error', reject);
    request.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8').trim();
      if (!text) return resolve(undefined);

      try {
        resolve(JSON.parse(text));
      } catch {
        reject(ApiError.invalid('Request body is not valid JSON'));
      }
    });
  });
}

export function createGcpHandler(
  name: string,
  deps: ServerlessDeps,
): (request: IncomingMessage, response: ServerResponse) => Promise<void> {
  return async (request, response) => {
    const headers = normalizeHeaders(request.headers);
    const url = new URL(request.url ?? '/', 'http://localhost');
    const query: Record<string, string> = {};
    for (const [key, value] of url.searchParams.entries()) query[key] = value;

    // Express/Functions Framework attaches path params to the request.
    const params =
      (
        request as IncomingMessage & {
          params?: Record<string, string>;
        }
      ).params ?? {};

    try {
      const result = await invoke(
        deps,
        name,
        {
          method: (request.method ?? 'GET') as HttpMethod,
          path: url.pathname,
          params,
          query,
          body: await readNodeBody(request),
          headers,
        },
        headers,
        query,
      );

      const { statusCode, body } = toResult(result.status, result.body);
      response.writeHead(statusCode, {
        'content-type': 'application/json; charset=utf-8',
        ...result.headers,
      });
      response.end(body || undefined);
    } catch (error) {
      const api =
        error instanceof ApiError
          ? error
          : new ApiError('internal', 'Unexpected error');
      const { statusCode, body } = toResult(api.status, toErrorBody(api));
      response.writeHead(statusCode, {
        'content-type': 'application/json; charset=utf-8',
      });
      response.end(body);
    }
  };
}

/* ─────────────────────────── AWS Lambda / API Gateway ─────────────────────────── */

export type LambdaEvent = {
  httpMethod?: string;
  rawPath?: string;
  path?: string;
  pathParameters?: Record<string, string | undefined> | null;
  queryStringParameters?: Record<string, string | undefined> | null;
  headers?: Record<string, string | undefined> | null;
  body?: string | null;
  isBase64Encoded?: boolean;
};

export type LambdaResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

export function createLambdaHandler(
  name: string,
  deps: ServerlessDeps,
): (event: LambdaEvent) => Promise<LambdaResult> {
  return async (event) => {
    const headers = normalizeHeaders(event.headers ?? {});
    const query: Record<string, string> = {};

    for (const [key, value] of Object.entries(
      event.queryStringParameters ?? {},
    )) {
      if (value !== undefined) query[key] = value;
    }

    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(event.pathParameters ?? {})) {
      if (value !== undefined) params[key] = value;
    }

    let body: unknown;

    if (event.body) {
      const text = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : event.body;

      try {
        body = JSON.parse(text);
      } catch {
        return {
          statusCode: 400,
          headers: { 'content-type': 'application/json; charset=utf-8' },
          body: JSON.stringify(
            toErrorBody(ApiError.invalid('Request body is not valid JSON')),
          ),
        };
      }
    }

    try {
      const result = await invoke(
        deps,
        name,
        {
          method: (event.httpMethod ?? 'GET') as HttpMethod,
          path: event.rawPath ?? event.path ?? '/',
          params,
          query,
          body,
          headers,
        },
        headers,
        query,
      );

      const { statusCode, body: payload } = toResult(
        result.status,
        result.body,
      );

      return {
        statusCode,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          ...result.headers,
        },
        body: payload,
      };
    } catch (error) {
      const api =
        error instanceof ApiError
          ? error
          : new ApiError('internal', 'Unexpected error');
      const { statusCode, body: payload } = toResult(
        api.status,
        toErrorBody(api),
      );

      return {
        statusCode,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: payload,
      };
    }
  };
}
