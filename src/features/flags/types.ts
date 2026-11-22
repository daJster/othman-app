import type { UserRole } from '@/core/types';
import type {
  BackendFeatureConfig,
  BackendFeatureOverride,
  BackendFeatureState,
} from '@/platform/backend';

/**
 * Remote feature control.
 *
 * A feature is addressed by a **dotted key** (`meetings`, `meetings.create`,
 * `quran.records`). The dots are not decoration: they are the inheritance
 * chain. `meetings.create` lives under `meetings`, and `meetings` lives under
 * `app`. Nothing declares a parent twice, because the parent *is* the prefix —
 * the same rule the mock server uses, so the two implementations cannot drift.
 *
 * The wire shape is owned by `src/platform/backend/types.ts` (that is the half
 * that has to match JSON); this module adds the semantics the UI needs.
 */
export const FEATURE_STATES = [
  'on',
  'read-only',
  'maintenance',
  'off',
] as const satisfies readonly BackendFeatureState[];

export type FeatureState = BackendFeatureState;

/**
 * How restrictive each rung is. The resolver keeps the maximum along the
 * ancestor chain, so the ordering is the only thing that has to be right.
 */
export const RESTRICTION_RANK: Record<FeatureState, number> = {
  on: 0,
  'read-only': 1,
  maintenance: 2,
  off: 3,
};

/** One server override, exactly as stored. */
export type FeatureOverride = BackendFeatureOverride;

/** The whole remote document, as `GET /v1/config/features` returns it. */
export type FeatureConfig = BackendFeatureConfig;

export const EMPTY_FEATURE_CONFIG: FeatureConfig = {
  flags: {},
  updatedAt: null,
  updatedBy: null,
};

/** What a superadmin may send. `state: null` removes the override. */
export type FeatureChange = {
  key: string;
  state: FeatureState | null;
  note?: string | null;
  exemptRoles?: readonly Exclude<UserRole, 'guest'>[];
};

export type FeatureWriteInput = {
  changes: readonly FeatureChange[];
};

/**
 * The questions a screen actually asks.
 *
 * Keeping them named here stops every call site from re-deriving "can I show
 * this" out of a state string and disagreeing about `maintenance`.
 */
export type FeatureView = {
  /** Render a link, tab or row at all. `off` is the only state that hides. */
  visible: boolean;
  /** The page must be replaced by a notice. */
  blocked: boolean;
  /** Existing content is readable. False for `maintenance` and `off`. */
  readable: boolean;
  /** Writes are allowed. Only `on` permits them. */
  writable: boolean;
};
