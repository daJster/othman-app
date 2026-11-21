import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { api, useApiQuery } from '@/api';
import {
  isGoldenDay,
  type PracticeEntry,
} from '@/core/domain/practice/practice';
import { useDirection } from '@/i18n';
import type { SwipeDirection } from '@/ui/gestures/swipe';
import { useSwipeTransition } from '@/ui/gestures/use-swipe-transition';
import { Icon } from '@/ui/icon';
import { Pressable } from '@/ui/pressable';
import { Text } from '@/ui/text';
import { ActivityGrid } from './activity-grid';
import {
  currentMonthKey,
  formatMonthRange,
  MONTH_HISTORY,
  MONTHS_PER_PAGE,
  shiftMonthKey,
  useSpanActivity,
} from './use-monthly-activity';

/**
 * The reading board (Recent activity, on Home).
 *
 * A rolling three-month window, GitHub-style: full weeks of seven rows,
 * neighbouring-month cells faded out. The header is two rows: row 1 pairs the
 * window title (left, truncated) with the summary (right) in an `ltr` row, and
 * row 2 pairs the window length (left) with the chevron toggles (right) in an
 * `ltr` row so the order holds in both languages, and left still means older.
 * The toggles page three months at a time across a twelve-month history.
 *
 * The progress map itself accepts a physical thumb swipe: rightward moves
 * older, leftward moves newer, in both languages. The header and legend stay
 * plain; the swipe belongs to the map it changes.
 *
 * Cells are small on purpose (28px max): a three-month quarter fits the phone
 * column, so the map itself is the swipe surface rather than a nested scroller.
 * The data is a seeded demo grid for now (see `use-monthly-activity`), overlaid
 * by any stored practice day: a completed day paints gold, a partly practised
 * one keeps a reading tint. The summary counts in-window days read.
 *
 * The band sizes to its content with the page's standard section rhythm
 * (`py-7`): a top block (overline + two-row header), the grid, and the legend
 * stacked with fixed gaps. The chevron toggles meet the 44pt floor.
 *
 * The reveal is one fade of the whole grid. There is no per-cell animation and
 * no continuous motion; reduced-motion users get the final frame immediately.
 */
const GAP = 6;
const CELL_MIN = 10;
const CELL_MAX = 28;

/** `Page width="default"` is `max-w-3xl`. */
const PAGE_MAX_WIDTH = 768;
/** Tailwind's `sm`, where `Page` grows its gutter from `px-4` to `px-5`. */
const SM_BREAKPOINT = 640;
const BASE_GUTTER = 32;
const SM_GUTTER = 40;

/** Pages of three months the toggles can reach, newest first. */
const PAGE_COUNT = MONTH_HISTORY / MONTHS_PER_PAGE;

export type ActivityBandGeometry = {
  /** Width the grid may occupy inside the page column. */
  available: number;
  /** Cell edge in px. */
  cell: number;
  /** Exact grid width from its columns and gaps. */
  width: number;
};

/**
 * Cell size for the span band.
 *
 * The page column is `min(window, max-w-3xl)` minus the gutter its breakpoint
 * uses. The cell fills the column up to 28px; wider grids (the quarter, the
 * year) overflow into the band's horizontal scroll instead of shrinking past
 * the 10px floor.
 */
export function activityBandGeometry(
  windowWidth: number,
  columns: number,
): ActivityBandGeometry {
  const safeColumns = Number.isFinite(columns)
    ? Math.max(1, Math.floor(columns))
    : 1;
  const column = Math.min(Math.max(windowWidth, 0), PAGE_MAX_WIDTH);
  const gutter = windowWidth >= SM_BREAKPOINT ? SM_GUTTER : BASE_GUTTER;
  const available = Math.max(0, column - gutter);
  const raw = (available - (safeColumns - 1) * GAP) / safeColumns;
  const cell = Math.min(
    CELL_MAX,
    Math.max(CELL_MIN, Math.floor(raw * 100) / 100),
  );
  const width = safeColumns * cell + (safeColumns - 1) * GAP;

  return { available, cell, width };
}

