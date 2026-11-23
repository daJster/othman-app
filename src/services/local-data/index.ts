import { storageService } from '@/platform/storage';
import { meetingsService } from '@/services/meetings';
import { progressService } from '@/services/progress';
import { profileService } from '@/services/profile';
import { queryClient } from '@/services/query';
import { createLocalStore } from './local-store';
import { createSyncScopes } from './scopes';
import { createSyncEngine } from './sync-engine';

/**
 * App-wide local-first cache.
 *
 * The singleton wires the engine to the real storage, query client and service
 * barrels; every domain decision lives in `scopes.ts` and every cache decision
 * in `sync-engine.ts`. Screens never import this module — the provider starts it
 * for the signed-in session and the request layer keeps working unchanged.
 */
export const localData = createSyncEngine({
  client: queryClient,
  store: createLocalStore(storageService),
  scopes: (user) =>
    createSyncScopes(user, {
      account: { get: (authUser) => profileService.getAccount(authUser) },
      progress: { list: () => progressService.listSurahProgress() },
      meetings: {
        byDate: (date) => meetingsService.listByDate(date),
        byRange: (from, to) => meetingsService.listByRange(from, to),
        invalidate: () => meetingsService.invalidate(),
      },
    }),
});

export { checksum } from './checksum';
export { LOCAL_DATA_VERSION } from './local-store';
export { MEETINGS_RETENTION_DAYS } from './scopes';
export type {
  HydrateReport,
  LocalDataSnapshot,
  StoredDocument,
  StoredEntry,
  StoredUser,
  SyncReport,
  SyncScope,
  SyncScopeName,
} from './local-data.types';
export type { LocalDataEngine, SyncReason } from './sync-engine';
