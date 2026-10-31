import Head from 'expo-router/head';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { FeatureCard } from '@/features/home/feature-card';
import { HOME_LINKS } from '@/features/home/feature-links';
import { Hero } from '@/features/home/hero';
import { VerseCard } from '@/features/home/verse-card';
import { useAuth } from '@/providers/auth-provider';
import { useDirection } from '@/i18n';
import { cn } from '@/ui/cn';
import { Button } from '@/ui/button';
import { Screen } from '@/ui/screen';
import { Text } from '@/ui/text';

/**
 * Home: the study circle.
 *
 * The page is one community composition, not a stack of equal feature cards.
 * The hero states the cohort promise and offers the mushaf as the primary
 * action; the four destinations continue as stations on a single circle line;
 * the verse closes the page as a quiet reading band. No photography or
 * testimonials are used because none are supplied.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { isRTL } = useDirection();

  return (
    <Screen contentContainerClassName="gap-0 p-0">
      <Head>
        <title>{t('app.name')}</title>
      </Head>

      <Hero
        opening={t('home.hero.opening')}
        title={t('app.name')}
        tagline={t('app.tagline')}
        cohort={t('home.halqa.cohort')}
        ctaLabel={t('home.halqa.continue')}
        ctaHref="/quran"
        ringLabel={t('home.halqa.ring')}
      />

      <View
        className={cn(
          'mx-auto w-full max-w-6xl px-5 pt-10 pb-14 md:items-start md:gap-16 md:pt-16 md:pb-20',
          isRTL ? 'md:flex-row-reverse' : 'md:flex-row',
        )}
      >
        <View className="flex-1">
          <View
            className={cn(
              'flex-row items-end justify-between gap-4',
              isRTL && 'flex-row-reverse',
            )}
          >
            <View className="flex-1 gap-1">
              <Text variant="heading">{t('home.circle.title')}</Text>
              <Text variant="caption" tone="muted">
                {t('home.circle.description')}
              </Text>
            </View>

            {!user ? (
              <Button
                variant="link"
                size="sm"
                label={t('action.signIn')}
                onPress={() => router.push('/auth/sign-in')}
                testID="home-sign-in"
              />
            ) : null}
          </View>

          <View className="mt-7">
            {HOME_LINKS.map((route, index) => (
              <FeatureCard
                key={route.href}
                href={route.href}
                icon={route.icon}
                title={t(route.titleKey)}
                description={t(route.descriptionKey)}
                isLast={index === HOME_LINKS.length - 1}
              />
            ))}
          </View>
        </View>

        <View className="mt-10 md:mt-0 md:w-96">
          <VerseCard
            title={t('home.verse.title')}
            text={t('home.verse.text')}
            reference={t('home.verse.reference')}
          />
        </View>
      </View>
    </Screen>
  );
}
