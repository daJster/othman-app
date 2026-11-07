'use client';

import { useMemo } from 'react';
import type { Day as WeekDay } from 'date-fns';
import {
  type Activity,
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
} from '@/components/catalogs/contribution-graph.web';
import { useDirection } from '@/i18n';
import {
  formatDayLabel,
  formatMonthShort,
  type MonthlyActivity,
} from './use-monthly-activity';

/**
 * The reading-activity board, on the web catalog calendar.
 *
 * `days` already arrives oldest-first and padded to full weeks, so the adapter
 * only has to translate it into the catalog's `Activity` shape. The cell size
 * is computed by the band from the page column; the catalog's own horizontal
 * overflow is disabled so the band owns the scroll position on both platforms.
 *
 * Month labels are visible in Annual only (`showMonthLabels`); the Monthly
 * band header already names the month — and the week start follows the
 * language (Saturday for Arabic, Monday otherwise). Neighbouring-month cells
 * render faded and carry the same localized `date: count` accessible name as
 * native.
 */
export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export type ActivityDay = {
  /** ISO day (`YYYY-MM-DD`), oldest first. */
  day: string;
  /** Distinct pages read that day. */
  count: number;
  /** Intensity step, 0 for nothing read up to 4 for a full day. */
  level: ActivityLevel;
  /** A cell from the neighbouring month, shown faded. */
  outside?: boolean;
};

export type ActivityGridProps = {
  /** Days read, oldest first, padded to full weeks. */
  days: ActivityDay[];
  /** Number of week columns; `days.length` is `columns * 7`. */
  columns: number;
  /** Cell edge in px, sized by the band to the page column. */
  cellSize: number;
  /** First day of the week column. */
  weekStart?: MonthlyActivity['weekStart'];
  /** Abbreviated month labels above the graph; Annual only. */
  showMonthLabels?: boolean;
};

/**
 * Every level shares one class; `global.css` paints `.activity-cell` per
 * `data-level` in plain CSS, because Uniwind's native serializer cannot
 * serialize `data-[level]:fill-*` selectors (it skips them with an
 * export-time error on native builds, where this web-only file never ships).
 */
const CELL_CLASS = 'activity-cell';

export function ActivityGrid({
  days,
  columns,
  cellSize,
  weekStart = 1,
  showMonthLabels = false,
}: ActivityGridProps) {
  const { language } = useDirection();

  // Fixed year avoids DST edges; mirrors the previous implementation.
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, m) =>
        formatMonthShort(`2026-${String(m + 1).padStart(2, '0')}-01`, language),
      ),
    [language],
  );

  const data = useMemo<Activity[]>(() => {
    const columnCount = Number.isFinite(columns)
      ? Math.max(1, Math.floor(columns))
      : 1;

    return days
      .slice(-columnCount * 7)
      .map(({ day, count, level }) => ({ date: day, count, level }));
  }, [columns, days]);

  const meta = useMemo(
    () => new Map(days.map((day) => [day.day, day])),
    [days],
  );

  // The band always supplies a full window, but an empty array must not throw:
  // the catalog itself returns null for it, and so does this adapter.
  if (data.length === 0) return null;

  return (
    <ContributionGraph
      blockMargin={6}
      blockRadius={5}
      blockSize={cellSize}
      className="max-w-none"
      data={data}
      fontSize={12}
      labels={{ months }}
      weekStart={weekStart as WeekDay}
    >
      <ContributionGraphCalendar
        hideMonthLabels={!showMonthLabels}
        className="overflow-visible"
      >
        {({ activity, dayIndex, weekIndex }) => (
          <ContributionGraphBlock
            activity={activity}
            aria-label={`${formatDayLabel(activity.date, language)}: ${activity.count}`}
            className={`${CELL_CLASS}${meta.get(activity.date)?.outside ? 'opacity-30' : ''}`}
            dayIndex={dayIndex}
            weekIndex={weekIndex}
          />
        )}
      </ContributionGraphCalendar>
    </ContributionGraph>
  );
}
