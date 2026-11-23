import { checksum } from '../checksum';
import {
  createLocalStore,
  emptyDocument,
  LOCAL_DATA_VERSION,
} from '../local-store';
import { memoryStorage } from '@/test-utils/memory-storage';

describe('createLocalStore', () => {
  it('returns an empty document when nothing is stored', async () => {
    const store = createLocalStore(memoryStorage());

    expect(await store.read()).toEqual(emptyDocument());
  });

  it('round-trips a document', async () => {
    const store = createLocalStore(memoryStorage());
    const document = {
      version: LOCAL_DATA_VERSION,
      users: {
        u1: {
          savedAt: 5,
          entries: [
            {
              key: ['othman', 'progress', 'surah'] as const,
              data: [{ surah: 1 }],
              checksum: checksum([{ surah: 1 }]),
              updatedAt: 4,
              verifiedAt: 5,
            },
          ],
        },
      },
    };

    expect(await store.write(document)).toBe(true);
    expect(await store.read()).toEqual(document);
  });

  it('discards a document from another schema version', async () => {
    const storage = memoryStorage();

    await storage.setItem('local-data', { version: 99, users: { u1: {} } });

    expect(await createLocalStore(storage).read()).toEqual(emptyDocument());
  });

  it('discards a document whose user map is missing', async () => {
    const storage = memoryStorage();

    await storage.setItem('local-data', { version: LOCAL_DATA_VERSION });

    expect(await createLocalStore(storage).read()).toEqual(emptyDocument());
  });
});
