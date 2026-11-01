import { useEffect, useState } from 'react';
import { Animated, Easing, useColorScheme, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { READER_LOGO } from '@/features/brand/assets';
import { useOptionalThemeMode } from '@/providers/theme-provider';
import { Image } from '@/ui/image';
import { Text } from '@/ui/text';

/**
 * The reader's loading state — used for every boot frame (store restore,
 * catalog, bbox tables).
 *
 * The bar is intentionally indeterminate. There is no byte-level progress to
 * report across a restore, a catalog fetch and a multi-megabyte bbox download,
 * so a percentage would be a guess dressed as data. A brass segment travelling
 * across a hairline says "working" without inventing a number, and the
 * theme-aware reader emblem keeps the wait inside the product's world.
 */
export function ReaderLoading() {
  const { t } = useTranslation();
  const theme = useOptionalThemeMode();
  const scheme = useColorScheme();
  const isDark = theme?.isDark ?? scheme === 'dark';
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1300,
        easing: Easing.inOut(Easing.quad),
        // Width/transform animation on web; no native driver there.
        useNativeDriver: false,
      }),
    );
    loop.start();

    return () => loop.stop();
  }, [progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-64, 160],
  });

  return (
    <View
      className="flex-1 items-center justify-center gap-5 p-6"
      testID="reader-loading"
      accessibilityRole="progressbar"
      accessibilityLabel={t('action.loading')}
    >
      <Image
        source={READER_LOGO[isDark ? 'onDark' : 'onLight']}
        className="h-24 w-24"
        contentFit="contain"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />

      <View className="h-0.5 w-40 overflow-hidden rounded-full bg-border">
        <Animated.View style={{ transform: [{ translateX }] }}>
          <View className="h-0.5 w-16 rounded-full bg-brass" />
        </Animated.View>
      </View>

      <Text variant="caption" tone="muted">
        {t('action.loading')}
      </Text>
    </View>
  );
}
