import type { QueryKey } from '@tanstack/react-query';
import { formatDateKey, isDateKey } from '@/core/domain/meetings/date-key';
import type { SurahProgress } from '@/core/domain/progress/surah-progress';
import type { AccountData, AuthUser, DateKey, Meeting } from '@/core/types';
import type { SyncScope } from './local-data.types';

/**
 * Which server data is worth keeping across launches.
 *
 * The three scopes are the user's own state: the account row, the progress
 * snapshot and the meetings the calendar has actually looked at. The mushaf is
 * public and immutable, so it is deliberately absent — persisting it would
 * write megabytes per page for data the query cache already owns.
 *
 * A scope is small on purpose: matching, pulling and expiry. The engine does not
 * know what an account or a meeting is, so a future domain is one more entry in
 * this array.
 */

/** Days of meeting history kept on disk. Older rows are pruned on sync. */
export const MEETINGS_RETENTION_DAYS = 30;

export type SyncScopeDeps = {
  account: { get: (user: AuthUser) => Promise<AccountData> };
  progress: { list: () => Promise<SurahProgress[]> };
  meetings: {
    byDate: (date: DateKey) => Promise<Meeting[]>;
    byRange: (from: DateKey, to: DateKey) => Promise<Meeting[]>;
    /** Drops the service's in-memory caches so a pull sees the server. */
    invalidate: () => void;
  };
};

/**
 * The calendar day a meetings key is anchored to.
 *
 * Both shapes the meetings screen creates are handled: one day
 * (`…meetings, 2026-11-23`) and the calendar's window
 * (`…meetings, range, from, to`). A range lives as long as its newest day.
 */
export function meetingsKeyDate(key: QueryKey): DateKey | null {
  if (key[1] !== 'meetings') return null;
  if (isDateKey(key[2])) return key[2];
  if (key[2] === 'range' && isDateKey(key[4])) return key[4];

  return null;
}

/** Oldest day a meetings entry may still name. */
export function meetingsRetentionStart(now: number): DateKey {
  const start = new Date(now);

  start.setDate(start.getDate() - MEETINGS_RETENTION_DAYS);

  return formatDateKey(start);
}

export function createSyncScopes(
  user: AuthUser,
  deps: SyncScopeDeps,
): SyncScope[] {
  return [
    {
      name: 'account',
      // The key carries the uid; another account's row must never hydrate here.
      matches: (key) => key[1] === 'account' && key[2] === user.uid,
      pull: () => deps.account.get(user),
    },
    {
      name: 'progress',
      matches: (key) => key[1] === 'progress' && key[2] === 'surah',
      pull: () => deps.progress.list(),
    },
    {
      name: 'meetings',
      matches: (key) => meetingsKeyDate(key) !== null,
      // The service answers from an in-memory cache first; a sync wants the
      // server, so the scope resets that cache once per run.
      begin: () => deps.meetings.invalidate(),
      obsolete: (key, now) => {
        const day = meetingsKeyDate(key);

        return day !== null && day < meetingsRetentionStart(now);
      },
      pull: (key) => {
        if (isDateKey(key[2])) return deps.meetings.byDate(key[2]);

        if (key[2] === 'range' && isDateKey(key[3]) && isDateKey(key[4])) {
          return deps.meetings.byRange(key[3], key[4]);
        }

        return Promise.resolve(null);
      },
    },
  ];
}
