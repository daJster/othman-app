import type { DatabaseSync } from 'node:sqlite';
import type { AuthContext } from '../contracts.ts';
import type { ServerConfig } from '../config.ts';
import type { EventBus } from '../events/event-bus.ts';
import type { DocumentStore } from '../stores/documents.ts';

/**
 * Serverless function contract.
 *
 * This is the seam the brief asks for: a handler sees an *event* (the request
 * as data) and a *context* (the resources it may use), and returns a plain
 * `{ status, body }`. It never sees `req`/`res`, so the same handler runs under:
 *
 *   - the local Node server (`server/http/request-handler.ts`)
 *   - the GCP Functions Framework (`server/serverless/adapters.ts`)
 *   - AWS Lambda + API Gateway (`server/serverless/adapters.ts`)
 *
 * Authorization lives inside the handler (`context.auth` + `requireRole`), not
 * in the transport, for the same reason: a different provider must not be able
 * to mount an unprotected route by forgetting a middleware.
 */

export type HttpMethod =
  'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

export type FunctionEvent = {
  method: HttpMethod;
  /** Path template as routed, e.g. `/v1/meetings/:id`. */
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  headers: Record<string, string>;
};

export type FunctionContext = {
  db: DatabaseSync;
  documents: DocumentStore;
  events: EventBus;
  config: ServerConfig;
  /** Resolved from the bearer token by the adapter; `null` when signed out. */
  auth: AuthContext | null;
  requestId: string;
};

export type FunctionResult = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

export type FunctionHandler = (
  event: FunctionEvent,
  context: FunctionContext,
) => FunctionResult | Promise<FunctionResult>;

export type FunctionRegistry = Record<string, FunctionHandler>;

/** Identity helper: keeps handler signatures explicit without a wrapper trap. */
export function defineFunction(handler: FunctionHandler): FunctionHandler {
  return handler;
}

export function ok(body: unknown): FunctionResult {
  return { status: 200, body };
}

export function created(body: unknown): FunctionResult {
  return { status: 201, body };
}

export function noContent(): FunctionResult {
  return { status: 204, body: null };
}
