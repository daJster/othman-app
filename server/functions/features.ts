import { ApiError } from '../lib/errors.ts';
import { asObject } from '../lib/validation.ts';
import {
  EXEMPT_ROLES,
  FEATURE_COLLECTION,
  FEATURE_DOCUMENT_ID,
  FEATURE_STATES,
  LOCKED_FEATURE_KEY,
  isExemptRole,
  isFeatureState,
  readFeatureConfig,
  type ExemptRole,
  type FeatureConfig,
  type FeatureOverride,
  type FeatureState,
} from '../features.ts';
import { requireRole } from './guards.ts';
import { defineFunction, ok } from './types.ts';
import type { FunctionResult } from './types.ts';

/**
 * Feature switches over REST.
 *
 * The document is public-readable because flags have to apply *before* sign-in
 * — a maintenance notice on the landing page is the whole point. Writes are
 * superadmin-only, and the change list is a narrow upsert/remove contract so
 * the console can send only what it touched.
 *
 * Unknown keys that match the pattern are accepted on purpose: the client's
 * registry owns the universe of gates, and adding one must not require a
 * server deploy.
 */

const FEATURE_KEY_PATTERN = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/;
const MAX_CHANGES = 100;
const MAX_NOTE_LENGTH = 500;

type ParsedChange = {
  key: string;
  state: FeatureState | null;
  note?: string | null;
  exemptRoles?: ExemptRole[];
};

function parseChange(value: unknown, index: number): ParsedChange {
  const change = asObject(value, `changes[${index}]`);
  const key = change.key;

  if (typeof key !== 'string' || !FEATURE_KEY_PATTERN.test(key)) {
    throw ApiError.invalid(
      `changes[${index}].key must be a dotted feature key`,
    );
  }

  if (key === LOCKED_FEATURE_KEY) {
    throw ApiError.precondition(`${LOCKED_FEATURE_KEY} is locked`);
  }

  if (change.state !== null && !isFeatureState(change.state)) {
    throw ApiError.invalid(
      `changes[${index}].state must be one of: ${FEATURE_STATES.join(', ')} or null`,
    );
  }

  let note: string | null | undefined;
  if (change.note === undefined) {
    note = undefined;
  } else if (change.note === null) {
    note = null;
  } else if (typeof change.note === 'string') {
    if (change.note.length > MAX_NOTE_LENGTH) {
      throw ApiError.invalid(
        `changes[${index}].note must be at most ${MAX_NOTE_LENGTH} characters`,
      );
    }
    note = change.note;
  } else {
    throw ApiError.invalid(`changes[${index}].note must be a string or null`);
  }

  let exemptRoles: ExemptRole[] | undefined;
  if (change.exemptRoles === undefined) {
    exemptRoles = undefined;
  } else if (!Array.isArray(change.exemptRoles)) {
    throw ApiError.invalid(`changes[${index}].exemptRoles must be an array`);
  } else {
    exemptRoles = change.exemptRoles.map((role, roleIndex) => {
      if (!isExemptRole(role)) {
        throw ApiError.invalid(
          `changes[${index}].exemptRoles[${roleIndex}] must be one of: ${EXEMPT_ROLES.join(', ')}`,
        );
      }

      return role;
    });
  }

  return {
    key,
    state: change.state as FeatureState | null,
    ...(note === undefined ? {} : { note }),
    ...(exemptRoles === undefined ? {} : { exemptRoles }),
  };
}

function parseChanges(body: unknown): ParsedChange[] {
  const record = asObject(body);
  const changes = record.changes;

  if (!Array.isArray(changes)) {
    throw ApiError.invalid('"changes" must be an array');
  }

  if (changes.length > MAX_CHANGES) {
    throw ApiError.invalid(
      `"changes" must contain at most ${MAX_CHANGES} entries`,
    );
  }

  return changes.map(parseChange);
}

const get = defineFunction((_event, context): FunctionResult =>
  ok(readFeatureConfig(context.documents)),
);

const update = defineFunction((event, context): FunctionResult => {
  const auth = requireRole(context, 'superadmin');
  const changes = parseChanges(event.body);

  const current = readFeatureConfig(context.documents);
  const flags: Record<string, FeatureOverride> = { ...current.flags };
  const changed = new Set<string>();

  for (const change of changes) {
    if (change.state === null) {
      delete flags[change.key];
    } else {
      const existing = current.flags[change.key];

      flags[change.key] = {
        state: change.state,
        // Omitted fields keep their previous value: the console may send only
        // the state, and a PATCH-like merge keeps that safe.
        note:
          change.note !== undefined ? change.note : (existing?.note ?? null),
        exemptRoles:
          change.exemptRoles !== undefined
            ? [...change.exemptRoles]
            : (existing?.exemptRoles ?? []),
        updatedAt: new Date().toISOString(),
        updatedBy: auth.user.email,
      };
    }

    changed.add(change.key);
  }

  // Document-level stamps move only when something was actually applied; an
  // empty change list is a read-shaped no-op.
  const next: FeatureConfig = {
    flags,
    updatedAt:
      changes.length === 0 ? current.updatedAt : new Date().toISOString(),
    updatedBy: changes.length === 0 ? current.updatedBy : auth.user.email,
  };

  context.documents.set(FEATURE_COLLECTION, FEATURE_DOCUMENT_ID, next);
  context.events.publish('feature.updated', { changed: [...changed] });

  return ok(next);
});

export const featureFunctions = {
  'features.get': get,
  'features.update': update,
};
