import { connectivityMonitor, type ConnectivityGate } from './connectivity';
import { httpRequestLog, type HttpObserver, type HttpOutcome } from './observe';
import { REQUEST_TIMEOUT_MS } from './policy';
import { redactUrl } from './redact';

/**
 * The single transport for every non-SDK request the app makes.
 *
 * Backend calls reach it through `BackendClient`, third-party reads (Qur'an CDN,
 * ayah text, tafsir) through their repositories. Nothing else calls `fetch`: the
 * lint rule in `eslint.config.js` enforces that.
 *
 * What this class owns, and nothing else does:
 *  - one timeout policy (`REQUEST_TIMEOUT_MS`, overridable per call),
 *  - cancellation through `AbortSignal` (caller abort is distinct from timeout),
 *  - error classification (`HttpError`, `HttpTimeoutError`, `HttpAbortError`),
 *  - one observer event per settled request, with a redacted URL.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

export type HttpHeaders = Record<string, string>;

export interface HttpRequestInit {
  method?: HttpMethod;
  headers?: HttpHeaders;
  body?: unknown;
  /** Caller-owned cancellation (e.g. component unmount, a newer request). */
  signal?: AbortSignal;
  /** Abort with `HttpTimeoutError` after this many ms. `0` disables it. */
  timeoutMs?: number;
}

/**
 * What a read may pass through to the transport: cancellation only. Query
 * functions receive one of these from TanStack Query and forward it, so an
 * unmounted screen cancels its request.
 */
export type RequestOptions = { signal?: AbortSignal };

/** The server answered, but not with a success status. */
export class HttpError extends Error {
  readonly status: number;
  readonly url: string;
  /** Parsed JSON error body when the server sent one, else `undefined`. */
  readonly body?: unknown;

  constructor(status: number, url: string, message?: string, body?: unknown) {
    super(message ?? `Request failed with status ${status}`);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

/** The request exceeded its timeout. Different from a caller cancel. */
export class HttpTimeoutError extends Error {
  readonly url: string;
  readonly timeoutMs: number;

  constructor(url: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
    this.url = url;
    this.timeoutMs = timeoutMs;
  }
}

/** The caller aborted the request. Never surfaced to the user. */
export class HttpAbortError extends Error {
  readonly url: string;

  constructor(url: string) {
    super(`Request to ${url} was aborted`);
    this.name = 'AbortError';
    this.url = url;
  }
}

/**
 * The request never left the device: the connectivity monitor says the app is
 * offline. Fails immediately, so nothing waits out a timeout to learn what the
 * monitor already knew.
 */
export class HttpOfflineError extends Error {
  readonly url: string;

  constructor(url: string) {
    super(`Request to ${url} was skipped: the app is offline`);
    this.name = 'OfflineError';
    this.url = url;
  }
}

export interface HttpClient {
  request<T = unknown>(url: string, init?: HttpRequestInit): Promise<T>;
  get<T = unknown>(
    url: string,
    init?: Omit<HttpRequestInit, 'method'>,
  ): Promise<T>;
  post<T = unknown>(
    url: string,
    body?: unknown,
    init?: Omit<HttpRequestInit, 'method' | 'body'>,
  ): Promise<T>;
}

export type FetchHttpClientOptions = {
  /** Timeout for any request that does not set its own. */
  timeoutMs?: number;
  /**
   * Notified once per request, after it settles. An observer that throws is
   * ignored: recording a request must never fail it.
   */
  observers?: readonly HttpObserver[];
  /**
   * Consulted before every request. When it reports offline the request is
   * skipped (`HttpOfflineError`) instead of being attempted. Omitted means no
   * gate, which is what a test and a one-off script want.
   */
  connectivity?: ConnectivityGate;
};

let nextEventId = 0;

export class FetchHttpClient implements HttpClient {
  private readonly timeoutMs: number;
  private readonly observers: readonly HttpObserver[];
  private readonly connectivity?: ConnectivityGate;

  constructor({
    timeoutMs = REQUEST_TIMEOUT_MS,
    observers = [],
    connectivity,
  }: FetchHttpClientOptions = {}) {
    this.timeoutMs = timeoutMs;
    this.observers = observers;
    this.connectivity = connectivity;
  }

  async request<T = unknown>(url: string, init?: HttpRequestInit): Promise<T> {
    const method = init?.method ?? 'GET';
    const timeoutMs = init?.timeoutMs ?? this.timeoutMs;
    const callerSignal = init?.signal;
    const startedAt = Date.now();
    const controller = new AbortController();

    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let reported = false;

    const report = (outcome: HttpOutcome, status: number | null) => {
      if (reported) return;
      reported = true;

      const event = {
        id: (nextEventId += 1),
        method,
        url: redactUrl(url),
        status,
        outcome,
        durationMs: Date.now() - startedAt,
        startedAt,
      };

      for (const observer of this.observers) {
        try {
          observer(event);
        } catch {
          // Observability is best-effort by contract.
        }
      }
    };

    // The gate runs before any timer is armed: an offline request fails now,
    // not after a timeout, and never reaches `fetch`.
    if (this.connectivity && !this.connectivity.isOnline()) {
      report('offline', null);
      throw new HttpOfflineError(url);
    }

    // `AbortSignal.any` is not reliably available on Hermes, so the two abort
    // sources are combined by hand and torn down in `finally`.
    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
    }

    const onCallerAbort = () => controller.abort();

    if (callerSignal) {
      if (callerSignal.aborted) {
        controller.abort();
      } else {
        callerSignal.addEventListener('abort', onCallerAbort);
      }
    }

    try {
      const res = await fetch(url, {
        method,
        headers: init?.headers ?? {},
        body: init?.body as BodyInit | undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        // Read the error body before throwing: the backend puts its error code
        // in `{ error: { code, message } }`, and a status alone cannot tell
        // "wrong password" from "account disabled".
        const body = isJson(res)
          ? await res.json().catch(() => undefined)
          : undefined;

        throw new HttpError(res.status, url, undefined, body);
      }

      const value = isJson(res)
        ? ((await res.json()) as T)
        : ((await res.text()) as unknown as T);

      report('ok', res.status);

      return value;
    } catch (error) {
      if (error instanceof HttpError) {
        report('http-error', error.status);
        throw error;
      }

      // Fetch rejects with an `AbortError` for both abort sources; only our own
      // flag can tell a timeout from a caller cancel.
      if (error instanceof Error && error.name === 'AbortError') {
        if (timedOut) {
          report('timeout', null);
          throw new HttpTimeoutError(url, timeoutMs);
        }

        report('aborted', null);
        throw new HttpAbortError(url);
      }

      report('network-error', null);

      throw error instanceof Error ? error : new Error(String(error));
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      callerSignal?.removeEventListener('abort', onCallerAbort);
    }
  }

  get<T = unknown>(
    url: string,
    init?: Omit<HttpRequestInit, 'method'>,
  ): Promise<T> {
    return this.request<T>(url, { ...init, method: 'GET' });
  }

  post<T = unknown>(
    url: string,
    body?: unknown,
    init?: Omit<HttpRequestInit, 'method' | 'body'>,
  ): Promise<T> {
    return this.request<T>(url, { ...init, method: 'POST', body });
  }
}

function isJson(res: Response): boolean {
  return res.headers.get('content-type')?.includes('application/json') ?? false;
}

export const defaultHttpClient = new FetchHttpClient({
  observers: [httpRequestLog.record],
  connectivity: connectivityMonitor,
});
