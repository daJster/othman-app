import { MOCK_BACKEND_ENABLED } from '@/platform/backend';
import { storageService } from '@/platform/storage';
import { createBackendNotesRepository } from './backend-notes.repository';
import { createLocalNotesRepository } from './local-notes.repository';
import { createNotesService } from './notes.service';

/**
 * App-wide notes service.
 *
 * v1 is device-local by decision (D7): notes survive relaunch but are not
 * synchronized, and no screen imports the repository directly.
 *
 * `EXPO_PUBLIC_MOCK_BACKEND=1` sends a signed-in reader's notes to the mock
 * server; the guest namespace still uses local storage.
 */
const localNotesRepository = createLocalNotesRepository(storageService);

export const notesService = createNotesService(
  MOCK_BACKEND_ENABLED
    ? createBackendNotesRepository(localNotesRepository)
    : localNotesRepository,
);

export { createNotesService } from './notes.service';
export type { NotesService } from './notes.service';
export type { NotesRepository } from './notes.types';
export { NotesWriteError } from './notes.types';
export { createLocalNotesRepository } from './local-notes.repository';
