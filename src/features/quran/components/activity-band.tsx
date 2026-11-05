import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  type ScrollViewInstance,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useDirection, type Language } from '@/i18n';
import { ButtonGroup, Button } from '@/ui/button-group';
import { Icon } from '@/ui/icon';
import { useReducedMotion } from '@/ui/motion';
import { Pressable } from '@/ui/pressable';
import { Text } from '@/ui/text';
import { ActivityGrid } from './activity-grid';
import {
  currentMonthKey,
  formatMonthRange,
  formatYearTitle,
  shiftMonthKey,
  useSpanActivity,
  YEAR_HISTORY,
  type ActivitySpan,
  type MonthKey,
} from './use-monthly-activity';

/**
 * The reading board (Section 2 of the Quran landing page).
 *
 * A `ButtonGroup` switches between two spans — Monthly (rolling 3 months) and
 * Annual (rolling 365 days) — GitHub-style: full weeks of seven rows,
 * neighbouring-month cells faded out. The header is two rows: row 1 pairs the
 * span title (left, truncated) with the summary (right) in an `ltr` row, and
 * row 2 pairs the small segment control (left) with the chevron toggles
 * (right) in an `ltr` row so the order holds in both languages, and left
 * still means older. Each span keeps its own position: Monthly pages 3
 * months over a 12-month history, Annual pages 12 months over two years.
 * Switching spans resets to the current period.
 *
 * Cells are small on purpose (28px max): a quarter no longer fits the phone
 * width, so the grid lives in a horizontal `ScrollView` pinned to the newest
 * (rightmost) end, like the old year view. The data is a seeded demo grid for
 * now (see `use-monthly-activity`); the summary counts in-span days read.
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

/** A fade-in is a mount gesture, not a state. */
const REVEAL_MS = 180;

const SPANS: ActivitySpan[] = ['monthly', 'annual'];

/** Toggle steps in months and oldest page per span. */
const SPAN_PAGING: Record<ActivitySpan, { step: number; pages: number }> = {
  monthly: { step: 3, pages: 4 },
  annual: { step: 12, pages: YEAR_HISTORY },
};

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
  const reducedMotion = useReducedMotion();
  const scroller = useRef<ScrollViewInstance | null>(null);

  const [span, setSpan] = useState<ActivitySpan>('monthly'); // Page per span from the current period: 0 is newest, negative is older.
  const [pages, setPages] = useState<Record<ActivitySpan, number>>({
    monthly: 0,
    annual: 0,
  });
  const base = useMemo(() => currentMonthKey(), []);
  const { step, pages: stops } = SPAN_PAGING[span];
  const page = pages[span];
  // Newest month of the window the toggles currently show.
  const end = shiftMonthKey(base, page * step);
  const { days, columns, weekStart } = useSpanActivity(span, end, language);

  const geometry = activityBandGeometry(width, columns);
  const reveal = reducedMotion ? undefined : FadeIn.duration(REVEAL_MS);

  const canOlder = page > -(stops - 1);
  const canNewer = page < 0;
  const title = formatSpanTitle(span, end, language);
  const spanDays = days.filter((day) => !day.outside);
  const readDays = spanDays.filter((day) => day.count > 0).length;
  // Center the grid when it fits; wider grids pin to the newest end.
  const centered = geometry.width <= geometry.available;

  // Switching spans must show the newest end at once: the scroller remounts
  // per span and re-pins on every page, so no tap is needed to reveal it.
  // `onContentSizeChange`/`onLayout` stay as the post-layout backstop.
  useEffect(() => {
    scroller.current?.scrollToEnd({ animated: false });
  }, [page, span]);

  const turn = (delta: 1 | -1) =>
    setPages((previous) => ({
      ...previous,
      [span]: Math.min(0, Math.max(-(stops - 1), previous[span] + delta)),
    }));

  const select = (next: ActivitySpan) => {
    setSpan(next);
    setPages({ monthly: 0, annual: 0 });
  };

  return (
    <View
      testID="quran-activity-band"
      className="w-full border-b border-border py-7 md:py-8"
    >
      <View>
        <Text variant="overline" tone="muted">
          {t('quran.activity.title')}
        </Text>

        <View
          className="mt-3 flex-row items-center gap-2"
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
              total: spanDays.length,
            })}
          </Text>
        </View>

        <View
          className="mt-2 flex-row items-center justify-between"
          style={{ direction: 'ltr' }}
        >
          <ButtonGroup>
            {SPANS.map((option) => (
              <Button
                key={option}
                testID={`quran-activity-span-${option}`}
                size="sm"
                variant={option === span ? 'secondary' : 'ghost'}
                accessibilityState={{ selected: option === span }}
                label={t(`quran.activity.${option}`)}
                onPress={() => select(option)}
              />
            ))}
          </ButtonGroup>
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

      <Animated.View entering={reveal} className="mt-4 w-full">
        <ScrollView
          key={`quran-activity-${span}`}
          testID="quran-activity-scroller"
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ width: '100%' }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: centered ? 'center' : 'flex-start',
          }}
          onContentSizeChange={() =>
            scroller.current?.scrollToEnd({ animated: false })
          }
          onLayout={() => scroller.current?.scrollToEnd({ animated: false })}
        >
          <ActivityGrid
            days={days}
            columns={columns}
            cellSize={geometry.cell}
            weekStart={weekStart}
            showMonthLabels={span === 'annual'}
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

function formatSpanTitle(
  span: ActivitySpan,
  end: MonthKey,
  language: Language,
): string {
  if (span === 'annual') return formatYearTitle(end, language);

  return formatMonthRange(shiftMonthKey(end, -2), end, language);
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
