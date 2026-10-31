export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

export type HttpHeaders = Record<string, string>;

export interface HttpRequestInit {
  method?: HttpMethod;
  headers?: HttpHeaders;
  body?: unknown;
  /** Caller-owned cancellation (e.g. component unmount, newer request). */
  signal?: AbortSignal;
  /** Abort with `HttpTimeoutError` after this many ms. `0` disables it. */
  timeoutMs?: number;
}

/** The server answered, but not with a success status. */
export class HttpError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(status: number, url: string, message?: string) {
    super(message ?? `Request failed with status ${status}`);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
  }
}

/** The request exceeded `timeoutMs`. Different from a caller cancel. */
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

export class FetchHttpClient implements HttpClient {
  async request<T = unknown>(url: string, init?: HttpRequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutMs = init?.timeoutMs ?? 10_000;
    const callerSignal = init?.signal;

    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

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
        method: init?.method ?? 'GET',
        headers: init?.headers ?? {},
        body: init?.body as BodyInit | undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new HttpError(res.status, url);
      }

      const contentType = res.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return (await res.json()) as T;
      }

      return (await res.text()) as unknown as T;
    } catch (error) {
      if (
        error instanceof HttpError ||
        error instanceof HttpTimeoutError ||
        error instanceof HttpAbortError
      ) {
        throw error;
      }

      // Fetch rejects with a DOMException/Error named `AbortError` for both
      // abort sources; only our own flag can tell them apart.
      if (error instanceof Error && error.name === 'AbortError') {
        throw timedOut
          ? new HttpTimeoutError(url, timeoutMs)
          : new HttpAbortError(url);
      }

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

export const defaultHttpClient = new FetchHttpClient();
