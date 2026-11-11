import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import {
  summarizeProgress,
  type SurahProgress,
} from '@/core/domain/progress/surah-progress';
import {
  reviewDaysForWeek,
  totalReviews,
} from '@/features/progress/progress-activity';
import {
  formatNumber,
  formatPercent,
} from '@/features/progress/progress-format';
import { useSurahProgress } from '@/features/progress/use-surah-progress';
import { useDirection } from '@/i18n';
import { Button } from '@/ui/button';
import { cn } from '@/ui/cn';
import { Progress } from '@/ui/progress';
import { Skeleton } from '@/ui/skeleton';
import { Text } from '@/ui/text';

/**
 * The learning numbers on the Account page.
 *
 * Account used to end at the profile header, leaving most of a 1440 page empty
 * and forcing a second tap to learn anything about progress. This block puts
 * the same numbers the Progress screen computes beside the identity: overall
 * memorisation, how many surahs are finished, and how many were touched in the
 * latest recorded week. It reads from the one progress query and summarises it
 * with the same core function, so the two screens cannot disagree.
 *
 * It is a hairline block, not a card: Account keeps the profile as its one
 * surface. Loading uses skeleton bars in the final geometry rather than a
 * spinner so the page does not jump when the query resolves.
 */
export type LearningSnapshotProps = {
  onViewProgress: () => void;
  className?: string;
};

export function LearningSnapshot({
  onViewProgress,
  className,
}: LearningSnapshotProps) {
  const { t } = useTranslation();
  const { state } = useSurahProgress();

  return (
    <View
      testID="account-learning-snapshot"
      className={cn(
        'gap-3 border-b border-glass-edge py-4',
        Platform.OS !== 'web' && 'px-4',
        className,
      )}
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text variant="overline" tone="muted">
          {t('account.snapshot.title')}
        </Text>
        <Button
          variant="link"
          size="sm"
          label={t('account.snapshot.view')}
          onPress={onViewProgress}
          testID="account-snapshot-progress"
        />
      </View>

      {state.status === 'pending' ? <SnapshotSkeleton /> : null}

      {state.status === 'error' ? (
        <View className="gap-1">
          <Text variant="caption" tone="muted">
            {t('account.snapshot.error')}
          </Text>
          <Button
            variant="link"
            size="sm"
            label={t('action.retry')}
            onPress={state.retry}
            className="self-start"
          />
        </View>
      ) : null}

      {state.status === 'empty' ? (
        <Text variant="caption" tone="muted">
          {t('account.snapshot.empty')}
        </Text>
      ) : null}

      {state.status === 'ready' ? <SnapshotBody rows={state.data} /> : null}

      <Text variant="caption" tone="muted">
        {t('account.snapshot.note')}
      </Text>
    </View>
  );
}

function SnapshotBody({ rows }: { rows: readonly SurahProgress[] }) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const summary = summarizeProgress(rows);
  const week = totalReviews(reviewDaysForWeek(rows, language));

  return (
    <View className="gap-2">
      <View className="flex-row items-end justify-between gap-3">
        <View className="gap-0.5">
          <Text variant="title" testID="account-snapshot-average">
            {formatPercent(summary.averagePercent, language)}
          </Text>
          <Text variant="caption" tone="muted">
            {t('account.snapshot.average')}
          </Text>
        </View>
        <Text variant="caption" tone="muted" align="end">
          {t('account.snapshot.week', { count: week })}
        </Text>
      </View>

      <Progress value={summary.averagePercent} />

      <View className="flex-row items-center gap-6 pt-1">
        <SnapshotStat
          value={summary.memorised}
          label={t('account.snapshot.memorised')}
        />
        <SnapshotStat
          value={summary.started}
          label={t('account.snapshot.started')}
        />
      </View>
    </View>
  );
}

function SnapshotStat({ value, label }: { value: number; label: string }) {
  const { language } = useDirection();

  return (
    <View className="gap-0.5">
      <Text variant="subtitle">{formatNumber(value, language)}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

function SnapshotSkeleton() {
  const { t } = useTranslation();

  return (
    <View
      className="gap-2"
      accessibilityRole="progressbar"
      accessibilityLabel={t('action.loading')}
    >
      <View className="flex-row items-end justify-between">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-3 w-24 rounded-full" />
      </View>
      <Skeleton className="h-2 w-full rounded-full" />
      <View className="flex-row gap-6 pt-1">
        <Skeleton className="h-10 w-16 rounded-md" />
        <Skeleton className="h-10 w-16 rounded-md" />
      </View>
    </View>
  );
}
