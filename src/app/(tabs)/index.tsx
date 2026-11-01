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
import { Page } from '@/ui/page';
import { Screen } from '@/ui/screen';
import { Section } from '@/ui/section';

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

      <Page
        width="wide"
        className={cn(
          'pt-10 pb-14 md:items-start md:justify-between md:gap-16 md:pt-16 md:pb-20',
          isRTL ? 'md:flex-row-reverse' : 'md:flex-row',
        )}
      >
        {/*
         * The stations own a capped measure: a chevron should sit beside its
         * label, not drift to the far edge of a stretched column. The header
         * row is a child of the same column, so "Sign in" stays pinned to the
         * "Your circle" row instead of floating between the two columns.
         */}
        <View className="flex-1 md:max-w-md">
          <View
            className={cn(
              'flex-row items-end justify-between gap-4',
              isRTL && 'flex-row-reverse',
            )}
          >
            <Section
              title={t('home.circle.title')}
              description={t('home.circle.description')}
              titleVariant="heading"
              descriptionVariant="caption"
              level={2}
              className="flex-1"
            />

            {!user ? (
              <Button
                variant="link"
                size="sm"
                className="min-h-11 shrink-0"
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

        {/*
         * The verse keeps a fixed reading measure rather than absorbing the
         * leftover width; its top edge is the "Your circle" heading's top edge.
         * `shrink-0` stops it collapsing at 768, where both columns share the
         * row.
         */}
        <View className="mt-10 md:mt-0 md:w-96 md:shrink-0">
          <VerseCard
            title={t('home.verse.title')}
            text={t('home.verse.text')}
            reference={t('home.verse.reference')}
          />
        </View>
      </Page>
    </Screen>
  );
}
