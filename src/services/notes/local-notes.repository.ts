import {
  EMPTY_NOTES,
  notesIn,
  parseNotesPayload,
  withNote,
} from '@/core/domain/notes/notes';
import type { StorageService } from '@/platform/storage';
import { STORAGE_KEYS } from '@/platform/storage';
import { NotesWriteError, type NotesRepository } from './notes.types';

/**
 * Local notes repository.
 *
 * One storage key holds every namespace, because notes are small and a
 * per-account key would need a key scheme the storage service does not model.
 * Reads parse through the domain validator, so a partially written or
 * hand-edited payload degrades to "no notes" instead of crashing the panel.
 *
 * A `setItem` that resolves `false` is a real failure (`storage.backend`
 * reports a rejected write that way), and it must reject: the panel's
 * optimistic row has to be rolled back.
 */
export function createLocalNotesRepository(
  storage: StorageService,
): NotesRepository {
  async function readPayload() {
    const raw = await storage.getItem<unknown>(
      STORAGE_KEYS.quranNotes,
      EMPTY_NOTES,
    );

    return parseNotesPayload(raw);
  }

  return {
    async list(namespace: string) {
      const payload = await readPayload();

      // A copy: the cached array must not be mutable through a caller.
      return notesIn(payload, namespace).map((note) => ({
        ...note,
        ayah: { ...note.ayah },
      }));
    },

    async save(namespace: string, note) {
      const payload = await readPayload();
      const next = withNote(payload, namespace, note);
      const written = await storage.setItem(STORAGE_KEYS.quranNotes, next);

      if (!written) throw new NotesWriteError();
    },
  };
}
