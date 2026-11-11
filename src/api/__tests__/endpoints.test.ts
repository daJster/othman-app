import type { AccountProfile } from '@/core/domain/account/merge-profile';
import type { AuthUser } from '@/core/types';
import { queryKeys } from '@/services/query';
import { api } from '../endpoints';
import type { ApiMutation, ApiQuery } from '../types';

/**
 * The registry is the app's request contract, so these tests are about shape
 * rather than transport: unique ids, stable keys, honest guards, and "a write
 * says what it makes stale".
 *
 * Every assertion here is something a screen would otherwise discover at
 * runtime, after a refetch that did not happen.
 */

type AnyQuery = ApiQuery<unknown, unknown>;
type AnyMutation = ApiMutation<unknown, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function collect<T>(
  node: unknown,
  predicate: (value: unknown) => value is T,
): T[] {
  if (!isRecord(node)) return [];

  const found: T[] = [];

  for (const value of Object.values(node)) {
    if (predicate(value)) {
      found.push(value);
    } else if (isRecord(value)) {
      found.push(...collect(value, predicate));
    }
  }

  return found;
}

function isQuery(value: unknown): value is AnyQuery {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.key === 'function' &&
    typeof value.run === 'function'
  );
}

function isMutation(value: unknown): value is AnyMutation {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.run === 'function' &&
    typeof value.key !== 'function'
  );
}

describe('command registry', () => {
  const queries = collect(api, isQuery);
  const mutations = collect(api, isMutation);

  it('declares each command once', () => {
    const ids = [...queries, ...mutations].map((endpoint) => endpoint.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

    expect(duplicates).toEqual([]);
    expect(queries.length).toBeGreaterThan(0);
    expect(mutations.length).toBeGreaterThan(0);
  });

  it('gives every query a stable key for the same question', () => {
    expect(api.meetings.byDate.key({ date: '2026-11-11' })).toEqual(
      api.meetings.byDate.key({ date: '2026-11-11' }),
    );
    expect(
      api.tafsir.content.key({ type: 'tafsir', ayah: null, sourceId: 4 }),
    ).toEqual(queryKeys.tafsir.content('tafsir', 0, 4));
    // Different questions must not collide.
    expect(api.meetings.byDate.key({ date: '2026-11-11' })).not.toEqual(
      api.meetings.byDate.key({ date: '2026-11-12' }),
    );
  });

  it('declares what a write makes stale, on the write', () => {
    const profile: Partial<AccountProfile> = { displayName: 'New name' };

    expect(
      api.account.update.invalidates?.({ uid: 'uid-1', patch: profile }),
    ).toEqual([queryKeys.account.byUid('uid-1')]);

    // A meeting edit must refresh both the screen's list and the raw demo
    // namespace, but must not drop unrelated caches.
    expect(api.demo.meetings.remove.invalidates?.({ id: 3 })).toEqual([
      queryKeys.backend.meetingsRoot,
      queryKeys.backend.meetingRoot,
      queryKeys.meetings.root,
    ]);
    expect(
      api.demo.meetings.remove.invalidates?.({ id: 3 }),
    ).not.toContainEqual(queryKeys.backend.root);
  });

  it('refuses to ask a question the parameters do not answer', () => {
    expect(api.account.byUid.ready?.({ user: null })).toBe(false);
    expect(
      api.account.byUid.ready?.({
        user: {
          uid: 'u',
          email: 'e',
          displayName: null,
          photoURL: null,
        } as AuthUser,
      }),
    ).toBe(true);

    expect(api.quran.ayah.ready?.({ absoluteNumber: null })).toBe(false);
    expect(api.quran.bboxes.ready?.({ edition: null })).toBe(false);
    expect(
      api.notes.byAyah.ready?.({ namespace: 'n', absoluteNumber: null }),
    ).toBe(false);
    expect(
      api.tafsir.content.ready?.({ type: 'surah', ayah: null, sourceId: 1 }),
    ).toBe(false);
  });

  it('marks the demo server surface, and only that', () => {
    expect(api.demo.health.demo).toBe(true);
    expect(api.meetings.byDate.demo).toBeUndefined();
    expect(api.quran.catalog.demo).toBeUndefined();
  });
});
