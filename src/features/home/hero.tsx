import { View } from 'react-native';
import { Text } from '@/ui/text';

/**
 * Home hero.
 *
 * Full-bleed gradient rather than a photograph: the web hero leaned on a
 * mosque image with a viewport-height overlay, which on a phone would either
 * crop the calligraphy or push every real action below the fold. A gradient
 * keeps the same "opening page" feel, stays legible in both schemes because it
 * is built from the `primary` token, and needs no image asset.
 *
 * The gradient runs *lighter at the top*, so the closing line sits on solid
 * `primary`: white-on-`primary` is the only pairing in this block that clears
 * WCAG AA at body size. No fixed height — the Arabic opening and the app name
 * both wrap instead of clipping when the OS text size is raised.
 */
export type HeroProps = {
  /** The basmalah, in Arabic, in both languages. */
  opening: string;
  title: string;
  tagline: string;
};

export function Hero({ opening, title, tagline }: HeroProps) {
  return (
    <View className="from-primary/85 to-primary items-center gap-3 rounded-b-3xl bg-gradient-to-b px-6 pt-12 pb-10">
      <Text
        family="quran"
        className="text-primary-foreground text-center text-2xl leading-relaxed"
      >
        {opening}
      </Text>
      <Text
        accessibilityRole="header"
        variant="title"
        className="text-primary-foreground text-center text-3xl"
      >
        {title}
      </Text>
      <Text className="text-primary-foreground text-center">{tagline}</Text>
    </View>
  );
}
