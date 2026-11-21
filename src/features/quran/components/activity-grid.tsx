import { useMemo } from 'react';
import ContributionGraph from '@/components/catalogs/contribution-graph.native';
import { useDirection } from '@/i18n';
import { formatDayLabel, type SpanActivity } from './use-monthly-activity';

/**
 * The reading-activity board, as a native week grid.
 *
 * The catalog port owns the seven-row columns and the accent ramp; this adapter
 * only names the app's data shape. Its web twin (`activity-grid.web.tsx`) maps
 * the same days onto the catalog's `Activity` calendar, so the band renders on
 * both platforms from one API.
 *
 * The band shows the rolling three-month window with a five-step demo ramp
 * (0–4); the label each cell exposes is the localized day plus its page count.
 * The band header names the window, so the grid draws no month labels of its
 * own.
 */
export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export type ActivityDay = {
  /** ISO day (`YYYY-MM-DD`), oldest first. */
  day: string;
  /** Distinct pages read that day. */
  count: number;
  /** Intensity step, 0 for nothing read up to 4 for a full day. */
  level: ActivityLevel;
  /** The day's practice is complete: a golden cell. */
  golden?: boolean;
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
  /** First day of the week column, Sunday = 0. */
  weekStart?: SpanActivity['weekStart'];
};

export function ActivityGrid({
  days,
  columns,
  cellSize,
  weekStart = 1,
}: ActivityGridProps) {
  const { language } = useDirection();

  const weeks = useMemo(
    () =>
      days.map((entry) => ({
        ...entry,
        accessibilityLabel: `${formatDayLabel(entry.day, language)}: ${entry.count}`,
      })),
    [days, language],
  );

  return (
    <ContributionGraph
      weeks={weeks}
      columns={columns}
      cellSize={cellSize}
      weekStart={weekStart}
      gap={6}
      radiusClass="rounded-[6px]"
    />
  );
}
