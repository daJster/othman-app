import { QueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@/core/types';
import { memoryStorage } from '@/test-utils/memory-storage';
import { checksum } from '../checksum';
import type { StoredEntry, SyncScope } from '../local-data.types';
import { createLocalStore, LOCAL_DATA_VERSION } from '../local-store';
import { createSyncEngine, type SyncEngineDeps } from '../sync-engine';

/**
 * The engine's contract is the cache strategy itself: hydrate before the app
 * mounts, capture what screens fetch, and sync with checksum hits, replacements
 * and pruning. These tests drive it through that interface with a real
 * `QueryClient` and an in-memory store — no network, no React.
 */

const USER: AuthUser = {
  uid: 'u1',
  email: null,
  displayName: null,
  photoURL: null,
};

const KEY = ['othman', 'account', 'u1'] as const;
const DATA = { uid: 'u1', name: 'A' };

const engines: { stop(): Promise<void> }[] = [];

afterEach(async () => {
  while (engines.length > 0) {
    await engines.pop()!.stop();
  }
});

type HarnessOptions = {
  seed?: StoredEntry[];
  pull?: jest.Mock;
  scope?: Partial<SyncScope>;
};

async function harness(options: HarnessOptions = {}) {
  const storage = memoryStorage();
  const store = createLocalStore(storage);

  if (options.seed) {
    await store.write({
      version: LOCAL_DATA_VERSION,
      users: { u1: { savedAt: 0, entries: options.seed } },
    });
  }

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const pull = options.pull ?? jest.fn(async () => DATA);
  const scope: SyncScope = {
    name: 'account',
    matches: (key) => key[1] === 'account' && key[2] === USER.uid,
    pull,
    ...options.scope,
  };
  const deps: SyncEngineDeps = {
    client,
    store,
    scopes: () => [scope],
    logger: () => undefined,
  };
  const engine = createSyncEngine(deps);

  engines.push(engine);

  return { storage, store, client, engine, pull, scope };
}

function entry(data: unknown, updatedAt = 1_000): StoredEntry {
  return {
    key: KEY,
    data,
    checksum: checksum(data),
    updatedAt,
    verifiedAt: updatedAt,
  };
}

describe('hydration', () => {
  it('restores a stored entry with its original freshness', async () => {
    const { client, engine } = await harness({ seed: [entry(DATA)] });

    await engine.start(USER);

    expect(client.getQueryData(KEY)).toEqual(DATA);
    // The stored timestamp, not "now": staleTime decides the next read.
    expect(client.getQueryState(KEY)?.dataUpdatedAt).toBe(1_000);

    await engine.syncNow();

    expect(engine.getSnapshot()).toMatchObject({ ready: true, status: 'idle' });
  });

  it('drops an entry whose checksum no longer matches its payload', async () => {
    const { client, store, engine } = await harness({
      seed: [{ ...entry(DATA), data: { tampered: true } }],
    });

    await engine.start(USER);
    await engine.syncNow();
    await engine.flush();

    expect(client.getQueryData(KEY)).toBeUndefined();
    expect((await store.read()).users.u1.entries).toEqual([]);
  });

  it('does not hydrate another account key', async () => {
    const foreign: StoredEntry = {
      ...entry(DATA),
      key: ['othman', 'account', 'u2'],
    };
    const { client, store, engine } = await harness({ seed: [foreign] });

    await engine.start(USER);
    await engine.syncNow();

    expect(client.getQueryData(['othman', 'account', 'u2'])).toBeUndefined();
    expect((await store.read()).users.u1?.entries ?? []).toEqual([]);
  });
});

describe('sync', () => {
  it('counts an unchanged payload as a cache hit and writes nothing', async () => {
    const pull = jest.fn(async () => DATA);
    const { client, engine } = await harness({ seed: [entry(DATA)], pull });

    await engine.start(USER);
    const report = await engine.syncNow();

    expect(report).toMatchObject({ verified: 1, changed: 0, pruned: 0 });
    expect(client.getQueryState(KEY)?.dataUpdatedAt).toBe(1_000);
  });

  it('replaces the cache and the stored entry when the payload changed', async () => {
    const next = { uid: 'u1', name: 'B' };
    const { client, store, engine } = await harness({
      seed: [entry(DATA)],
      pull: jest.fn(async () => next),
    });

    await engine.start(USER);
    const report = await engine.syncNow();

    expect(report).toMatchObject({ verified: 0, changed: 1 });
    expect(client.getQueryData(KEY)).toEqual(next);
    expect((await store.read()).users.u1.entries[0].checksum).toBe(
      checksum(next),
    );
  });

  it('prunes an entry the scope declares obsolete', async () => {
    let expired = false;
    const { client, store, engine } = await harness({
      seed: [entry(DATA)],
      scope: { obsolete: () => expired },
    });

    await engine.start(USER);
    await engine.syncNow(); // settle the start sync while nothing is expired

    expired = true;
    const report = await engine.syncNow();
    await engine.flush();

    expect(report).toMatchObject({ pruned: 1, verified: 0 });
    expect(client.getQueryData(KEY)).toBeUndefined();
    expect((await store.read()).users.u1.entries).toEqual([]);
  });

  it('keeps the last good copy when a pull fails', async () => {
    const pull = jest.fn(async () => {
      throw new Error('offline');
    });
    const { store, client, engine } = await harness({
      seed: [entry(DATA)],
      pull,
    });

    await engine.start(USER);
    const report = await engine.syncNow();

    expect(report).toMatchObject({ failed: 1, verified: 0, changed: 0 });
    expect(engine.getSnapshot()).toMatchObject({ status: 'error' });
    expect(engine.getSnapshot().lastError).toBeTruthy();
    expect(client.getQueryData(KEY)).toEqual(DATA);
    expect((await store.read()).users.u1.entries).toHaveLength(1);
  });
});

describe('capture', () => {
  it('persists a successful read for a scope key', async () => {
    const { client, store, engine } = await harness();

    await engine.start(USER);
    client.setQueryData(KEY, DATA);
    await engine.flush();

    const stored = (await store.read()).users.u1.entries;

    expect(stored).toHaveLength(1);
    expect(stored[0].checksum).toBe(checksum(DATA));
  });

  it('ignores reads outside the cache scopes', async () => {
    const { client, store, engine } = await harness();

    await engine.start(USER);
    client.setQueryData(['othman', 'quran', 'catalog'], { editions: {} });
    await engine.flush();

    expect((await store.read()).users.u1).toBeUndefined();
  });
});

describe('clearUser', () => {
  it('removes only the named account slice', async () => {
    const { store, engine } = await harness();

    await store.write({
      version: LOCAL_DATA_VERSION,
      users: {
        u1: { savedAt: 0, entries: [] },
        u2: { savedAt: 0, entries: [] },
      },
    });

    await engine.clearUser('u1');

    const stored = await store.read();

    expect(stored.users.u1).toBeUndefined();
    expect(stored.users.u2).toBeDefined();
  });
});
