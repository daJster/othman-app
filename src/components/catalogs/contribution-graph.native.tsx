/**
 * Native port of `contribution-graph.web.tsx` (shadcnblocks/contribution-graph)
 * for iOS and Android.
 *
 * The catalog original is an SVG calendar built on `date-fns` and DOM props; a
 * native port cannot share that markup, and the reading log already supplies
 * plain day/count pairs. This file therefore keeps the *look* — a grid of
 * 7-row columns, one column per week, the five-step accent ramp — and drops the
 * month labels, the hover tooltips and the composed sub-components.
 *
 * Shape of the data: `weeks` is a flat list of days, oldest first. The newest
 * `columns * 7` entries are kept and aligned to their weekday column, so a
 * short log front-pads the first week and a log that ends mid-week leaves the
 * rest of the final week blank rather than shifting every row. A short log
 * therefore reads as empty weeks before the first entry, which is the same
 * story GitHub's graph tells a new account.
 *
 * Colour is the token ramp from the design brief, not a computed colour ramp:
 * `muted` for a day with nothing read, then `primary` at 25/45/65/100 % for the
 * four intensity steps. The activity band now uses a binary goal and supplies
 * `level` directly (0 or 4); the count ramp remains the fallback for plain
 * day/count data. The class strings have to stay literal — a Tailwind scanner
 * cannot see a concatenated class name.
 */
import { View } from 'react-native';

const GAP = 3;
const ROWS = 7;
const DEFAULT_COLUMNS = 14;
const DEFAULT_CELL = 10;

export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

/** 0, 1–2, 3–5, 6–9, 10+ pages read when no level is supplied. */
const RAMP: Record<ContributionLevel, string> = {
  0: 'bg-muted',
  1: 'bg-primary/25',
  2: 'bg-primary/45',
  3: 'bg-primary/65',
  4: 'bg-primary',
};

export type ContributionDay = {
  /** ISO day (`YYYY-MM-DD`), used verbatim in the accessibility label. */
  day: string;
  count: number;
  /** Pre-computed accent step. Falls back to the count ramp when omitted. */
  level?: ContributionLevel;
  /** A cell from the neighbouring month, shown faded. */
  outside?: boolean;
  /** Localised label. Falls back to `day: count` when omitted. */
  accessibilityLabel?: string;
};

export type ContributionGraphProps = {
  /** Days read, oldest first. */
  weeks: ContributionDay[];
  /** Number of week columns. Defaults to 14 weeks. */
  columns?: number;
  /** Cell edge in px. The band sizes this so 53 columns fill the page. */
  cellSize?: number;
  /** First day of the week column, Sunday = 0. Defaults to Sunday. */
  weekStart?: number;
  /** Gap between cells in px. Defaults to 3. */
  gap?: number;
  /** Rounded-corner class for a cell. Literal for the Tailwind scanner. */
  radiusClass?: string;
};

function levelFor(count: number): ContributionLevel {
  if (!Number.isFinite(count) || count <= 0) {
    return 0;
  }

  if (count <= 2) {
    return 1;
  }

  if (count <= 5) {
    return 2;
  }

  if (count <= 9) {
    return 3;
  }

  return 4;
}

/**
 * Weekday of a day key, Sunday = 0.
 *
 * Parsed from the local calendar parts, not `new Date(key)`: a `YYYY-MM-DD`
 * string is UTC in JavaScript and would move one row for anyone west of UTC.
 * Noon keeps the day through a DST transition.
 */
function weekdayOf(day: string): number {
  const [year, month, date] = day.split('-').map(Number);

  if (!year || !month || !date) {
    return 0;
  }

  return new Date(year, month - 1, date, 12).getDay();
}

/**
 * The visible cells, oldest first, padded to complete weeks.
 *
 * `columns * 7` is the capacity. The tail of the log is kept, the first cell is
 * pushed to its weekday, and any remaining capacity after today is left blank.
 * When the input already fills the grid there is no room to shift it, so it is
 * used as-is; the band always passes fewer days than the capacity.
 */
function cellsFor(
  weeks: readonly ContributionDay[],
  cellCount: number,
  weekStart: number,
): (ContributionDay | undefined)[] {
  const days = weeks.slice(-cellCount);
  const rawLead =
    days.length === 0 ? 0 : (weekdayOf(days[0].day) - weekStart + 7) % 7;
  const lead = Math.min(rawLead, cellCount - days.length);
  const cells: (ContributionDay | undefined)[] = [
    ...new Array<undefined>(lead).fill(undefined),
    ...days,
  ];

  while (cells.length < cellCount) {
    cells.push(undefined);
  }

  return cells;
}

export default function ContributionGraph({
  weeks,
  columns = DEFAULT_COLUMNS,
  cellSize = DEFAULT_CELL,
  weekStart = 0,
  gap = GAP,
  radiusClass = 'rounded-[2px]',
}: ContributionGraphProps) {
  const columnCount = Number.isFinite(columns)
    ? Math.max(1, Math.floor(columns))
    : DEFAULT_COLUMNS;
  const cell = Number.isFinite(cellSize) ? Math.max(1, cellSize) : DEFAULT_CELL;
  const start = Number.isFinite(weekStart)
    ? ((Math.floor(weekStart) % 7) + 7) % 7
    : 0;
  const cells = cellsFor(weeks, columnCount * ROWS, start);

  return (
    <View className="flex-row" style={{ gap }}>
      {new Array(columnCount).fill(undefined).map((_, columnIndex) => (
        <View
          // Columns have no identity of their own; index is the week offset.
          key={columnIndex}
          className="flex-col"
          style={{ gap }}
        >
          {cells
            .slice(columnIndex * ROWS, columnIndex * ROWS + ROWS)
            .map((entry, rowIndex) =>
              entry ? (
                <View
                  key={entry.day}
                  testID="contribution-cell"
                  accessible
                  accessibilityLabel={
                    entry.accessibilityLabel ?? `${entry.day}: ${entry.count}`
                  }
                  className={`${radiusClass} ${RAMP[entry.level ?? levelFor(entry.count)]}${entry.outside ? 'opacity-30' : ''}`}
                  style={{ width: cell, height: cell }}
                />
              ) : (
                <View
                  key={`empty-${columnIndex}-${rowIndex}`}
                  testID="contribution-cell"
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  className={`${radiusClass} bg-transparent`}
                  style={{ width: cell, height: cell }}
                />
              ),
            )}
        </View>
      ))}
    </View>
  );
}
