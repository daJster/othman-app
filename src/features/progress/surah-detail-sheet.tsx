import { ThemedBottomSheet } from '@/ui/themed-bottom-sheet';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import {
  bandOf,
  type SurahProgress,
} from '@/core/domain/progress/surah-progress';
import { useDirection } from '@/i18n';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Progress } from '@/ui/progress';
import { NativeSheetContent } from '@/ui/native-sheet-content';
import { Text } from '@/ui/text';
import { bandBadgeVariant, bandLabelKey } from './surah-band';
import {
  formatNumber,
  formatPercent,
  formatReviewedDate,
} from './progress-format';

/**
 * Detail sheet for one surah.
 *
 * A phone has no hover, so the web's tooltip became a sheet: the grid gives the
 * overview, tapping a cell answers "which surah, how far, when". The sheet is
 * `@expo/ui`'s native bottom sheet so it gets the platform's drag, backdrop and
 * back-button behaviour for free.
 *
 * `row === null` closes it. Rendering the component unconditionally (rather than
 * mounting it on selection) keeps the native sheet's presentation animated
 * instead of popping into existence.
 */
export type SurahDetailSheetProps = {
  row: SurahProgress | null;
  onClose: () => void;
};

export function SurahDetailSheet({ row, onClose }: SurahDetailSheetProps) {
  const { t } = useTranslation();
  const { language } = useDirection();

  return (
    <ThemedBottomSheet
      isPresented={row !== null}
      onDismiss={onClose}
      testID="surah-detail-sheet"
    >
      {row ? (
        <NativeSheetContent>
          <View className="gap-4 p-4">
            <View className="flex-row items-center justify-between gap-2">
              <Text variant="title">
                {t('pages.account.progress.surah', {
                  number: formatNumber(row.surahNumber, language),
                })}
              </Text>
              <Badge
                variant={bandBadgeVariant(bandOf(row.percent))}
                label={t(bandLabelKey(bandOf(row.percent)))}
              />
            </View>

            <View className="gap-1.5">
              <View className="flex-row items-baseline justify-between gap-2">
                <Text variant="subtitle">
                  {formatPercent(row.percent, language)}
                </Text>
                <Text variant="caption" tone="muted">
                  {t('pages.account.progress.detail.memorised')}
                </Text>
              </View>
              <Progress
                value={row.percent}
                testID="surah-detail-bar"
                accessibilityLabel={t('pages.account.progress.surah', {
                  number: formatNumber(row.surahNumber, language),
                })}
              />
            </View>

            <Text variant="caption" tone="muted">
              {row.lastReviewed
                ? t('pages.account.progress.detail.lastReviewed', {
                    date: formatReviewedDate(row.lastReviewed, language),
                  })
                : t('pages.account.progress.detail.neverReviewed')}
            </Text>

            <Button
              label={t('action.close')}
              onPress={onClose}
              testID="surah-detail-close"
            />
          </View>
        </NativeSheetContent>
      ) : null}
    </ThemedBottomSheet>
  );
}
