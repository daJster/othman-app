import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import type { AppHref } from '@/features/navigation/route-registry';
import { useDirection } from '@/i18n';
import { cn } from '@/ui/cn';
import { Text } from '@/ui/text';

/**
 * Home hero: the study circle.
 *
 * The landing page is a halqa, not a feature catalogue. A deep canopy field
 * holds the basmalah, the wordmark and the cohort promise; a brass ring at the
 * right is the community diagram, with the Arabic word for "circle" at its
 * centre. On a phone the ring sits below the copy at a smaller size, so the
 * first viewport still reads as one composition rather than a cropped desktop
 * banner.
 *
 * The primary action is a parchment capsule, the only high-contrast control in
 * the block. No photograph: there is no real cohort imagery, and a stock image
 * would lie about the people in this kuttab.
 */
export type HeroProps = {
  /** The basmalah, in Arabic, in both languages. */
  opening: string;
  title: string;
  tagline: string;
  /** One line naming the people around the reader. */
  cohort: string;
  ctaLabel: string;
  ctaHref: AppHref;
  /** Arabic word at the centre of the study ring. */
  ringLabel: string;
};

export function Hero({
  opening,
  title,
  tagline,
  cohort,
  ctaLabel,
  ctaHref,
  ringLabel,
}: HeroProps) {
  const { isRTL } = useDirection();

  return (
    <View className="relative overflow-hidden rounded-b-[2.5rem] bg-canopy px-5 pt-12 pb-14 md:px-10 md:pt-20 md:pb-20">
      <View
        className="absolute -top-28 -right-24 h-72 w-72 rounded-full border border-parchment/10"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <View
        className="absolute -bottom-20 -left-32 h-64 w-64 rounded-full border border-parchment/10"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />

      <View className="mx-auto w-full max-w-6xl gap-8 md:gap-10">
        <Text
          family="quran"
          className="text-center text-2xl leading-relaxed text-brass md:text-3xl"
        >
          {opening}
        </Text>

        <View
          className={cn(
            'flex-col gap-10 md:items-center md:gap-16',
            isRTL ? 'md:flex-row-reverse' : 'md:flex-row',
          )}
        >
          <View className="flex-1 gap-5">
            <View className="gap-2">
              <Text
                accessibilityRole="header"
                variant="title"
                className="text-4xl text-parchment md:text-6xl"
              >
                {title}
              </Text>
              <Text className="max-w-xl text-lg text-parchment/80 md:text-xl">
                {tagline}
              </Text>
            </View>

            <Text className="max-w-md text-sm leading-relaxed text-parchment/65">
              {cohort}
            </Text>

            <View className={isRTL ? 'flex-row-reverse' : 'flex-row'}>
              <Link href={ctaHref} asChild>
                <Pressable className="rounded-full bg-parchment px-6 py-3 active:opacity-80">
                  <Text className="font-semibold text-canopy">{ctaLabel}</Text>
                </Pressable>
              </Link>
            </View>
          </View>

          <View
            className="relative aspect-square w-full max-w-[20rem] self-center md:max-w-[24rem]"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <View className="absolute inset-0 rounded-full border border-brass/35" />
            <View className="absolute inset-6 rounded-full border border-parchment/15" />
            <View className="absolute inset-14 rounded-full border border-brass/20" />

            <View className="flex-1 items-center justify-center gap-1">
              <Text family="quran" className="text-4xl text-brass">
                {ringLabel}
              </Text>
              <Text
                variant="overline"
                className="tracking-[0.35em] text-parchment/50"
              >
                HALQA
              </Text>
            </View>

            <View className="absolute top-0 left-1/2 -ml-1.5 h-3 w-3 rounded-full bg-brass" />
            <View className="absolute bottom-0 left-1/2 -ml-1.5 h-3 w-3 rounded-full bg-clay" />
            <View className="absolute top-1/2 left-0 -mt-1.5 h-3 w-3 rounded-full bg-brass" />
            <View className="absolute top-1/2 right-0 -mt-1.5 h-3 w-3 rounded-full bg-brass" />
          </View>
        </View>
      </View>
    </View>
  );
}
