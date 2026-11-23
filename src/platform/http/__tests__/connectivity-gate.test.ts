import { FetchHttpClient, HttpOfflineError } from '@/platform/http/client';
import type { HttpEvent } from '@/platform/http/observe';

/**
 * The connectivity gate is the transport's cheapest decision: when the app
 * knows it is offline, no timer is armed and `fetch` is never called, so an
 * offline screen fails in microseconds instead of waiting out a timeout.
 */

function response(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? 'application/json' : null,
    },
    json: async () => body,
    text: async () => String(body),
  };
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('FetchHttpClient connectivity gate', () => {
  it('skips the request when offline and records the outcome', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const events: HttpEvent[] = [];
    const client = new FetchHttpClient({
      connectivity: { isOnline: () => false },
      observers: [(event) => events.push(event)],
    });

    await expect(
      client.get('https://x.test/meetings?token=secret'),
    ).rejects.toBeInstanceOf(HttpOfflineError);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      outcome: 'offline',
      status: null,
      url: 'https://x.test/meetings?token=REDACTED',
    });
  });

  it('sends the request when the gate reports online', async () => {
    const fetchMock = jest.fn().mockResolvedValue(response({ id: 7 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const client = new FetchHttpClient({
      connectivity: { isOnline: () => true },
    });

    await expect(client.get('https://x.test/items')).resolves.toEqual({
      id: 7,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not gate a client that has no connectivity source', async () => {
    const fetchMock = jest.fn().mockResolvedValue(response({ ok: true }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const client = new FetchHttpClient();

    await expect(client.get('https://x.test/items')).resolves.toEqual({
      ok: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
