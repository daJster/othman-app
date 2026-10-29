/**
 * HTTP contracts + the fetch implementation.
 *
 * Consumers import this barrel, not `./client`, so the transport can be swapped
 * (a native client, a mocked one in tests) without touching every repository.
 */
export {
  FetchHttpClient,
  HttpAbortError,
  HttpError,
  HttpTimeoutError,
  defaultHttpClient,
} from './client';
export type {
  HttpClient,
  HttpHeaders,
  HttpMethod,
  HttpRequestInit,
} from './client';
export { clearJsonCache, getCachedJson, setCachedJson } from './json-cache';
