import ContributionGraph from '@/components/catalogs/contribution-graph.native';

/**
 * The reading-activity board, as a native week grid.
 *
 * The catalog port owns the seven-row columns and the accent ramp; this adapter
 * only names the app's data shape. Its web twin (`activity-grid.web.tsx`) maps
 * the same days onto the catalog's `Activity` calendar, so the band renders on
 * both platforms from one API.
 *
 * The day's goal is one page, so the level is binary: 4 when the goal was met,
 * 0 when it was not. The catalog still understands its five-step ramp; the band
 * simply never asks for the middle steps.
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

export function ActivityGrid({ days, columns, cellSize }: ActivityGridProps) {
  return (
    <ContributionGraph weeks={days} columns={columns} cellSize={cellSize} />
  );
}
