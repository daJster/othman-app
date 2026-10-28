import { useTranslation } from 'react-i18next';
import { useColorScheme, View } from 'react-native';
import {
  summarizeProgress,
  type SurahProgress,
} from '@/core/domain/progress/surah-progress';
import { useDirection } from '@/i18n';
import { Card } from '@/ui/card';
import { Progress } from '@/ui/progress';
import { Text } from '@/ui/text';
import { ProgressLegend } from './progress-legend';
import { formatNumber, formatPercent } from './progress-format';

/**
 * The numbers above the heatmap.
 *
 * Three counts and an average, all derived from the same rows the grid draws —
 * a second source for "how am I doing" would eventually disagree with the
 * colours. The maths lives in `core/domain/progress` and is unit-tested there;
 * this component only formats.
 */
export type ProgressSummaryProps = {
  rows: readonly SurahProgress[];
};

export function ProgressSummary({ rows }: ProgressSummaryProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const isDark = useColorScheme() === 'dark';
  const summary = summarizeProgress(rows);
  const average = formatPercent(summary.averagePercent, language);

  return (
    <Card testID="progress-summary" className="gap-4">
      <View className="gap-2">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-0.5">
            <Text variant="overline" tone="muted">
              {t('pages.account.progress.summary.average')}
            </Text>
            <Text variant="title" testID="progress-average">
              {average}
            </Text>
          </View>
          <Text variant="caption" tone="muted" className="max-w-[50%] text-end">
            {t('pages.account.progress.subtitle')}
          </Text>
        </View>

        <Progress
          value={summary.averagePercent}
          testID="progress-average-bar"
        />
      </View>

      <View className="flex-row gap-4">
        <Stat
          testID="progress-stat:memorised"
          value={summary.memorised}
          label={t('pages.account.progress.summary.memorised')}
        />
        <Stat
          testID="progress-stat:started"
          value={summary.started}
          label={t('pages.account.progress.summary.started')}
        />
        <Stat
          testID="progress-stat:total"
          value={summary.total}
          label={t('pages.account.progress.summary.surahs')}
        />
      </View>

      <ProgressLegend
        isDark={isDark}
        lessLabel={t('pages.account.progress.legend.less')}
        moreLabel={t('pages.account.progress.legend.more')}
        className="pt-1"
      />
    </Card>
  );
}

function Stat({
  value,
  label,
  testID,
}: {
  value: number;
  label: string;
  testID?: string;
}) {
  const { language } = useDirection();

  return (
    <View className="flex-1 gap-0.5">
      <Text variant="subtitle" testID={testID}>
        {formatNumber(value, language)}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}
