import {
  FetchHttpClient,
  HttpAbortError,
  HttpError,
  HttpTimeoutError,
} from '@/platform/http/client';

type FetchInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
};

function response(
  body: unknown,
  init: { status?: number; json?: boolean } = {},
) {
  const status = init.status ?? 200;
  const isJson = init.json ?? true;

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type'
          ? isJson
            ? 'application/json'
            : 'text/plain'
          : null,
    },
    json: async () => body,
    text: async () => String(body),
  };
}

/** A fetch that only settles when its signal aborts — i.e. it hangs otherwise. */
function abortableFetch() {
  return jest.fn(
    (_url: string, init: FetchInit) =>
      new Promise((_resolve, reject) => {
        const fail = () => {
          const error = new Error('The operation was aborted.');
          error.name = 'AbortError';
          reject(error);
        };

        if (init.signal?.aborted) {
          fail();
          return;
        }

        init.signal?.addEventListener('abort', fail);
      }),
  );
}

const originalFetch = globalThis.fetch;

function useFetch(mock: jest.Mock) {
  globalThis.fetch = mock as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.useRealTimers();
});

describe('FetchHttpClient', () => {
  const client = new FetchHttpClient();

  it('parses a JSON response and forwards method and headers', async () => {
    const fetchMock = jest.fn().mockResolvedValue(response({ id: 7 }));
    useFetch(fetchMock);

    await expect(
      client.get('https://example.com/items', { headers: { 'x-test': '1' } }),
    ).resolves.toEqual({ id: 7 });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/items',
      expect.objectContaining({ method: 'GET', headers: { 'x-test': '1' } }),
    );
  });

  it('returns plain text when the response is not JSON', async () => {
    useFetch(jest.fn().mockResolvedValue(response('hello', { json: false })));

    await expect(client.get('https://example.com/text')).resolves.toBe('hello');
  });

  it('sends a POST body with the post helper', async () => {
    const fetchMock = jest.fn().mockResolvedValue(response({ ok: true }));
    useFetch(fetchMock);

    await client.post('https://example.com/items', { name: 'x' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/items',
      expect.objectContaining({ method: 'POST', body: { name: 'x' } }),
    );
  });

  it('throws HttpError with the status for a non-2xx response', async () => {
    useFetch(jest.fn().mockResolvedValue(response(null, { status: 503 })));

    await expect(client.get('https://example.com/down')).rejects.toMatchObject({
      name: 'HttpError',
      status: 503,
      url: 'https://example.com/down',
    });
    await expect(client.get('https://example.com/down')).rejects.toBeInstanceOf(
      HttpError,
    );
  });

  it('turns its own timeout into HttpTimeoutError', async () => {
    useFetch(abortableFetch());

    await expect(
      client.get('https://example.com/slow', { timeoutMs: 5 }),
    ).rejects.toMatchObject({
      name: 'TimeoutError',
      url: 'https://example.com/slow',
      timeoutMs: 5,
    });
    await expect(
      client.get('https://example.com/slow', { timeoutMs: 5 }),
    ).rejects.toBeInstanceOf(HttpTimeoutError);
  });

  it('turns a caller abort into HttpAbortError, not a timeout', async () => {
    useFetch(abortableFetch());
    const controller = new AbortController();

    const pending = client.get('https://example.com/cancelled', {
      signal: controller.signal,
      timeoutMs: 0,
    });
    controller.abort();

    await expect(pending).rejects.toBeInstanceOf(HttpAbortError);
    await expect(pending).rejects.toMatchObject({
      url: 'https://example.com/cancelled',
    });
  });

  it('honours a signal that is already aborted', async () => {
    useFetch(abortableFetch());
    const controller = new AbortController();
    controller.abort();

    await expect(
      client.get('https://example.com/cancelled', {
        signal: controller.signal,
        timeoutMs: 0,
      }),
    ).rejects.toBeInstanceOf(HttpAbortError);
  });

  it('does not time out when timeoutMs is 0', async () => {
    const fetchMock = jest.fn(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(response({ ok: true })), 20);
        }),
    );
    useFetch(fetchMock);

    await expect(
      client.get('https://example.com/slow', { timeoutMs: 0 }),
    ).resolves.toEqual({ ok: true });
  });

  it('clears the timeout timer and the caller listener when it settles', async () => {
    jest.useFakeTimers();
    useFetch(jest.fn().mockResolvedValue(response({ ok: true })));
    const controller = new AbortController();
    const removeSpy = jest.spyOn(controller.signal, 'removeEventListener');

    await client.get('https://example.com/ok', {
      signal: controller.signal,
      timeoutMs: 10_000,
    });

    expect(jest.getTimerCount()).toBe(0);
    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));
  });
});
