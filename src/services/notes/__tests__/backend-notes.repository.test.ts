import type { QuranNote } from '@/core/domain/notes/notes';
import type { BackendClient } from '@/platform/backend';
import { createBackendNotesRepository } from '../backend-notes.repository';
import { NotesWriteError } from '../notes.types';

/**
 * The backend notes repository has two behaviours that are easy to undo by
 * accident: a server failure falls back to the device so a reader keeps the
 * notes already there, and a *cancelled* read does not, because the reader has
 * left and nothing will use the result.
 */

const NOTE: QuranNote = {
  id: 'n1',
  ayah: { surah: 2, ayah: 255, absoluteNumber: 262 },
  text: 'Ayat al-Kursi',
  createdAt: 1_700_000_000_000,
};

function local(notes: QuranNote[] = []) {
  return {
    list: jest.fn(async () => notes),
    save: jest.fn(async () => undefined),
  };
}

function backend(
  overrides: Partial<Record<'listNotes' | 'saveNote', jest.Mock>> = {},
) {
  return {
    listNotes: jest.fn(async () => ({ notes: [NOTE] })),
    saveNote: jest.fn(async () => ({ note: NOTE })),
    ...overrides,
  } as unknown as BackendClient;
}

describe('createBackendNotesRepository', () => {
  describe('list', () => {
    it('reads a signed-in reader from the server and forwards the signal', async () => {
      const client = backend();
      const device = local();
      const repository = createBackendNotesRepository(device, client);
      const controller = new AbortController();

      await expect(
        repository.list('user:a', { signal: controller.signal }),
      ).resolves.toEqual([NOTE]);

      expect(client.listNotes).toHaveBeenCalledWith(undefined, {
        signal: controller.signal,
      });
      expect(device.list).not.toHaveBeenCalled();
    });

    it('reads a guest from the device without a request', async () => {
      const client = backend();
      const device = local([NOTE]);
      const repository = createBackendNotesRepository(device, client);

      await expect(repository.list('guest')).resolves.toEqual([NOTE]);
      expect(client.listNotes).not.toHaveBeenCalled();
    });

    it('falls back to the device when the server fails', async () => {
      const client = backend({
        listNotes: jest.fn(async () => {
          throw new Error('offline');
        }),
      });
      const repository = createBackendNotesRepository(local([NOTE]), client);

      await expect(repository.list('user:a')).resolves.toEqual([NOTE]);
    });

    it('rethrows a cancelled read instead of replacing it with device data', async () => {
      const controller = new AbortController();
      controller.abort();
      const client = backend({
        listNotes: jest.fn(async () => {
          throw new Error('aborted');
        }),
      });
      const repository = createBackendNotesRepository(local([NOTE]), client);

      await expect(
        repository.list('user:a', { signal: controller.signal }),
      ).rejects.toThrow('aborted');
    });
  });

  describe('save', () => {
    it('writes a signed-in reader to the server', async () => {
      const client = backend();
      const repository = createBackendNotesRepository(local(), client);

      await repository.save('user:a', NOTE);

      expect(client.saveNote).toHaveBeenCalledWith({
        id: NOTE.id,
        surah: 2,
        ayah: 255,
        absoluteNumber: 262,
        text: NOTE.text,
        createdAt: NOTE.createdAt,
      });
    });

    it('throws NotesWriteError when the server rejects the write', async () => {
      const client = backend({
        saveNote: jest.fn(async () => {
          throw new Error('server said no');
        }),
      });
      const repository = createBackendNotesRepository(local(), client);

      await expect(repository.save('user:a', NOTE)).rejects.toBeInstanceOf(
        NotesWriteError,
      );
    });
  });
});
