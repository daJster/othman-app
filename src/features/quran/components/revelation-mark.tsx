import type { SurahLocation } from '@/core/types';
import { REVELATION_MARK } from '@/features/brand/assets';
import { useOptionalThemeMode } from '@/providers/theme-provider';
import { useColorScheme } from 'react-native';
import { Image } from '@/ui/image';

/**
 * The Makkan/Medinan mark that accompanies a surah.
 *
 * Decorative: the row already names the surah and its ayah count, and the
 * location has no translated label in the copy set. Hiding it from assistive
 * tech avoids announcing an untranslated key.
 */
export type RevelationMarkProps = {
  location: SurahLocation;
  className?: string;
};

export function RevelationMark({
  location,
  className = 'h-4 w-4',
}: RevelationMarkProps) {
  const theme = useOptionalThemeMode();
  const scheme = useColorScheme();
  const isDark = theme?.isDark ?? scheme === 'dark';
  const source = REVELATION_MARK[location][isDark ? 'onDark' : 'onLight'];

  return (
    <Image
      source={source}
      className={className}
      contentFit="contain"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
