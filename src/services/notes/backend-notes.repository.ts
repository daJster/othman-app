import type { QuranNote } from '@/core/domain/notes/notes';
import { backendClient } from '@/platform/backend';
import type { BackendClient } from '@/platform/backend';
import type { RequestOptions } from '@/platform/http';
import { NotesWriteError, type NotesRepository } from './notes.types';

/**
 * Notes repository backed by the mock server, with a local fallback for the
 * guest namespace.
 *
 * Notes are the one piece of reader data that is still device-local in v1
 * (D7). In mock-backend mode a signed-in reader's notes go to the server so the
 * CRUD surface can be exercised end-to-end; a signed-out reader keeps the
 * existing local behaviour, because the server correctly rejects anonymous
 * writes and losing a guest's note would be worse than not syncing it.
 */

function uidFromNamespace(namespace: string): string | null {
  return namespace.startsWith('user:') ? namespace.slice('user:'.length) : null;
}

function toQuranNote(note: {
  id: string;
  ayah: QuranNote['ayah'];
  text: string;
  createdAt: number;
}): QuranNote {
  return {
    id: note.id,
    ayah: {
      surah: note.ayah.surah,
      ayah: note.ayah.ayah,
      absoluteNumber: note.ayah.absoluteNumber,
    },
    text: note.text,
    createdAt: note.createdAt,
  };
}

export function createBackendNotesRepository(
  local: NotesRepository,
  client: BackendClient = backendClient,
): NotesRepository {
  return {
    async list(
      namespace: string,
      options?: RequestOptions,
    ): Promise<QuranNote[]> {
      if (!uidFromNamespace(namespace)) return local.list(namespace);

      try {
        const { notes } = await client.listNotes(undefined, options);

        return notes.map(toQuranNote);
      } catch (error) {
        // A cancelled read is not an outage: the reader has left, so there is
        // nothing to fall back to and no reason to read the device.
        if (options?.signal?.aborted) throw error;

        // Offline should not hide notes the reader already has on the device.
        return local.list(namespace);
      }
    },

    async save(namespace: string, note: QuranNote): Promise<void> {
      if (!uidFromNamespace(namespace)) {
        await local.save(namespace, note);
        return;
      }

      try {
        // The mock server is idempotent by id, matching the app's retry model.
        await client.saveNote({
          id: note.id,
          surah: note.ayah.surah,
          ayah: note.ayah.ayah,
          absoluteNumber: note.ayah.absoluteNumber,
          text: note.text,
          createdAt: note.createdAt,
        });
      } catch {
        throw new NotesWriteError();
      }
    },
  };
}
