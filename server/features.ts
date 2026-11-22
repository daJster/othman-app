import type { UserRole } from './contracts.ts';
import { ApiError } from './lib/errors.ts';
import type { DocumentStore } from './stores/documents.ts';
import type { FunctionContext, HttpMethod } from './functions/types.ts';

/**
 * Remote feature control — the server half of `src/features/flags`.
 *
 * The app cannot import the client registry from here (plain Node has no Metro
 * alias), so this file derives everything from the key itself. A feature is a
 * dotted key and the dots *are* the inheritance chain: `a.b.c` answers to
 * `app`, `a`, `a.b` and `a.b.c`. Nothing stores a parent, so the two
 * implementations cannot disagree about the tree.
 *
 * The effective state is the most restrictive rung on the chain. An override
 * may exempt roles from *its own* restriction only; an ancestor's restriction
 * still applies. `admin.features` is pinned `on` — the switchboard must not be
 * able to lock itself out.
 */

export const FEATURE_COLLECTION = 'config';
export const FEATURE_DOCUMENT_ID = 'features';
export const LOCKED_FEATURE_KEY = 'admin.features';

export const FEATURE_STATES = [
  'on',
  'read-only',
  'maintenance',
  'off',
] as const;

export type FeatureState = (typeof FEATURE_STATES)[number];

/** Most permissive first; the resolver keeps the maximum along the chain. */
export const RESTRICTION_RANK: Record<FeatureState, number> = {
  on: 0,
  'read-only': 1,
  maintenance: 2,
  off: 3,
};

/** `guest` is the absence of a session, never a stored role, so it cannot be exempt. */
export type ExemptRole = Exclude<UserRole, 'guest'>;

export const EXEMPT_ROLES: readonly ExemptRole[] = [
  'user',
  'admin',
  'superadmin',
];

export type FeatureOverride = {
  state: FeatureState;
  note: string | null;
  exemptRoles: ExemptRole[];
  updatedAt: string | null;
  updatedBy: string | null;
};

export type FeatureConfig = {
  flags: Record<string, FeatureOverride>;
  updatedAt: string | null;
  updatedBy: string | null;
};

export const EMPTY_FEATURE_CONFIG: FeatureConfig = {
  flags: {},
  updatedAt: null,
  updatedBy: null,
};

/**
 * The chain for `a.b.c` is `['app', 'a', 'a.b', 'a.b.c']`.
 *
 * `app` is always present because every gate can be shut down app-wide. A key
 * that starts with `app` would repeat it; duplicates are harmless because the
 * resolver only takes a maximum.
 */
export function featureChain(key: string): string[] {
  const chain = ['app'];
  if (key === 'app') return chain;

  const segments = key.split('.');

  for (let index = 0; index < segments.length; index += 1) {
    chain.push(segments.slice(0, index + 1).join('.'));
  }

  return chain;
}

export function isFeatureState(value: unknown): value is FeatureState {
  return (
    typeof value === 'string' &&
    (FEATURE_STATES as readonly string[]).includes(value)
  );
}

