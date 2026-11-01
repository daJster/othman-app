import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';
import { useOptionalThemeMode } from '@/providers/theme-provider';
import { cn } from '@/ui/cn';
import { Image } from '@/ui/image';
import { WORDMARK, type BrandSurface } from './assets';

/**
 * The Othman wordmark.
 *
 * Picks the ink from the resolved theme unless a surface pins it (the hero is
 * always canopy, so it always wants the light-ink artwork).
 *
 * Width is set with the height instead of a `w-auto` utility: Expo Image on
 * web sizes its wrapper from explicit dimensions, and `width: auto` collapses
 * it to zero inside a flex row. Callers pass a matched pair of size utilities.
 *
 * Pass `accessible={false}` when the mark is decorative beside text that
 * already names the product.
 */
export type BrandMarkProps = {
  className?: string;
  surface?: BrandSurface;
  accessible?: boolean;
};

export function BrandMark({
  className = 'h-9 w-16',
  surface,
  accessible = true,
}: BrandMarkProps) {
  const { t } = useTranslation();
  const theme = useOptionalThemeMode();
  const scheme = useColorScheme();
  const isDark = theme?.isDark ?? scheme === 'dark';
  const ink: BrandSurface = surface ?? (isDark ? 'onDark' : 'onLight');

  return (
    <Image
      source={WORDMARK[ink]}
      contentFit="contain"
      className={cn('shrink-0', className)}
      accessibilityLabel={accessible ? t('app.name') : undefined}
      accessibilityElementsHidden={!accessible}
      importantForAccessibility={accessible ? 'auto' : 'no-hide-descendants'}
    />
  );
}
