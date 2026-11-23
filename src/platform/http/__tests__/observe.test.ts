import { FetchHttpClient } from '@/platform/http/client';
import { createHttpRequestLog, type HttpEvent } from '@/platform/http/observe';
import { redactUrl } from '@/platform/http/redact';

/**
 * Observability has one job: say what was asked and what came back, without
 * ever writing a credential into the log. These tests pin the redaction rule,
 * the bounded log, and the outcome each settled request reports.
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

function hangingFetch() {
  return jest.fn(
    (_url: string, init: { signal?: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          const error = new Error('The operation was aborted.');
          error.name = 'AbortError';
          reject(error);
        });
      }),
  );
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('redactUrl', () => {
  it('replaces the value of a credential parameter', () => {
    expect(redactUrl('https://x.test/stream?token=abc123&since=4')).toBe(
      'https://x.test/stream?token=REDACTED&since=4',
    );
  });

  it('covers the common credential names wherever they sit in the query', () => {
    expect(redactUrl('https://x.test/a?page=2&access_token=t&x=1')).toBe(
      'https://x.test/a?page=2&access_token=REDACTED&x=1',
    );
    expect(redactUrl('https://x.test/a?password=p&api_key=k')).toBe(
      'https://x.test/a?password=REDACTED&api_key=REDACTED',
    );
  });

  it('leaves an ordinary URL unchanged', () => {
    const url = 'https://api.alquran.cloud/v1/ayah/1/quran-uthmani';

    expect(redactUrl(url)).toBe(url);
  });
});

describe('createHttpRequestLog', () => {
  const event = (id: number): HttpEvent => ({
    id,
    method: 'GET',
    url: `https://x.test/${id}`,
    status: 200,
    outcome: 'ok',
    durationMs: 1,
    startedAt: 0,
  });

  it('keeps only the newest events once the capacity is reached', () => {
    const log = createHttpRequestLog(2);

    log.record(event(1));
    log.record(event(2));
    log.record(event(3));

    expect(log.recent().map((item) => item.id)).toEqual([2, 3]);
  });

  it('notifies live subscribers until they unsubscribe', () => {
    const log = createHttpRequestLog();
    const listener = jest.fn();
    const unsubscribe = log.subscribe(listener);

    log.record(event(1));
    unsubscribe();
    log.record(event(2));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('returns a snapshot, so later events do not change a list already read', () => {
    const log = createHttpRequestLog();

    log.record(event(1));
    const snapshot = log.recent();
    log.record(event(2));

    expect(snapshot).toHaveLength(1);
    expect(log.recent()).toHaveLength(2);
  });
});

describe('FetchHttpClient observers', () => {
  function observed() {
    const events: HttpEvent[] = [];
    const client = new FetchHttpClient({
      observers: [(event) => events.push(event)],
    });

    return { client, events };
  }

  it('reports one ok event with the status and a redacted URL', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(response({ ok: true })) as unknown as typeof fetch;
    const { client, events } = observed();

    await client.get('https://x.test/data?token=secret&page=2');

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      method: 'GET',
      url: 'https://x.test/data?token=REDACTED&page=2',
      status: 200,
      outcome: 'ok',
    });
    expect(JSON.stringify(events[0])).not.toContain('secret');
  });

  it('reports http-error for a non-2xx response', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(response(null, 503)) as unknown as typeof fetch;
    const { client, events } = observed();

    await expect(client.get('https://x.test/down')).rejects.toThrow();

    expect(events[0]).toMatchObject({ outcome: 'http-error', status: 503 });
  });

  it('reports timeout when its own deadline fires', async () => {
    globalThis.fetch = hangingFetch() as unknown as typeof fetch;
    const { client, events } = observed();

    await expect(
      client.get('https://x.test/slow', { timeoutMs: 5 }),
    ).rejects.toThrow();

    expect(events[0]).toMatchObject({ outcome: 'timeout', status: null });
  });

  it('reports aborted when the caller cancels, not a timeout', async () => {
    globalThis.fetch = hangingFetch() as unknown as typeof fetch;
    const { client, events } = observed();
    const controller = new AbortController();
    const pending = client.get('https://x.test/cancel', {
      signal: controller.signal,
      timeoutMs: 0,
    });

    controller.abort();
    await expect(pending).rejects.toThrow();

    expect(events[0]).toMatchObject({ outcome: 'aborted' });
  });

  it('reports network-error when the request never reached the server', async () => {
    globalThis.fetch = jest
      .fn()
      .mockRejectedValue(
        new TypeError('Network request failed'),
      ) as unknown as typeof fetch;
    const { client, events } = observed();

    await expect(client.get('https://x.test/offline')).rejects.toThrow(
      'Network request failed',
    );

    expect(events[0]).toMatchObject({ outcome: 'network-error', status: null });
  });

  it('reports exactly once per request, even when an observer throws', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(response({})) as unknown as typeof fetch;
    const seen = jest.fn();
    const client = new FetchHttpClient({
      observers: [
        () => {
          throw new Error('observer failure');
        },
        seen,
      ],
    });

    await expect(client.get('https://x.test/ok')).resolves.toEqual({});

    expect(seen).toHaveBeenCalledTimes(1);
  });
});