export function isExemptRole(value: unknown): value is ExemptRole {
  return (
    typeof value === 'string' &&
    (EXEMPT_ROLES as readonly string[]).includes(value)
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/**
 * One stored flag, or `null` when it should be treated as absent.
 *
 * A hand-edited document is a fact of life for a file-per-record store. An
 * unknown `state` degrades to "no override" instead of failing the request, and
 * extra fields are dropped rather than echoed back.
 */
function normalizeOverride(value: unknown): FeatureOverride | null {
  const record = asRecord(value);
  if (!record || !isFeatureState(record.state)) return null;

  const exemptRoles = Array.isArray(record.exemptRoles)
    ? record.exemptRoles.filter(isExemptRole)
    : [];

  return {
    state: record.state,
    note: nullableString(record.note),
    exemptRoles,
    updatedAt: nullableString(record.updatedAt),
    updatedBy: nullableString(record.updatedBy),
  };
}

/** Missing or unreadable document means "no overrides", never an error. */
export function readFeatureConfig(documents: DocumentStore): FeatureConfig {
  const raw = documents.get<unknown>(FEATURE_COLLECTION, FEATURE_DOCUMENT_ID);
  const record = asRecord(raw);

  if (!record) return { ...EMPTY_FEATURE_CONFIG, flags: {} };

  const flags: Record<string, FeatureOverride> = {};
  const rawFlags = asRecord(record.flags);

  if (rawFlags) {
    for (const [key, value] of Object.entries(rawFlags)) {
      const override = normalizeOverride(value);
      if (override) flags[key] = override;
    }
  }

  return {
    flags,
    updatedAt: nullableString(record.updatedAt),
    updatedBy: nullableString(record.updatedBy),
  };
}

function isExempt(override: FeatureOverride, role: UserRole | null): boolean {
  if (!role || role === 'guest') return false;

  return override.exemptRoles.includes(role);
}

/**
 * The effective state of one key for one viewer.
 *
 * `role` is `null` when signed out. An exemption is a statement about a stored
 * role, so a guest never has one.
 */
export function resolveFeatureState(
  config: FeatureConfig,
  key: string,
  role: UserRole | null,
): FeatureState {
  if (key === LOCKED_FEATURE_KEY) return 'on';

  let state: FeatureState = 'on';

  for (const node of featureChain(key)) {
    const override = config.flags[node];

    if (!override) continue;
    if (isExempt(override, role)) continue;

    if (RESTRICTION_RANK[override.state] > RESTRICTION_RANK[state]) {
      state = override.state;
    }
  }

  return state;
}

/**
 * The write lock's mapping: which function is a write inside which feature.
 *
 * Only names that can *mutate* something matter here; the transport skips GET
 * before consulting this table. `meetings.` and `quran.` are prefixes because
 * every write in those areas shares them; accounts are listed individually
 * because the same prefix also contains self-service routes that belong to a
 * different gate.
 */
const FEATURE_BY_FUNCTION: Readonly<Record<string, string>> = {
  'accounts.list': 'admin.members',
  'accounts.create': 'admin.members',
  'accounts.get': 'admin.members',
  'accounts.update': 'admin.members',
  'accounts.remove': 'admin.members',
  'accounts.me': 'account',
  'accounts.meUpdate': 'account',
  'accounts.deleteMe': 'account',
  'auth.updateProfile': 'account',
  'auth.updatePreferences': 'account',
};

const FEATURE_BY_PREFIX: readonly (readonly [string, string])[] = [
  ['meetings.', 'meetings'],
  ['quran.', 'quran'],
];

export function featureKeyForFunction(functionName: string): string | null {
  const exact = FEATURE_BY_FUNCTION[functionName];
  if (exact) return exact;

  const prefixed = FEATURE_BY_PREFIX.find(([prefix]) =>
    functionName.startsWith(prefix),
  );

  return prefixed ? prefixed[1] : null;
}

/**
 * Defence in depth for a stale client or a caller bypassing the UI.
 *
 * The transport calls this after the handler and context are resolved and
 * before dispatch, so a 503 comes back with the same error body as any handler
 * error. A signed-in superadmin is always allowed: the person fixing the outage
 * must not be locked out by it.
 */
export function assertFeatureWritable(
  method: HttpMethod,
  functionName: string,
  context: FunctionContext,
): void {
  if (method === 'GET') return;

  const key = featureKeyForFunction(functionName);
  if (!key) return;

  const auth = context.auth;
  if (auth?.user.role === 'superadmin') return;

  const config = readFeatureConfig(context.documents);
  const state = resolveFeatureState(config, key, auth?.user.role ?? null);

  if (state === 'on') return;

  const message =
    state === 'maintenance' ? `${key} is in maintenance` : `${key} is ${state}`;

  throw ApiError.unavailable(message);
}