export function ActivityBand() {
  const { t } = useTranslation();
  const { language } = useDirection();
  const { width } = useWindowDimensions();

  const [page, setPage] = useState(0); // 0 is newest; negative is older.
  const base = useMemo(() => currentMonthKey(), []);
  // Newest month of the window the toggles currently show.
  const end = shiftMonthKey(base, page * MONTHS_PER_PAGE);
  const gridWindow = useSpanActivity(end, language);
  const practice = useApiQuery(api.practice.history);

  /*
   * The demo grid supplies the reading levels; the practice row overlays the
   * days it actually knows about. A day whose four gauges are all full paints
   * gold; a partly practised day keeps a reading-level tint. No stored day is
   * touched, so the seed still fills the rest of the window.
   */
  const days = useMemo(() => {
    const byDay = new Map<string, PracticeEntry>(
      (practice.data ?? []).map((entry) => [entry.day, entry]),
    );

    return gridWindow.days.map((day) => {
      const entry = byDay.get(day.day);

      if (!entry) return day;

      const golden = isGoldenDay(entry);

      return {
        ...day,
        count: entry.pages,
        level: (golden ? 4 : entry.pages > 0 ? 1 : 0) as 0 | 1 | 2 | 3 | 4,
        golden,
      };
    });
  }, [gridWindow.days, practice.data]);
  const { columns, weekStart } = gridWindow;

  const geometry = activityBandGeometry(width, columns);

  const canOlder = page > -(PAGE_COUNT - 1);
  const canNewer = page < 0;
  const title = formatMonthRange(shiftMonthKey(end, -2), end, language);
  const windowDays = days.filter((day) => !day.outside);
  const readDays = windowDays.filter((day) => day.count > 0).length;
  // Center the grid when it fits; wider grids pin to the newest end.
  const centered = geometry.width <= geometry.available;

  const turn = (delta: 1 | -1) =>
    setPage((previous) =>
      Math.min(0, Math.max(-(PAGE_COUNT - 1), previous + delta)),
    );

  /*
   * The thumb owns the physical direction: left-to-right is backward/older,
   * right-to-left is forward/newer, in every language. The grid keeps its own
   * horizontal scroller untouched; only the header and legend page the window.
   */
  const onSwipe = (direction: SwipeDirection) => {
    if (direction === 'right' && canOlder) turn(-1);
    if (direction === 'left' && canNewer) turn(1);
  };
  const swipe = useSwipeTransition({
    onSwipe,
    transitionKey: page,
    enabled: canOlder || canNewer,
    allowedDirections: { left: canNewer, right: canOlder },
    testID: 'quran-activity-swipe',
  });

  return (
    <View testID="quran-activity-band" className="w-full py-7 md:py-8">
      <View>
        <Text variant="overline" tone="muted">
          {t('quran.activity.title')}
        </Text>

        <View
          className="mt-3 flex-row flex-wrap items-center gap-2"
          style={{ direction: 'ltr' }}
        >
          <Text
            testID="quran-activity-title"
            variant="label"
            numberOfLines={1}
            className="min-w-0 flex-1"
          >
            {title}
          </Text>
          <Text
            testID="quran-activity-summary"
            variant="caption"
            tone="muted"
            className="shrink-0"
          >
            {t('quran.activity.summary', {
              read: readDays,
              total: windowDays.length,
            })}
          </Text>
        </View>

        <View
          className="mt-1 flex-row items-center justify-end"
          style={{ direction: 'ltr' }}
        >
          <View className="flex-row items-center gap-1.5">
            <Pressable
              testID="quran-activity-prev"
              accessibilityRole="button"
              accessibilityLabel={t('meeting.calendar.previous')}
              accessibilityState={{ disabled: !canOlder }}
              disabled={!canOlder}
              onPress={() => turn(-1)}
              className="h-11 w-11 items-center justify-center rounded-md active:opacity-70 disabled:opacity-40"
            >
              <Icon
                name="chevron-left"
                size={18}
                tone={canOlder ? 'foreground' : 'muted'}
              />
            </Pressable>
            <Pressable
              testID="quran-activity-next"
              accessibilityRole="button"
              accessibilityLabel={t('meeting.calendar.next')}
              accessibilityState={{ disabled: !canNewer }}
              disabled={!canNewer}
              onPress={() => turn(1)}
              className="h-11 w-11 items-center justify-center rounded-md active:opacity-70 disabled:opacity-40"
            >
              <Icon
                name="chevron-right"
                size={18}
                tone={canNewer ? 'foreground' : 'muted'}
              />
            </Pressable>
          </View>
        </View>
      </View>

      <View
        testID="quran-activity-map"
        className="mt-4 w-full"
        style={{ alignItems: centered ? 'center' : 'flex-start' }}
      >
        <GestureDetector gesture={swipe.gesture}>
          <Animated.View style={swipe.style}>
            <ActivityGrid
              days={days}
              columns={columns}
              cellSize={geometry.cell}
              weekStart={weekStart}
            />
          </Animated.View>
        </GestureDetector>
      </View>

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
