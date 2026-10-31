import { createStorageService } from '@/platform/storage/storage.backend';
import type { StorageBackend } from '@/platform/storage/storage.backend';

function createMemoryBackend(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));

  const backend: StorageBackend & { store: Map<string, string> } = {
    store,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };

  return backend;
}

describe('createStorageService', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('round-trips JSON values', async () => {
    const service = createStorageService(createMemoryBackend(), 'test');

    await expect(
      service.setItem('theme', { mode: 'dark', followsSystem: false }),
    ).resolves.toBe(true);
    await expect(service.getItem('theme', null)).resolves.toEqual({
      mode: 'dark',
      followsSystem: false,
    });

    await service.setItem('language', 'ar');
    await expect(service.getItem('language', 'en')).resolves.toBe('ar');

    await service.setItem('lastVisitedPage', 42);
    await expect(service.getItem('lastVisitedPage', 1)).resolves.toBe(42);
  });

  it('returns the fallback for a missing key', async () => {
    const service = createStorageService(createMemoryBackend(), 'test');

    await expect(service.getItem('theme', 'system')).resolves.toBe('system');
  });

  it('returns the fallback for a corrupt payload instead of throwing', async () => {
    const backend = createMemoryBackend({
      theme: '{"mode":"dark"',
      language: 'undefined',
    });
    const service = createStorageService(backend, 'test');

    await expect(service.getItem('theme', 'system')).resolves.toBe('system');
    await expect(service.getItem('language', 'en')).resolves.toBe('en');
    expect(console.warn).toHaveBeenCalled();
  });

  it('contains backend failures and reports them as booleans', async () => {
    const failing: StorageBackend = {
      getItem: () => {
        throw new Error('boom');
      },
      setItem: () => {
        throw new Error('boom');
      },
      removeItem: () => {
        throw new Error('boom');
      },
      clear: () => {
        throw new Error('boom');
      },
    };
    const service = createStorageService(failing, 'test');

    await expect(service.getItem('theme', 'light')).resolves.toBe('light');
    await expect(service.setItem('theme', 'dark')).resolves.toBe(false);
    await expect(service.removeItem('theme')).resolves.toBe(false);
    await expect(service.clear()).resolves.toBe(false);
  });

  it('refuses to persist values JSON cannot represent', async () => {
    const service = createStorageService(createMemoryBackend(), 'test');

    await expect(service.setItem('theme', undefined)).resolves.toBe(false);
    await expect(service.setItem('theme', () => {})).resolves.toBe(false);
  });

  it('clears every key', async () => {
    const backend = createMemoryBackend({ theme: '"dark"', language: '"ar"' });
    const service = createStorageService(backend, 'test');

    await expect(service.clear()).resolves.toBe(true);
    expect(backend.store.size).toBe(0);
  });
});
