/**
 * Fetching strategies.
 *
 * Every request the app makes names one of these policies instead of carrying
 * its own `staleTime` / `retry` numbers. Two benefits, both concrete:
 *
 *  - A number can be reviewed once. Before this, `60_000` appeared in three
 *    hooks with three different justifications, and the global default (5 min)
 *    silently applied to anything the author forgot.
 *  - The policy name is the *reason*, so a reader can tell "this is scripture"
 *    from "this is a user row" without decoding millisecond arithmetic.
 *
 * A policy is only the default. An endpoint may still pass `options` at its
 * call site (a screen that needs `enabled: false` while a sheet is closed does
 * exactly that), and the call-site value wins.
 */

/** The names an endpoint may use. See `FETCH_POLICIES` for the values. */
export type FetchPolicyName =
  'static' | 'default' | 'live' | 'session' | 'probe';

export type FetchPolicy = {
  /** How long cached bytes are served without asking the server again. */
  readonly staleTime: number;
  /** How long an unused entry survives before garbage collection. */
  readonly gcTime?: number;
  readonly retry?: number | boolean;
  readonly refetchOnWindowFocus?: boolean;
  /** `false` disables periodic refetching; a number is the interval in ms. */
  readonly refetchInterval?: number | false;
};

export const FETCH_POLICIES: Record<FetchPolicyName, FetchPolicy> = {
  /**
   * Immutable content: the mushaf, its bbox tables, tafsir books, the edition
   * catalog. It changes when the app ships new data, not while the user reads.
   * Re-requesting it would delay the first page for no gain.
   */
  static: { staleTime: Infinity, gcTime: Infinity },

  /**
   * The app's baseline: records that change on the scale of hours (the signed-in
   * profile). Matches `QUERY_DEFAULTS`, so an endpoint that names no policy and
   * one that names `default` behave identically.
   */
  default: { staleTime: 5 * 60_000 },

  /**
   * Time is part of the answer: today's meetings, the circle's next halqa.
   * One minute is short enough that "starts in 10 minutes" is not a lie by the
   * time the user looks again, and long enough that tab switching is free.
   */
  live: { staleTime: 60_000 },

  /**
   * Rows owned by the signed-in user (progress, bookmarks, notes). Shorter than
   * `default` because another device may have written them; the event stream
   * invalidates the precise keys, this is the belt to that braces.
   */
  session: { staleTime: 30_000 },

  /**
   * A liveness probe about the transport itself. It is polled, so the poll *is*
   * the retry: retrying a healthy poll would stack timers, and a probe that
   * cannot reach the server should say "offline" instead of spinning.
   */
  probe: {
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 15_000,
  },
};
