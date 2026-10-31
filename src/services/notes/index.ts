import { storageService } from '@/platform/storage';
import { createLocalNotesRepository } from './local-notes.repository';
import { createNotesService } from './notes.service';

/**
 * App-wide notes service.
 *
 * v1 is device-local by decision (D7): notes survive relaunch but are not
 * synchronized, and no screen imports the repository directly.
 */
export const notesService = createNotesService(
  createLocalNotesRepository(storageService),
);

export { createNotesService } from './notes.service';
export type { NotesService } from './notes.service';
export type { NotesRepository } from './notes.types';
export { NotesWriteError } from './notes.types';
export { createLocalNotesRepository } from './local-notes.repository';
