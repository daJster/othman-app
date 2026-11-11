import type { DateKey } from '@/core/types';

/**
 * The circle's demo content model.
 *
 * One store feeds three surfaces: the bell's inbox, the newest-news row and the
 * pinned pill's "next" line. They read the same rows through different
 * projections, so the page can never say two things about the same session.
 *
 * Everything here is still demo data. It is shaped like the eventual Firestore
 * record so swapping the repository does not touch a component, and it is
 * deliberately *relative* to today (the repository turns `dayOffset` into a
 * real day) so the demo never goes stale the way a hard-coded April date does.
 *
 * `href` is a plain string, not the route union: `services/` sits below the UI
 * layer and may not import the navigator. The link surface narrows it with
 * `isAppHref` before rendering.
 */

export type CircleKind = 'halqa' | 'exam' | 'notice';

/** Where a notice comes from. The rail row shows the topic as an overline. */
export type NoticeTopic = 'shaykh' | 'halqa' | 'app';

/** Both languages live in the record; the render picks one. */
export type Localized = {
  readonly ar: string;
  readonly en: string;
};

export type CircleItem = {
  readonly id: string;
  readonly kind: CircleKind;
  /** Local calendar day, or `null` for an undated notice. */
  readonly date: DateKey | null;
  /** Local wall-clock `HH:mm`, or `null` when the item has no time. */
  readonly time: string | null;
  readonly title: Localized;
  readonly body: Localized;
  /** One supporting line: the shaykh, the scope, the author. */
  readonly meta: Localized | null;
  /** Notices only; `null` on sessions and exams. */
  readonly topic: NoticeTopic | null;
  /** Where tapping the row goes. `null` means "expand in place". */
  readonly href: string | null;
};

export interface CircleRepository {
  list(): Promise<CircleItem[]>;
}

export interface CircleService {
  /** Cache-first; one read per app session. */
  list(): Promise<CircleItem[]>;
  /** Drop the cache (pull-to-refresh, sign-out). */
  invalidate(): void;
}
