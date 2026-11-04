import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { isPageInEdition, quranPageImageUrl } from '@/core/domain/quran/page';
import { useDirection } from '@/i18n';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Pressable } from '@/ui/pressable';
import { Text } from '@/ui/text';
import { formatReaderNumber } from '../format';
import { useReaderEdition, useReaderPage } from '../store/use-reader';

/**
 * The landing page's entry into the history of the mushaf.
 *
 * The plate is the reader's current page when an edition is attached: the
 * history page is about this copy of the text, so showing a real page is more
 * honest than a generic book glyph. With no edition, or a stored page the
 * edition does not carry, a hairline plate with the page number takes its
 * place. A failed scan falls back the same way, keyed by URI so a later page
 * or edition can try again.
 *
 * The whole band is one control. It has no nested button, so it can carry the
 * button role; the plate is decorative inside that control, and its description
 * is folded into the band's accessible name instead of being a second focus
 * stop.
 */
export function HistoryBand() {
  const { t } = useTranslation();
  const { language } = useDirection();
  const router = useRouter();
  const page = useReaderPage();
  const edition = useReaderEdition();
  const [failedUri, setFailedUri] = useState<string | null>(null);

  const pageLabel = formatReaderNumber(page, language);

  const imageUri =
    edition && isPageInEdition(edition, page)
      ? quranPageImageUrl(edition, page)
      : null;

  const plateLabel = t('quran.history.plateLabel', { page: pageLabel });
  const accessibilityLabel = [
    t('quran.landing.history'),
    t('quran.history.bandPromise'),
    plateLabel,
  ].join(' · ');

  return (
    <Pressable
      testID="quran-history-band"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => router.push('/quran/history')}
      className="flex-row items-center gap-4 border-b border-border py-7 active:opacity-70 md:py-8"
    >
      <View
        testID="quran-history-plate"
        className="w-24 shrink-0 overflow-hidden border border-border bg-muted md:w-28"
        style={{ aspectRatio: 412 / 600 }}
      >
        {imageUri !== null && failedUri !== imageUri ? (
          <Image
            testID="quran-history-plate-image"
            source={{ uri: imageUri }}
            className="h-full w-full"
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={120}
            accessible={false}
            onError={() => setFailedUri(imageUri)}
          />
        ) : (
          <View className="absolute inset-0 items-center justify-center gap-1 px-2">
            <View className="h-px w-2/3 bg-border" />
            <Text variant="caption" tone="muted" className="tabular-nums">
              {pageLabel}
            </Text>
            <View className="h-px w-2/3 bg-border" />
          </View>
        )}
      </View>

      <View className="flex-1 gap-1">
        <Text variant="label">{t('quran.landing.history')}</Text>
        <Text variant="caption" tone="muted">
          {t('quran.history.bandPromise')}
        </Text>
      </View>

      <Icon name="chevron-right" size={18} tone="muted" />
    </Pressable>
  );
}
