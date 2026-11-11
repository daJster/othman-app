import { FETCH_POLICIES } from '../policies';

/**
 * The policies are product decisions, so they are asserted, not inferred.
 * A silent edit from one minute to zero changes how often every screen in the
 * app talks to the network.
 */
describe('FETCH_POLICIES', () => {
  it('never re-fetches immutable content within a launch', () => {
    expect(FETCH_POLICIES.static.staleTime).toBe(Infinity);
    // The bbox tables are megabytes; dropping them would make a page turn a
    // download. Garbage-collecting them at the default window is too eager.
    expect(FETCH_POLICIES.static.gcTime).toBe(Infinity);
  });

  it('keeps temporal screens fresh for one minute', () => {
    expect(FETCH_POLICIES.live.staleTime).toBe(60_000);
  });

  it('refreshes per-user rows sooner than the baseline', () => {
    expect(FETCH_POLICIES.default.staleTime).toBe(5 * 60_000);
    expect(FETCH_POLICIES.session.staleTime).toBe(30_000);
    expect(FETCH_POLICIES.session.staleTime).toBeLessThan(
      FETCH_POLICIES.default.staleTime,
    );
  });

  it('polls the health probe instead of retrying it', () => {
    expect(FETCH_POLICIES.probe.refetchInterval).toBe(15_000);
    expect(FETCH_POLICIES.probe.retry).toBe(false);
    expect(FETCH_POLICIES.probe.staleTime).toBe(0);
  });

  it('leaves retry to the query client everywhere else', () => {
    // Retry is an environment policy (tests run with `retry: false`, production
    // with two attempts). An endpoint that pinned it would override both.
    expect(FETCH_POLICIES.default.retry).toBeUndefined();
    expect(FETCH_POLICIES.live.retry).toBeUndefined();
    expect(FETCH_POLICIES.session.retry).toBeUndefined();
  });
});
