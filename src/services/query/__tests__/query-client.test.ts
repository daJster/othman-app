import { QUERY_DEFAULTS, createQueryClient } from '@/services/query';

/**
 * The client's defaults are a decision, not configuration: they are asserted
 * here so a later "let's make it snappier" change has to argue with the numbers
 * in `query-client.ts`.
 */
describe('query client', () => {
  it('uses the documented cache defaults', () => {
    expect(QUERY_DEFAULTS).toEqual({
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      retry: 2,
    });
  });

  it('applies the defaults to queries', () => {
    const client = createQueryClient();
    const options = client.getDefaultOptions().queries;

    expect(options?.staleTime).toBe(QUERY_DEFAULTS.staleTime);
    expect(options?.gcTime).toBe(QUERY_DEFAULTS.gcTime);
    expect(options?.retry).toBe(QUERY_DEFAULTS.retry);
  });

  it('never retries mutations', () => {
    // A retried write is a duplicate write. Screens own the retry affordance.
    expect(createQueryClient().getDefaultOptions().mutations?.retry).toBe(0);
  });

  it('creates independent caches', async () => {
    const first = createQueryClient();
    const second = createQueryClient();

    first.setQueryData(['probe'], 'cached');

    expect(first.getQueryData(['probe'])).toBe('cached');
    expect(second.getQueryData(['probe'])).toBeUndefined();

    // Creating a query schedules its garbage-collection timer; leaving it armed
    // keeps Jest's process alive for the rest of `gcTime`.
    first.clear();
    second.clear();
  });
});
