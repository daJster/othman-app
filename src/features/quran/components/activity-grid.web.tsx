'use client';

import { useMemo } from 'react';
import {
  type Activity,
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
} from '@/components/catalogs/contribution-graph.web';
import { useDirection, type Language } from '@/i18n';

/**
 * The reading-activity board, on the web catalog calendar.
 *
 * `days` already arrives oldest-first and padded with zero-count days, so the
 * adapter only has to translate it into the catalog's `Activity` shape and keep
 * the newest `columns * 7` entries. The intensity is binary — the goal is one
 * page — so the band maps a met day to level 4 and a missed day to level 0;
 * the catalog's five-step ramp stays intact but only its ends are used.
 *
 * The cell size is computed by the band from the page column, not fixed here:
 * a 53-column year has to fill `max-w-3xl` at `md` and scroll on a phone. The
 * catalog's own horizontal overflow is disabled so the band's single
 * `ScrollView` owns the scroll position on both platforms.
 *
 * Month labels come from `Intl` rather than the catalog's English defaults, so
 * an Arabic page does not print "Jan" under the grid.
 */
export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export type ActivityDay = {
  /** ISO day (`YYYY-MM-DD`), oldest first. */
  day: string;
  /** Distinct pages read that day. */
  count: number;
  /** 4 when at least one page was read, 0 otherwise. */
  level: ActivityLevel;
};

export type ActivityGridProps = {
  /** Days read, oldest first. */
  days: ActivityDay[];
  /** Number of week columns. */
  columns: number;
  /** Cell edge in px, sized by the band to the page column. */
  cellSize: number;
};

const BLOCK_RAMP: Record<ActivityLevel, string> = {
  0: 'data-[level="0"]:fill-muted',
  1: 'data-[level="1"]:fill-primary/25',
  2: 'data-[level="2"]:fill-primary/45',
  3: 'data-[level="3"]:fill-primary/65',
  4: 'data-[level="4"]:fill-primary',
};

function monthLabels(language: Language): string[] {
  const format = new Intl.DateTimeFormat(language, { month: 'short' });

  return Array.from({ length: 12 }, (_, month) =>
    format.format(new Date(2026, month, 1)),
  );
}

export function ActivityGrid({ days, columns, cellSize }: ActivityGridProps) {
  const { language } = useDirection();

  const data = useMemo<Activity[]>(() => {
    const columnCount = Number.isFinite(columns)
      ? Math.max(1, Math.floor(columns))
      : 1;

    return days
      .slice(-columnCount * 7)
      .map(({ day, count, level }) => ({ date: day, count, level }));
  }, [columns, days]);

  const labels = useMemo(() => ({ months: monthLabels(language) }), [language]);

  // The band always supplies a full window, but an empty array must not throw:
  // the catalog itself returns null for it, and so does this adapter.
  if (data.length === 0) return null;

  return (
    <ContributionGraph
      blockMargin={3}
      blockRadius={2}
      blockSize={cellSize}
      className="max-w-none"
      data={data}
      fontSize={12}
      labels={labels}
    >
      <ContributionGraphCalendar className="overflow-visible">
        {({ activity, dayIndex, weekIndex }) => (
          <ContributionGraphBlock
            activity={activity}
            aria-label={`${activity.date}: ${activity.count}`}
            className={BLOCK_RAMP[activity.level as ActivityLevel]}
            dayIndex={dayIndex}
            weekIndex={weekIndex}
          />
        )}
      </ContributionGraphCalendar>
    </ContributionGraph>
  );
}
