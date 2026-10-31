import { storageService } from '@/platform/storage';
import { createReaderStore } from './reader-store';

/**
 * The app-wide reader store.
 *
 * Kept out of `reader-store.ts` so the factory (and its tests) never touches
 * persistence or the native module: only the running app needs a store bound to
 * device storage.
 */
export const readerStore = createReaderStore(storageService);
