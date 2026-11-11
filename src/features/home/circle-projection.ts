import { parseDateKey } from '@/core/domain/meetings/date-key';
import type { CircleItem } from '@/services/circle';

/**
 * The three readings of one circle list.
 *
 * Kept pure and separate from React so the rules can be tested without a
 * renderer, and so the page and the pinned pill cannot disagree about what
 * "next" means.
 *
 * Rules, all agreed in the design:
 *
 *  - **Pill**: the soonest *timed* item (session or exam) that is still ahead,
 *    within seven days. A session wins a tie with an exam.
 *  - **Rail**: the next session, the next exam, and the newest notice — three
 *    different questions, so a notice can never displace a date.
 *  - **Inbox**: every row, newest first. Notices carry no unread semantics
 *    outside the bell.
 */

/** The pill reports nothing older than this. */
export const NEXT_HORIZON_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** A row's local start time; `null` for an undated notice. */
export function startsAt(item: CircleItem): Date | null {
  if (!item.date) return null;

  const day = parseDateKey(item.date);
  const [hours, minutes] = (item.time ?? '00:00').split(':').map(Number);

  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hours || 0,
    minutes || 0,
  );
}

export function isTimed(item: CircleItem): boolean {
  return item.kind !== 'notice' && item.date !== null;
}

/**
 * The soonest upcoming timed item inside the horizon.
 *
 * Items on the same clock reading keep the session ahead of the exam: a halqa
 * is the thing the cohort is actually doing.
 */
export function pickNextUp(
  items: readonly CircleItem[],
  now: Date,
): CircleItem | null {
  const horizon = now.getTime() + NEXT_HORIZON_DAYS * DAY_MS;

  let best: { item: CircleItem; at: number } | null = null;

  for (const item of items) {
    if (!isTimed(item)) continue;

    const at = startsAt(item)?.getTime();

    if (at === undefined || at <= now.getTime() || at > horizon) continue;

    const preferred =
      best === null ||
      at < best.at ||
      (at === best.at && item.kind === 'halqa' && best.item.kind !== 'halqa');

    if (preferred) {
      best = { item, at };
    }
  }

  return best?.item ?? null;
}

/** The next session, regardless of the pill's horizon. */
export function pickNextHalqa(
  items: readonly CircleItem[],
  now: Date,
): CircleItem | null {
  return pickSoonest(items, now, 'halqa');
}

/** The next exam, regardless of the pill's horizon. */
export function pickNextExam(
  items: readonly CircleItem[],
  now: Date,
): CircleItem | null {
  return pickSoonest(items, now, 'exam');
}

function pickSoonest(
  items: readonly CircleItem[],
  now: Date,
  kind: CircleItem['kind'],
): CircleItem | null {
  let best: { item: CircleItem; at: number } | null = null;

  for (const item of items) {
    if (item.kind !== kind) continue;

    const at = startsAt(item)?.getTime();

    if (at === undefined || at <= now.getTime()) continue;

    if (best === null || at < best.at) {
      best = { item, at };
    }
  }

  return best?.item ?? null;
}

/**
 * The newest notice — the rail's "latest news" row.
 *
 * A notice dated today outranks one dated yesterday; an undated notice sorts
 * last rather than first, because a row with no day cannot claim to be news.
 */
export function pickNewestNotice(
  items: readonly CircleItem[],
): CircleItem | null {
  let best: CircleItem | null = null;

  for (const item of items) {
    if (item.kind !== 'notice' || !item.date) continue;

    if (best === null || item.date > (best.date ?? '')) {
      best = item;
    }
  }

  return best;
}

/** Whole days from today to the item's day (0 = today, 1 = tomorrow). */
export function daysAway(item: CircleItem, now: Date): number | null {
  if (!item.date) return null;

  const day = parseDateKey(item.date);
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.round(
    (new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime() -
      midnight.getTime()) /
      DAY_MS,
  );
}
