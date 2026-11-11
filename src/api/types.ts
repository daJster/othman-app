import type { QueryKey } from '@tanstack/react-query';
import type { FetchPolicyName } from './policies';

/**
 * What a command is, structurally.
 *
 * A *query* is a read the app may perform more than once; it owns a cache key
 * and a strategy. A *mutation* is a write; it owns the keys its success makes
 * stale. Both are plain data, which is what lets the registry be a single file
 * of declarations rather than a folder of near-identical hooks.
 *
 * The shapes are deliberately minimal. TanStack already has a rich option
 * surface; the extra options a screen needs (`enabled`, `select`, `onMutate`)
 * stay at the call site instead of being funnelled through here.
 */

export type ApiQuery<P, R> = {
  /** Stable, human-readable id — the name used in docs and devtools. */
  readonly id: string;
  /** Which caching strategy applies. */
  readonly policy: FetchPolicyName;
  /** The cache key for one set of parameters. Same params, same key. */
  readonly key: (params: P) => QueryKey;
  /** Where the data comes from. Never called without `key` having run. */
  readonly run: (params: P) => Promise<R>;
  /**
   * Whether the parameters describe a question that can be asked yet.
   * `false` leaves the query `pending` without a request, which is how "no ayah
   * selected" avoids downloading ayah 1 as a placeholder.
   */
  readonly ready?: (params: P) => boolean;
  /**
   * Only reachable against the local mock backend (`EXPO_PUBLIC_MOCK_BACKEND=1`).
   * The query is disabled — not failing — when the flag is off, so a build
   * without the demo server never renders an error for asking.
   */
  readonly demo?: boolean;
};

export type ApiMutation<P, R> = {
  readonly id: string;
  readonly run: (params: P) => Promise<R>;
  /**
   * Cache keys this write makes stale, as a function of its variables so a
   * per-row write can invalidate that row's key instead of the whole domain.
   * This is the *only* place invalidation is declared.
   */
  readonly invalidates?: (params: P) => readonly QueryKey[];
  readonly demo?: boolean;
};

/**
 * Endpoints without parameters.
 *
 * `void` is load-bearing: `useApiQuery` turns it into an options-only call
 * signature, so `useApiQuery(api.quran.catalog)` needs no `{}` filler argument
 * and still cannot be called with a stray parameter.
 */
export type NoParams = void;
