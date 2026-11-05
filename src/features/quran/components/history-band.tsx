import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { isPageInEdition, quranPageImageUrl } from '@/core/domain/quran/page';
import { useDirection } from '@/i18n';
import { Image } from '@/ui/image';
import { useReducedMotion } from '@/ui/motion';
import { Pressable } from '@/ui/pressable';
import { Text } from '@/ui/text';
import { formatReaderNumber } from '../format';
import { useReaderEdition, useReaderPage } from '../store/use-reader';

/**
 * The landing page's history entry as a single 2:1 image card.
 *
 * Layers, bottom to top: the reader's current page scan (or a canopy
 * fallback when no edition is attached, the page is outside it, or the scan
 * failed, keyed by URI so a later page or edition can try again), a
 * bottom-weighted gradient scrim that lifts the text off any scan behind it,
 * and the title plus promise set directly on the scrim at the physical
 * left-bottom in both languages; the Text primitive handles direction.
 *
 * The whole card is one control with the button role; the plate is decorative
 * inside it and its description is folded into the card's accessible name.
 * The reveal is one mount fade, skipped for reduced-motion visitors. On web
 * the shadow deepens on hover.
 */
const cardShadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.25,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
  ...Platform.select({
    web: { boxShadow: '0 6px 12px rgba(0,0,0,0.25)' },
  }),
} as const;

const cardShadowHovered = {
  shadowOpacity: 0.35,
  shadowRadius: 16,
  ...Platform.select({
    web: { boxShadow: '0 8px 16px rgba(0,0,0,0.35)' },
  }),
} as const;

export function HistoryBand() {
  const { t } = useTranslation();
  const { language } = useDirection();
  const router = useRouter();
  const page = useReaderPage();
  const edition = useReaderEdition();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const reducedMotion = useReducedMotion();

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

  const reveal = reducedMotion ? undefined : FadeIn.duration(180);

  return (
    <Animated.View entering={reveal} className="w-full py-7 md:py-8">
      <Pressable
        testID="quran-history-band"
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => router.push('/quran/history')}
        onHoverIn={() => {
          if (Platform.OS === 'web') setHovered(true);
        }}
        onHoverOut={() => {
          if (Platform.OS === 'web') setHovered(false);
        }}
        className="relative w-full overflow-hidden rounded-2xl border border-border active:opacity-70"
        style={[
          { aspectRatio: 2 },
          cardShadow,
          hovered ? cardShadowHovered : null,
        ]}
      >
        {imageUri !== null && failedUri !== imageUri ? (
          <Image
            testID="quran-history-plate-image"
            source={{ uri: imageUri }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={120}
            accessible={false}
            onError={() => setFailedUri(imageUri)}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View
            testID="quran-history-fallback"
            className="absolute inset-0 bg-canopy"
          />
        )}

        <LinearGradient
          colors={['rgba(3,10,7,0)', 'rgba(3,10,7,0.82)']}
          locations={[0.42, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View className="absolute right-0 bottom-0 left-0 gap-0.5 p-3 md:p-4">
          <Text
            className="text-lg leading-snug font-semibold text-parchment"
            numberOfLines={1}
          >
            {t('quran.landing.history')}
          </Text>
          <Text
            className="text-xs font-medium text-parchment"
            numberOfLines={2}
          >
            {t('quran.history.bandPromise')}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
