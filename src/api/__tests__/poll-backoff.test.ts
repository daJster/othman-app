import {
  MAX_POLL_BACKOFF_MS,
  POLL_INTERVAL_MS,
  nextPollDelay,
} from '../events';

/**
 * The live-update poll is the only request the app repeats on its own. While
 * the server is unreachable, its cadence must back off, so an offline phone
 * neither hammers the network nor spends battery on a loop that cannot succeed.
 */
describe('nextPollDelay', () => {
  it('polls at the healthy cadence while nothing has failed', () => {
    expect(nextPollDelay(0)).toBe(POLL_INTERVAL_MS);
  });

  it('doubles the wait with each consecutive failure', () => {
    expect(nextPollDelay(1)).toBe(POLL_INTERVAL_MS * 2);
    expect(nextPollDelay(2)).toBe(POLL_INTERVAL_MS * 4);
    expect(nextPollDelay(3)).toBe(POLL_INTERVAL_MS * 8);
  });

  it('never waits longer than the cap', () => {
    expect(nextPollDelay(4)).toBe(MAX_POLL_BACKOFF_MS);
    expect(nextPollDelay(50)).toBe(MAX_POLL_BACKOFF_MS);
  });

  it('stays finite through a very long outage', () => {
    expect(Number.isFinite(nextPollDelay(10_000))).toBe(true);
    expect(nextPollDelay(10_000)).toBe(MAX_POLL_BACKOFF_MS);
  });

  it('treats a negative failure count as healthy', () => {
    expect(nextPollDelay(-1)).toBe(POLL_INTERVAL_MS);
  });
});
