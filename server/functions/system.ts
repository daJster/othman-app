import { ApiError } from '../lib/errors.ts';
import { createUsersRepository } from '../repositories/users.ts';
import { createMeetingsRepository } from '../repositories/meetings.ts';
import { requireAuth, requireRole } from './guards.ts';
import { defineFunction, ok } from './types.ts';
import type { FunctionResult } from './types.ts';

/**
 * Health + diagnostics.
 *
 * `health` is unauthenticated on purpose: the frontend polls it to tell
 * "backend unreachable" apart from "request failed", and an auth error would
 * make a healthy server look broken while signed out.
 */

const STARTED_AT = Date.now();

const health = defineFunction((): FunctionResult =>
  ok({
    ok: true,
    service: 'kuttab-mock-backend',
    version: '1.0.0',
    uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
    time: new Date().toISOString(),
  }),
);

const events = defineFunction((event, context): FunctionResult => {
  requireAuth(context);
  const raw = event.query.since;
  const since = raw === undefined ? 0 : Number(raw);

  if (!Number.isInteger(since) || since < 0) {
    throw ApiError.invalid('"since" must be a non-negative integer');
  }

  return ok({
    events: context.events.since(since),
    cursor: context.events.latestId(),
  });
});

const stats = defineFunction((event, context): FunctionResult => {
  requireRole(context, 'admin');

  return ok({
    users: createUsersRepository(context.db).countAll(),
    meetings: createMeetingsRepository(context.db).countAll(),
    events: context.events.latestId(),
    subscribers: context.events.subscriberCount(),
    database: context.config.dbPath === ':memory:' ? 'memory' : 'sqlite',
    documents: context.config.dataDir,
  });
});

export const systemFunctions = {
  'system.health': health,
  'system.events': events,
  'system.stats': stats,
};
