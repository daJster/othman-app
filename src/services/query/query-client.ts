import { QueryClient } from '@tanstack/react-query';

/**
 * Server-state client.
 *
 * The cache is **in memory only**. Nothing here is persisted: a stale profile
 * or a meeting list from last week is worse than a short skeleton, and a
 * persisted cache would have to be invalidated against the signed-in uid on
 * every launch. The few things worth keeping across launches (theme, language,
 * reader position) are deliberate user state and live in `storageService`.
 *
 * Defaults, and why:
 *
 *  - `staleTime: 5m` — meetings and profiles change on the scale of hours, not
 *    seconds. Refetching on every mount would show the same skeleton the user
 *    just waited through.
 *  - `gcTime: 30m` — enough to survive tab switches and a background/foreground
 *    cycle without re-downloading, short enough that memory does not grow with
 *    a long session.
 *  - `retry: 2` — one retry covers a flaky mobile handover; two is the point
 *    where a real outage should be shown instead of spinning.
 *  - Mutations never retry: a retried write is a duplicate write the user did
 *    not ask for. The screen owns the retry affordance.
 */
export const QUERY_DEFAULTS = {
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  retry: 2,
} as const;

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: QUERY_DEFAULTS,
      mutations: { retry: 0 },
    },
  });
}

/**
 * The app-wide client.
 *
 * A module singleton, not `useState(() => new QueryClient())`, because things
 * outside React need it: sign-out clears the cache (P3.3) and the reader can
 * prefetch from a store action. Safe at module scope — it touches no DOM.
 */
export const queryClient = createQueryClient();

/** Fresh client for tests, so one file's cache cannot leak into another's. */
export { createQueryClient };
