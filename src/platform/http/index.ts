/**
 * HTTP contracts + the fetch implementation.
 *
 * Consumers import this barrel, not the files beside it, so the transport can
 * be swapped (a native client, a fake in tests) without touching the
 * repositories above it.
 */
export {
  FetchHttpClient,
  HttpAbortError,
  HttpError,
  HttpOfflineError,
  HttpTimeoutError,
  defaultHttpClient,
} from './client';
export type {
  FetchHttpClientOptions,
  HttpClient,
  HttpHeaders,
  HttpMethod,
  HttpRequestInit,
  RequestOptions,
} from './client';
export {
  CONNECTIVITY_PROBE_URLS,
  connectivityMonitor,
  createConnectivityMonitor,
  probeReachability,
} from './connectivity';
export type {
  ConnectivityGate,
  ConnectivityListener,
  ConnectivityMonitor,
  ConnectivityMonitorOptions,
  ConnectivityState,
  Probe,
} from './connectivity';
export {
  OFFLINE_RETRY_MS,
  ONLINE_RECHECK_MS,
  PROBE_TIMEOUT_MS,
  REQUEST_TIMEOUT_MS,
} from './policy';
export { redactUrl } from './redact';
export { createHttpRequestLog, httpRequestLog } from './observe';
export type {
  HttpEvent,
  HttpObserver,
  HttpOutcome,
  HttpRequestLog,
} from './observe';
