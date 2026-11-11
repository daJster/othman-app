import { randomUUID } from 'node:crypto';
import type { AuthContext } from './contracts.ts';
import type { ServerConfig } from './config.ts';
import type { EventBus } from './events/event-bus.ts';
import type { DocumentStore } from './stores/documents.ts';
import type { DatabaseSync } from 'node:sqlite';
import {
  createSessionsRepository,
  toPublicUser,
} from './repositories/users.ts';
import type { FunctionContext } from './functions/types.ts';

/**
 * Per-request context construction.
 *
 * Shared by the local Node adapter, the GCP adapter and the Lambda adapter, so
 * bearer-token resolution and request ids cannot differ between runtimes.
 */

export type RuntimeDeps = {
  db: DatabaseSync;
  documents: DocumentStore;
  events: EventBus;
  config: ServerConfig;
};

export function resolveAuth(
  deps: RuntimeDeps,
  headers: Record<string, string>,
  query: Record<string, string> = {},
): AuthContext | null {
  const header = headers.authorization ?? headers.Authorization;
  const bearer =
    header && header.toLowerCase().startsWith('bearer ')
      ? header.slice(7).trim()
      : undefined;

  // SSE cannot attach headers from the browser's EventSource, so the token may
  // also arrive as a query parameter. Everything else prefers the header.
  const token = bearer ?? headers['x-session-token'] ?? query.token;

  if (!token) return null;

  const sessions = createSessionsRepository(deps.db, deps.config);
  const found = sessions.findActive(token);

  if (!found) return null;

  return { user: toPublicUser(found.user), token };
}

export function createContext(
  deps: RuntimeDeps,
  input: {
    headers: Record<string, string>;
    query: Record<string, string>;
  },
): FunctionContext {
  return {
    db: deps.db,
    documents: deps.documents,
    events: deps.events,
    config: deps.config,
    auth: resolveAuth(deps, input.headers, input.query),
    requestId: randomUUID(),
  };
}

/** Lowercases header names; Node and API Gateway disagree on casing. */
export function normalizeHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;

    normalized[key.toLowerCase()] = Array.isArray(value)
      ? value.join(',')
      : value;
  }

  return normalized;
}
