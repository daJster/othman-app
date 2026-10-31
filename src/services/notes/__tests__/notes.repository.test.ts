import type { QuranNote } from '@/core/domain/notes/notes';
import { EMPTY_NOTES } from '@/core/domain/notes/notes';
import type { StorageService } from '@/platform/storage';
import { STORAGE_KEYS } from '@/platform/storage';
import {
  NotesWriteError,
  createLocalNotesRepository,
  createNotesService,
} from '..';

/**
 * Notes persistence.
 *
 * These cases cover the promises the panel relies on: a note survives a fresh
 * repository instance (relaunch), a corrupt payload degrades to "no notes"
 * instead of throwing, a rejected write throws so the optimistic row can be
 * rolled back, and namespaces never leak into each other.
 */

function memoryStorage(initial: unknown = EMPTY_NOTES): StorageService & {
  value: unknown;
  failWrites: boolean;
} {
  const storage = {
    value: initial,
    failWrites: false,
    async getItem<T>(_key: string, fallback: T): Promise<T> {
      return (storage.value ?? fallback) as T;
    },
    async setItem<T>(_key: string, value: T): Promise<boolean> {
      if (storage.failWrites) return false;

      storage.value = value;

      return true;
    },
    async removeItem(): Promise<boolean> {
      return true;
    },
    async clear(): Promise<boolean> {
      return true;
    },
  };

  return storage;
}

const NOTE: QuranNote = {
  id: 'n1',
  ayah: { surah: 2, ayah: 255, absoluteNumber: 262 },
  text: 'Ayat al-Kursi',
  createdAt: 1_700_000_000_000,
};

describe('createLocalNotesRepository', () => {
  it('round-trips a note through a new repository instance', async () => {
    const storage = memoryStorage();
    const repository = createLocalNotesRepository(storage);

    await repository.save('user:a', NOTE);

    // A second instance models the next launch: nothing is cached in memory.
    const afterRelaunch = createLocalNotesRepository(storage);

    await expect(afterRelaunch.list('user:a')).resolves.toEqual([NOTE]);
    expect(storage.value).toMatchObject({ version: 1 });
  });

  it('keeps namespaces isolated in both directions', async () => {
    const repository = createLocalNotesRepository(memoryStorage());

    await repository.save('user:a', NOTE);
    await repository.save('user:b', { ...NOTE, id: 'n2', text: 'other' });

    await expect(repository.list('user:a')).resolves.toEqual([NOTE]);
    await expect(repository.list('guest')).resolves.toEqual([]);
  });

  it('does not duplicate a retried save with the same id', async () => {
    const repository = createLocalNotesRepository(memoryStorage());

    await repository.save('guest', NOTE);
    await repository.save('guest', { ...NOTE, text: 'edited' });

    await expect(repository.list('guest')).resolves.toEqual([
      { ...NOTE, text: 'edited' },
    ]);
  });

  it('treats a corrupt payload as empty instead of throwing', async () => {
    const repository = createLocalNotesRepository(
      memoryStorage({ version: 99, byNamespace: { guest: [NOTE] } }),
    );

    await expect(repository.list('guest')).resolves.toEqual([]);
  });

  it('throws a NotesWriteError when the storage write is rejected', async () => {
    const storage = memoryStorage();
    storage.failWrites = true;
    const repository = createLocalNotesRepository(storage);

    await expect(repository.save('guest', NOTE)).rejects.toBeInstanceOf(
      NotesWriteError,
    );
  });

  it('returns copies so a caller cannot mutate the cached note', async () => {
    const repository = createLocalNotesRepository(memoryStorage());
    await repository.save('guest', NOTE);

    const [listed] = await repository.list('guest');
    listed.text = 'mutated';

    await expect(repository.list('guest')).resolves.toEqual([NOTE]);
  });
});

describe('createNotesService', () => {
  it('delegates listing and returns the saved note', async () => {
    const repository = createLocalNotesRepository(memoryStorage());
    const service = createNotesService(repository);

    await expect(service.save('guest', NOTE)).resolves.toEqual(NOTE);
    await expect(service.list('guest')).resolves.toEqual([NOTE]);
  });
});

describe('storage key', () => {
  it('is a dedicated notes key, not the reader edition key', () => {
    expect(STORAGE_KEYS.quranNotes).toBe('quran:notes');
  });
});
