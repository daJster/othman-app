import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { isPageInEdition, quranPageImageUrl } from '@/core/domain/quran/page';
import type { QuranEdition } from '@/core/types';
import { useDirection } from '@/i18n';
import { Image } from '@/ui/image';
import { Pressable } from '@/ui/pressable';
import { Text } from '@/ui/text';
import { formatReaderNumber } from '../format';

/**
 * A thumbnail of the page the reader would open.
 *
 * The tab is a return to a place, so when an edition is attached we show the
 * scan itself rather than a generic icon. The image is only requested for a
 * page the edition actually carries (`isPageInEdition`); otherwise, and after
 * a failed load, a quiet hairline placeholder takes its place. That keeps a
 * stale stored page, an edition that starts later, or an offline CDN from
 * producing a broken frame.
 *
 * The whole thumbnail is the control: on a phone it is the largest thing in
 * the section, so making only the button beside it tappable would waste the
 * obvious target. It is decorative-only for a screen reader (the primary
 * button carries the action's accessible name) but still labelled, because a
 * page scan is meaningful content.
 */
export type MushafPreviewProps = {
  edition: QuranEdition;
  page: number;
  onPress: () => void;
};

export function MushafPreview({ edition, page, onPress }: MushafPreviewProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const [failed, setFailed] = useState(false);

  const pageLabel = formatReaderNumber(page, language);
  const showImage = isPageInEdition(edition, page) && !failed;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('reader.pageImage', { page: pageLabel })}
      onPress={onPress}
      testID="quran-preview-open"
      className="w-24 shrink-0 overflow-hidden border border-border bg-muted active:opacity-70 md:w-28"
      style={{ aspectRatio: 412 / 600 }}
    >
      <View
        className="absolute inset-0 items-center justify-center gap-2 px-3"
        pointerEvents="none"
      >
        <View className="h-px w-3/4 bg-border" />
        <Text variant="caption" tone="muted" className="tabular-nums">
          {pageLabel}
        </Text>
        <View className="h-px w-3/4 bg-border" />
      </View>

      {showImage ? (
        <Image
          source={{ uri: quranPageImageUrl(edition, page) }}
          className="h-full w-full"
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={120}
          accessible={false}
          onError={() => setFailed(true)}
        />
      ) : null}
    </Pressable>
  );
}
