import { QURAN_EDITIONS_URL, QURANPEDIA_BASE_URL } from '@/core/config';
import {
  OFFLINE_RETRY_MS,
  ONLINE_RECHECK_MS,
  PROBE_TIMEOUT_MS,
} from './policy';

/**
 * Internet reachability, independent of any one backend.
 *
 * The health probe in `BackendClient` answers "is the mock server up?" — a
 * different question. This module answers "does this device have a working
 * internet connection?", because when the answer is no there is nothing for an
 * external request to do: it would spend a timeout, fail, and retry for no
 * reason.
 *
 * Three pieces:
 *
 *  - `probeReachability` makes a `HEAD` request to a couple of canaries. Any
 *    HTTP response — a 404 included — proves the network works; only a network
 *    error or a timeout means offline.
 *  - `createConnectivityMonitor` turns probe results into a state
 *    (`unknown` → `online` | `offline`), re-probes on a cadence, and lets the
 *    browser's own `online`/`offline` events trigger an immediate re-check.
 *  - The transport consults the monitor before every request, so an offline
 *    app fails fast with `HttpOfflineError` instead of waiting for a timeout.
 *
 * `unknown` fails **open**: the app has not been told it is offline yet, so a
 * request is allowed. Blocking on `unknown` would make the whole app depend on
 * one canary host being reachable at startup, which turns a blocked probe into
 * a dead app. The probe runs immediately on `start()`, so `unknown` lasts one
 * round trip.
 */

export type ConnectivityState = 'unknown' | 'online' | 'offline';

/** The minimum the transport needs: may this request leave the device? */
export interface ConnectivityGate {
  isOnline(): boolean;
}

export type Probe = () => Promise<boolean>;

export type ConnectivityListener = (state: ConnectivityState) => void;

export type ConnectivityMonitor = ConnectivityGate & {
  state(): ConnectivityState;
  subscribe(listener: ConnectivityListener): () => void;
  /** Probe now. Concurrent calls share one probe. */
  check(): Promise<ConnectivityState>;
  /**
   * Begin probing (immediately, then on a cadence) and listening for the
   * platform's online/offline events. Returns the stop function.
   */
  start(): () => void;
  /** The platform told us the link is down; no probe needed to believe it. */
  markOffline(): void;
};

export type ConnectivityMonitorOptions = {
  probe?: Probe;
  /** Re-probe interval while online. */
  onlineRecheckMs?: number;
  /** Re-probe interval while offline. */
  offlineRetryMs?: number;
};

/**
 * The canaries.
 *
 * Both hosts are already read by the app, so their CORS headers are known to
 * work from the web build. `HEAD` is a CORS-safelisted method, so the probe
 * needs no preflight and downloads no body. Two hosts mean one of them being
 * down does not masquerade as "no internet".
 */
export const CONNECTIVITY_PROBE_URLS = [
  QURAN_EDITIONS_URL,
  QURANPEDIA_BASE_URL,
] as const;

/**
 * `true` if any canary answered at all.
 *
 * Resolution of the `fetch` promise is the signal, not the status: a 404 from a
 * reachable host still proves DNS, TLS and an HTTP exchange happened.
 */
export async function probeReachability(
  urls: readonly string[] = CONNECTIVITY_PROBE_URLS,
  timeoutMs: number = PROBE_TIMEOUT_MS,
): Promise<boolean> {
  if (urls.length === 0) return true;

  const controller = new AbortController();
  const timer =
    timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    return await new Promise<boolean>((resolve) => {
      let remaining = urls.length;
      let settled = false;

      const finish = (online: boolean) => {
        if (settled) return;

        settled = true;
        resolve(online);
      };

      for (const url of urls) {
        void fetch(url, {
          method: 'HEAD',
          cache: 'no-store',
          credentials: 'omit',
          signal: controller.signal,
        }).then(
          () => finish(true),
          () => {
            remaining -= 1;

            if (remaining === 0) finish(false);
          },
        );
      }
    });
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

/** The shape `globalThis` needs to have for the browser events to exist. */
type PlatformEvents = {
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

export function createConnectivityMonitor({
  probe = () => probeReachability(),
  onlineRecheckMs = ONLINE_RECHECK_MS,
  offlineRetryMs = OFFLINE_RETRY_MS,
}: ConnectivityMonitorOptions = {}): ConnectivityMonitor {
  let state: ConnectivityState = 'unknown';
  const listeners = new Set<ConnectivityListener>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: Promise<ConnectivityState> | null = null;
  let watchers = 0;
  let detachPlatform: (() => void) | null = null;

  const notify = (): void => {
    for (const listener of [...listeners]) {
      try {
        listener(state);
      } catch {
        // A listener is an observer; it cannot break the monitor.
      }
    }
  };

  const setState = (next: ConnectivityState): void => {
    if (next === state) return;

    state = next;
    notify();
  };

  const schedule = (): void => {
    if (watchers === 0) return;
    if (timer !== null) clearTimeout(timer);

    const delay = state === 'offline' ? offlineRetryMs : onlineRecheckMs;

    timer = setTimeout(() => {
      timer = null;
      void check();
    }, delay);
  };

  async function check(): Promise<ConnectivityState> {
    if (pending) return pending;

    pending = (async () => {
      let online = false;

      try {
        online = await probe();
      } catch {
        online = false;
      }

      setState(online ? 'online' : 'offline');

      return state;
    })();

    try {
      return await pending;
    } finally {
      pending = null;
      schedule();
    }
  }

  const attachPlatform = (): (() => void) => {
    const target = globalThis as unknown as PlatformEvents;

    if (
      typeof target.addEventListener !== 'function' ||
      typeof target.removeEventListener !== 'function'
    ) {
      return () => undefined;
    }

    const onOffline = (): void => {
      setState('offline');
      schedule();
    };
    const onOnline = (): void => {
      void check();
    };

    target.addEventListener('offline', onOffline);
    target.addEventListener('online', onOnline);

    return () => {
      target.removeEventListener?.('offline', onOffline);
      target.removeEventListener?.('online', onOnline);
    };
  };

  return {
    // Unknown fails open: the first probe has not answered yet.
    isOnline: () => state !== 'offline',

    state: () => state,

    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    check,

    start() {
      watchers += 1;

      if (watchers === 1) {
        detachPlatform = attachPlatform();
        void check();
      }

      let stopped = false;

      return () => {
        if (stopped) return;

        stopped = true;
        watchers -= 1;

        if (watchers === 0) {
          detachPlatform?.();
          detachPlatform = null;

          if (timer !== null) {
            clearTimeout(timer);
            timer = null;
          }
        }
      };
    },

    markOffline() {
      setState('offline');
      schedule();
    },
  };
}

/**
 * The app's connectivity monitor.
 *
 * The transport reads it on every request; `ConnectivityBridge` starts it and
 * mirrors its state into TanStack's `onlineManager`, which pauses queries while
 * offline instead of failing them.
 */
export const connectivityMonitor = createConnectivityMonitor();
