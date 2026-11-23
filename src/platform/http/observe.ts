/**
 * Request observability.
 *
 * Every request the transport settles produces one `HttpEvent`. Observers see
 * the outcome (ok, HTTP error, timeout, caller abort, network failure), the
 * status, the duration and a redacted URL, which is enough to answer "what did
 * the app just ask for, and what came back" without a proxy in between.
 *
 * The log is a bounded ring: a long session cannot grow memory, and the newest
 * events are what diagnostics needs. Nothing here touches the network or the
 * console, so recording a request can never fail it.
 */

export type HttpOutcome =
  | 'ok'
  | 'http-error'
  | 'timeout'
  | 'aborted'
  | 'network-error'
  /** Skipped by the connectivity gate: the app knows it is offline. */
  | 'offline';

export type HttpEvent = {
  /** Increases per process; orders events that settle out of sequence. */
  readonly id: number;
  readonly method: string;
  /** Always redacted (see `redactUrl`). */
  readonly url: string;
  readonly status: number | null;
  readonly outcome: HttpOutcome;
  readonly durationMs: number;
  /** Epoch milliseconds when the request was issued. */
  readonly startedAt: number;
};

export type HttpObserver = (event: HttpEvent) => void;

export type HttpRequestLog = {
  /** Pass to `FetchHttpClient({ observers: [...] })`. */
  readonly record: HttpObserver;
  /** Oldest first, at most `capacity` events. */
  recent(): readonly HttpEvent[];
  /** Live feed for diagnostics screens. Returns the unsubscribe function. */
  subscribe(listener: HttpObserver): () => void;
  clear(): void;
};

export function createHttpRequestLog(capacity = 100): HttpRequestLog {
  const events: HttpEvent[] = [];
  const listeners = new Set<HttpObserver>();

  return {
    record(event) {
      events.push(event);

      if (events.length > capacity) {
        events.splice(0, events.length - capacity);
      }

      for (const listener of listeners) listener(event);
    },

    recent: () => events.slice(),

    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    clear() {
      events.length = 0;
    },
  };
}

/** The app's request log, fed by `defaultHttpClient`. */
export const httpRequestLog = createHttpRequestLog();
