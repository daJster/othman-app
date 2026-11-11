/**
 * The frontend's single doorway to the network.
 *
 * Every request the app makes is declared in `endpoints.ts`; every screen reads
 * it through one of two hooks. Import from this barrel and nothing below it:
 *
 *   commands + strategies   `api` (see `endpoints.ts`)
 *   server state            `useApiQuery`, `useApiMutation` (TanStack)
 *   client-local state      `useApiStore` (Zustand)
 *   live updates            `<ApiEventsBridge />`
 *
 * The split in one sentence: TanStack owns anything the server wrote, Zustand
 * owns anything the device knows, and this module is the only place the app
 * names a URL, a cache key or a retry count.
 *
 * The transport itself lives in `@/platform/backend` (token persistence, JSON
 * encoding, error normalization). Nothing outside this layer should import it:
 * a screen that reached for `backendClient` would bypass the strategy and the
 * invalidation rule, which is exactly what this module exists to prevent.
 */

export { api } from './endpoints';
export type { TafsirAyah } from './endpoints';

export { useApiMutation, useApiQuery } from './hooks';
export type { ApiMutationOptions, ApiQueryOptions } from './hooks';

export { FETCH_POLICIES } from './policies';
export type { FetchPolicy, FetchPolicyName } from './policies';

export { currentCursor, useApiStore } from './store';
export type { ApiConnection, ApiStore } from './store';

export { ApiEventsBridge, useApiEvents } from './events';

export { backendMessageKey, isDuplicateAccount } from './messages';
export type { BackendMessageKey } from './messages';

export type { ApiMutation, ApiQuery, NoParams } from './types';

/**
 * Transport + demo-server configuration.
 *
 * `BackendError` is part of the contract: a screen that shows an error message
 * needs its `code` to decide between "sign in again" and "try later".
 */
export {
  BACKEND_PORT,
  BackendError,
  MOCK_BACKEND_ENABLED,
  backendBaseUrl,
  backendClient,
} from '@/platform/backend';
export type {
  BackendAccount,
  BackendAccountPatch,
  BackendBookmark,
  BackendErrorCode,
  BackendEvent,
  BackendHealth,
  BackendNote,
  BackendProfile,
  BackendQuranCatalog,
  BackendSession,
  BackendSurah,
  BackendUser,
} from '@/platform/backend';
