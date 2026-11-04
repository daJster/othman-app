import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  type ScrollViewInstance,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { formatDateKey } from '@/core/domain/meetings/date-key';
import type { ReadingEntry } from '@/core/domain/quran/reading-log';
import { useReadingLog } from '@/features/quran/history/use-reading-log';
import { useReducedMotion } from '@/ui/motion';
import { Text } from '@/ui/text';
import { ActivityGrid, type ActivityDay } from './activity-grid';

/**
 * The shape of the last year of reading.
 *
 * Fifty-three week columns, one cell per calendar day, oldest on the left and
 * today in the last column. The goal is binary — one page — so the board is a
 * year of "read / did not read" rather than a heat ramp; the legend says the
 * same thing in two swatches.
 *
 * The band is full-width inside the page column. From `md` the cell is computed
 * so `53 * cell + 52 * 3` fills the column exactly; on a phone the minimum
 * 10px cell makes the year wider than the screen, so the grid lives in a
 * horizontal `ScrollView` that starts at the newest (rightmost) column. The
 * scroll is inside the band: the page itself never scrolls sideways.
 *
 * The reveal is one fade of the whole grid. There is no per-cell animation and
 * no continuous motion; reduced-motion users get the final frame immediately.
 */
const DAYS = 365;
const COLUMNS = 53;
const GAP = 3;
const CELL_MIN = 10;
const CELL_MAX = 14;

/** `Page width="default"` is `max-w-3xl`. */
const PAGE_MAX_WIDTH = 768;
/** Tailwind's `sm`, where `Page` grows its gutter from `px-4` to `px-5`. */
const SM_BREAKPOINT = 640;
const BASE_GUTTER = 32;
const SM_GUTTER = 40;

/** The scroll begins at today, and a fade-in is a mount gesture, not a state. */
const REVEAL_MS = 180;

export type ActivityBandGeometry = {
  /** Width the grid may occupy inside the page column. */
  available: number;
  /** Cell edge in px. */
  cell: number;
  /** Exact grid width from 53 cells and 52 gaps. */
  width: number;
};

/**
 * Cell size for the year band.
 *
 * The page column is `min(window, max-w-3xl)` minus the gutter its breakpoint
 * uses. Cell size is fractional on purpose: 728px cannot hold 53 whole cells at
 * this gap, and rounding down to 10 would leave 42px of dead space. Flooring to
 * two decimals keeps the grid from ever being wider than its column.
 */
export function activityBandGeometry(
  windowWidth: number,
): ActivityBandGeometry {
  const column = Math.min(Math.max(windowWidth, 0), PAGE_MAX_WIDTH);
  const gutter = windowWidth >= SM_BREAKPOINT ? SM_GUTTER : BASE_GUTTER;
  const available = Math.max(0, column - gutter);
  const raw = (available - (COLUMNS - 1) * GAP) / COLUMNS;
  const cell = Math.min(
    CELL_MAX,
    Math.max(CELL_MIN, Math.floor(raw * 100) / 100),
  );
  const width = COLUMNS * cell + (COLUMNS - 1) * GAP;

  return { available, cell, width };
}

export function ActivityBand() {
  const { t } = useTranslation();
  const { entries } = useReadingLog();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const scroller = useRef<ScrollViewInstance | null>(null);

  const days = useMemo(() => recentActivity(entries), [entries]);
  const geometry = activityBandGeometry(width);
  const reveal = reducedMotion ? undefined : FadeIn.duration(REVEAL_MS);

  return (
    <View
      testID="quran-activity-band"
      className="w-full border-b border-border py-7 md:py-8"
    >
      <Text variant="overline" tone="muted">
        {t('quran.activity.title')}
      </Text>

      <Animated.View entering={reveal} className="mt-4 w-full">
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ width: '100%' }}
          onContentSizeChange={() =>
            scroller.current?.scrollToEnd({ animated: false })
          }
          onLayout={() => scroller.current?.scrollToEnd({ animated: false })}
        >
          <ActivityGrid
            days={days}
            columns={COLUMNS}
            cellSize={geometry.cell}
          />
        </ScrollView>
      </Animated.View>

      <View className="mt-3 flex-row flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <LegendSwatch className="bg-primary" label={t('quran.activity.met')} />
        <LegendSwatch className="bg-muted" label={t('quran.activity.missed')} />
      </View>
    </View>
  );
}

function LegendSwatch({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`h-2.5 w-2.5 rounded-[2px] ${className}`} />
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

/**
 * One entry per day in the window, oldest first.
 *
 * A full window is built from the calendar rather than from the log so the
 * newest day is always in the last cell and the grid keeps its width before the
 * log is long enough to fill it. Noon avoids a DST edge landing on the previous
 * day when the clock moves.
 */
function recentActivity(entries: readonly ReadingEntry[]): ActivityDay[] {
  const counts = new Map(
    entries.map((entry) => [entry.day, entry.readPages.length]),
  );
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  return Array.from({ length: DAYS }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (DAYS - 1 - index));
    const day = formatDateKey(date);
    const count = counts.get(day) ?? 0;

    return { day, count, level: count >= 1 ? 4 : 0 };
  });
}
