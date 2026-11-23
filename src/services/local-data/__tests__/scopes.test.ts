import type { AuthUser } from '@/core/types';
import {
  createSyncScopes,
  meetingsKeyDate,
  meetingsRetentionStart,
  MEETINGS_RETENTION_DAYS,
  type SyncScopeDeps,
} from '../scopes';

/**
 * The scope list is the module's domain policy: which keys survive, where a
 * fresh value comes from, and when a stored key is too old to keep. These tests
 * pin that policy without a query client or storage.
 */

const USER: AuthUser = {
  uid: 'u1',
  email: null,
  displayName: null,
  photoURL: null,
};

function deps(overrides: Partial<SyncScopeDeps> = {}): SyncScopeDeps {
  return {
    account: {
      get: async (user) => ({ uid: user.uid }) as never,
    },
    progress: { list: async () => [] },
    meetings: {
      byDate: async () => [],
      byRange: async () => [],
      invalidate: () => undefined,
    },
    ...overrides,
  };
}

function scopeNamed(
  name: 'account' | 'progress' | 'meetings',
  config = deps(),
) {
  return createSyncScopes(USER, config).find((scope) => scope.name === name)!;
}

describe('meetingsKeyDate', () => {
  it('reads the day from a per-day key', () => {
    expect(meetingsKeyDate(['othman', 'meetings', '2026-11-23'])).toBe(
      '2026-11-23',
    );
  });

  it('uses the newest day of a range key', () => {
    expect(
      meetingsKeyDate([
        'othman',
        'meetings',
        'range',
        '2026-11-01',
        '2026-11-30',
      ]),
    ).toBe('2026-11-30');
  });

  it('rejects keys from other domains and malformed days', () => {
    expect(meetingsKeyDate(['othman', 'account', 'u1'])).toBeNull();
    expect(
      meetingsKeyDate(['othman', 'meetings', 'range', 'x', 'y']),
    ).toBeNull();
  });
});

describe('meetingsRetentionStart', () => {
  it('is the local day MEETINGS_RETENTION_DAYS ago', () => {
    const now = new Date(2026, 10, 23).getTime();

    expect(meetingsRetentionStart(now)).toBe('2026-10-24');
    expect(MEETINGS_RETENTION_DAYS).toBe(30);
  });
});

describe('account scope', () => {
  it('only owns the key for this user', () => {
    const scope = scopeNamed('account');

    expect(scope.matches(['othman', 'account', 'u1'])).toBe(true);
    expect(scope.matches(['othman', 'account', 'u2'])).toBe(false);
    expect(scope.matches(['othman', 'progress', 'surah'])).toBe(false);
  });

  it('pulls the merged account for its user', async () => {
    const get = jest.fn(async () => ({ uid: 'u1' }) as never);
    const scope = scopeNamed('account', deps({ account: { get } }));

    await expect(scope.pull(['othman', 'account', 'u1'])).resolves.toEqual({
      uid: 'u1',
    });
    expect(get).toHaveBeenCalledWith(USER);
  });
});

describe('progress scope', () => {
  it('owns the surah snapshot only', () => {
    const scope = scopeNamed('progress');

    expect(scope.matches(['othman', 'progress', 'surah'])).toBe(true);
    expect(scope.matches(['othman', 'progress', 'other'])).toBe(false);
  });

  it('pulls every row in one request', async () => {
    const list = jest.fn(async () => []);
    const scope = scopeNamed('progress', deps({ progress: { list } }));

    await scope.pull(['othman', 'progress', 'surah']);
    expect(list).toHaveBeenCalledTimes(1);
  });
});

describe('meetings scope', () => {
  it('owns day and range keys only', () => {
    const scope = scopeNamed('meetings');

    expect(scope.matches(['othman', 'meetings', '2026-11-23'])).toBe(true);
    expect(
      scope.matches([
        'othman',
        'meetings',
        'range',
        '2026-11-01',
        '2026-11-30',
      ]),
    ).toBe(true);
    expect(scope.matches(['othman', 'account', 'u1'])).toBe(false);
  });

  it('expires days older than the retention window', () => {
    const scope = scopeNamed('meetings');
    const now = new Date(2026, 10, 23).getTime();

    expect(scope.obsolete?.(['othman', 'meetings', '2026-10-24'], now)).toBe(
      false,
    );
    expect(scope.obsolete?.(['othman', 'meetings', '2026-10-23'], now)).toBe(
      true,
    );
    expect(
      scope.obsolete?.(
        ['othman', 'meetings', 'range', '2026-09-01', '2026-10-01'],
        now,
      ),
    ).toBe(true);
  });

  it('drops the service caches once per sync', () => {
    const invalidate = jest.fn();
    const scope = scopeNamed(
      'meetings',
      deps({
        meetings: {
          byDate: async () => [],
          byRange: async () => [],
          invalidate,
        },
      }),
    );

    scope.begin?.();
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('routes a pull by key shape', async () => {
    const byDate = jest.fn(async () => []);
    const byRange = jest.fn(async () => []);
    const scope = scopeNamed(
      'meetings',
      deps({
        meetings: {
          byDate,
          byRange,
          invalidate: () => undefined,
        },
      }),
    );

    await scope.pull(['othman', 'meetings', '2026-11-23']);
    expect(byDate).toHaveBeenCalledWith('2026-11-23');

    await scope.pull([
      'othman',
      'meetings',
      'range',
      '2026-11-01',
      '2026-11-30',
    ]);
    expect(byRange).toHaveBeenCalledWith('2026-11-01', '2026-11-30');
  });
});
