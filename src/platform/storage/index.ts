// Platform-resolved barrel: Metro picks `storageService.web.ts` on web and
// `storageService.ts` everywhere else.
export { storageService } from './storageService';
export {
  STORAGE_KEYS,
  type StorageKey,
  type StorageService,
} from './storage.types';
