import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import {
  summarizeProgress,
  type SurahProgress,
} from '@/core/domain/progress/surah-progress';
import { Card } from '@/ui/card';
import { Steps, type StepItem } from '@/ui/panel';
import { Text } from '@/ui/text';

/**
 * Memorisation milestones.
 *
 * A percentage answers "how far", but not "what next". Four fixed thresholds
 * give the student a sequence: three surahs, ten, twenty-five, fifty. The
 * current step is the first threshold not yet met; completed steps keep a
 * check, so the row reads as progress even in monochrome.
 *
 * The thresholds are deliberately about memorised surahs, not the average
 * percentage: a student who has finished forty short surahs has done more than
 * one who knows ten percent of every long surah, and the heatmap already
 * reports the averaged number.
 */
const THRESHOLDS = [3, 10, 25, 50] as const;

export type ProgressMilestonesProps = {
  rows: readonly SurahProgress[];
  className?: string;
};

export function ProgressMilestones({
  rows,
  className,
}: ProgressMilestonesProps) {
  const { t } = useTranslation();
  const summary = summarizeProgress(rows);
  const firstMissing = THRESHOLDS.findIndex(
    (threshold) => summary.memorised < threshold,
  );

  const steps: StepItem[] = THRESHOLDS.map((threshold, index) => ({
    key: String(threshold),
    label: t('pages.account.progress.milestones.step', {
      count: threshold,
    }),
    status:
      summary.memorised >= threshold
        ? 'complete'
        : index === firstMissing
          ? 'current'
          : 'upcoming',
  }));

  return (
    <Card testID="progress-milestones" className={className}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-0.5">
          <Text variant="overline" tone="muted">
            {t('pages.account.progress.milestones.title')}
          </Text>
          <Text variant="caption" tone="muted">
            {t('pages.account.progress.milestones.description')}
          </Text>
        </View>
        <Text variant="caption" tone="muted" align="end">
          {t('pages.account.progress.milestones.progress', {
            done: summary.memorised,
            total: summary.total,
          })}
        </Text>
      </View>

      <Steps steps={steps} className="pt-2" testID="progress-milestone-steps" />
    </Card>
  );
}
