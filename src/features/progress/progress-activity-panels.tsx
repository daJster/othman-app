import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import {
  bandOf,
  type SurahProgress,
} from '@/core/domain/progress/surah-progress';
import { parseDateKey } from '@/core/domain/meetings/date-key';
import { useDirection } from '@/i18n';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { Icon } from '@/ui/icon';
import {
  LiveLinechart,
  WeekStrip,
  type LineChartPoint,
  type WeekStripDay,
} from '@/ui/panel';
import { Pressable } from '@/ui/pressable';
import { Text } from '@/ui/text';
import {
  recentReviews,
  reviewDaysForWeek,
  reviewTrend,
  totalReviews,
} from './progress-activity';
import {
  formatActivityDay,
  formatNumber,
  formatPercent,
  formatShortDay,
  formatWeekdayShort,
} from './progress-format';
import { bandBadgeVariant, bandLabelKey } from './surah-band';

/**
 * The three activity surfaces on Progress.
 *
 * All three are derived from the same `lastReviewed` dates, so a week cell,
 * a point on the line and a row in the recent list always describe the same
 * review. The panels are separate components only so the screen can choose
 * which two to place on the Activity section without re-deriving the maths.
 */

export type ReviewActivityProps = {
  rows: readonly SurahProgress[];
};

export function ReviewWeekPanel({ rows }: ReviewActivityProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const days = reviewDaysForWeek(rows, language);
  const total = totalReviews(days);
  const strip: WeekStripDay[] = days.map((day) => ({
    key: day.day,
    label: formatWeekdayShort(day.date, language),
    count: day.count,
    level: day.level,
    accessibilityLabel: t('pages.account.progress.week.dayA11y', {
      date: formatShortDay(day.date, language),
      count: day.count,
    }),
  }));
  const weekLabel = days[0] ? formatShortDay(days[0].date, language) : '';

  return (
    <Card testID="progress-week-panel" className="gap-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-0.5">
          <Text variant="overline" tone="muted">
            {t('pages.account.progress.week.title')}
          </Text>
          <Text variant="caption" tone="muted">
            {t('pages.account.progress.week.weekOf', { date: weekLabel })}
          </Text>
        </View>
        <Text variant="label" tone="muted" align="end">
          {t('pages.account.progress.week.summary', { count: total })}
        </Text>
      </View>

      <WeekStrip days={strip} testID="progress-week-strip" className="pt-1" />
    </Card>
  );
}

export function ReviewTrendPanel({ rows }: ReviewActivityProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const weeks = reviewTrend(rows, language, 8);
  const total = weeks.reduce((sum, week) => sum + week.count, 0);
  const data: LineChartPoint[] = weeks.map((week) => ({
    label: formatShortDay(parseDateKey(week.anchor), language),
    value: week.count,
    accessibilityLabel: t('pages.account.progress.trend.pointA11y', {
      week: formatShortDay(parseDateKey(week.start), language),
      count: week.count,
    }),
  }));

  return (
    <Card testID="progress-trend-panel" className="gap-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-0.5">
          <Text variant="overline" tone="muted">
            {t('pages.account.progress.trend.title')}
          </Text>
          <Text variant="caption" tone="muted">
            {t('pages.account.progress.trend.subtitle', { weeks: 8 })}
          </Text>
        </View>
        <Text variant="label" tone="muted" align="end">
          {t('pages.account.progress.trend.total', { count: total })}
        </Text>
      </View>

      <LiveLinechart
        testID="progress-trend-chart"
        data={data}
        height={132}
        emptyLabel={t('pages.account.progress.trend.empty')}
        accessibilityLabel={t('pages.account.progress.trend.a11y', {
          count: total,
          weeks: 8,
        })}
      />
    </Card>
  );
}

export type RecentReviewsProps = ReviewActivityProps & {
  onSelect: (surahNumber: number) => void;
  onViewAll: () => void;
};

export function RecentReviews({
  rows,
  onSelect,
  onViewAll,
}: RecentReviewsProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const reviews = recentReviews(rows, 5);

  return (
    <View testID="progress-recent" className="gap-2">
      <Text variant="overline" tone="muted">
        {t('pages.account.progress.recent.title')}
      </Text>

      {reviews.length === 0 ? (
        <Text variant="caption" tone="muted">
          {t('pages.account.progress.recent.empty')}
        </Text>
      ) : (
        <View>
          {reviews.map((row) => {
            const band = bandOf(row.percent);

            return (
              <Pressable
                key={row.surahNumber}
                testID={`recent-review:${row.surahNumber}`}
                accessibilityRole="button"
                accessibilityLabel={t('pages.account.progress.recent.rowA11y', {
                  number: formatNumber(row.surahNumber, language),
                  percent: formatPercent(row.percent, language),
                })}
                onPress={() => onSelect(row.surahNumber)}
                className={cn(
                  'min-h-14 flex-row items-center gap-3 border-b border-border py-2.5 active:opacity-70',
                  FOCUS_RING,
                )}
              >
                <Text
                  variant="label"
                  className="w-10 text-center font-semibold"
                >
                  {formatNumber(row.surahNumber, language)}
                </Text>

                <View className="min-w-0 flex-1 gap-0.5">
                  <Text variant="label">
                    {t('pages.account.progress.surah', {
                      number: formatNumber(row.surahNumber, language),
                    })}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {row.lastReviewed
                      ? formatActivityDay(row.lastReviewed, language)
                      : ''}
                  </Text>
                </View>

                <Badge
                  variant={bandBadgeVariant(band)}
                  label={t(bandLabelKey(band))}
                />

                <Icon name="chevron-right" size={16} tone="muted" />
              </Pressable>
            );
          })}
        </View>
      )}

      <Button
        variant="link"
        size="sm"
        label={t('pages.account.progress.recent.all')}
        onPress={onViewAll}
        className="self-start"
        accessibilityLabel={t('pages.account.progress.recent.all')}
      />
    </View>
  );
}
