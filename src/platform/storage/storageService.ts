import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStorageService } from './storage.backend';

/**
 * Native storage: AsyncStorage (SQLite/RocksDB backed, survives relaunch).
 *
 * JSON handling and error containment live in `createStorageService`, so this
 * file only wires the backend.
 */
export const storageService = createStorageService(AsyncStorage, 'native');
