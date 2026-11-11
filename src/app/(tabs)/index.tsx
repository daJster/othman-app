import Head from 'expo-router/head';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useDirection } from '@/i18n';
import { isAppHref } from '@/features/navigation/route-registry';
import { CircleRail } from '@/features/home/circle-rail';
import {
  formatCount,
  formatWhen,
  pickLocalized,
} from '@/features/home/circle-format';
import { DestinationStrip } from '@/features/home/destination-strip';
import { HeroScroll } from '@/features/home/hero-scroll';
import { VerseCard } from '@/features/home/verse-card';
import { useCircle } from '@/features/home/use-circle';
import { useReaderPage } from '@/features/quran/store/use-reader';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/ui/button';
import { Page } from '@/ui/page';
import { Section } from '@/ui/section';

/**
 * Home: the study circle.
 *
 * The page answers three questions in reading order: where was I, what is the
 * circle doing, where can I go. The hero film and its frosted panel open it and
 * hand over to the verse; the circle rail carries the week's real dates; the
 * destination strip closes it as shortcuts. The pinned pill reports the next
 * timed item, or the page the reader left off on, so the one surface that is
 * always in view is never a repeat of the CTA behind it.
 *
 * Everything below the hero is demo content from `services/circle`, flagged as
 * demo by the fixture itself. No photography of people, no testimonials and no
 * live statistics are invented — the film is unattributed atmosphere, not
 * evidence.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useDirection();
  const circle = useCircle();
  const page = useReaderPage();

  const hero = {
    opening: t('home.hero.opening'),
    title: t('app.name'),
    tagline: t('app.tagline'),
    cohort: t('home.halqa.cohort'),
    ctaLabel: t('home.halqa.continue'),
    ctaHref: '/quran' as const,
  };

  /**
   * What the pinned pill says.
   *
   * The next timed item when there is one, otherwise the page the reader was
   * on. Both branches exist from the first paint: before the demo list resolves
   * the pill already offers the reading position, so the pill never shows an
   * empty shell while the query settles.
   */
  const pill = useMemo(() => {
    const next = circle.nextUp;

    if (next) {
      return {
        label: t('home.pill.next', {
          title: pickLocalized(next.title, language),
          when: formatWhen(next, language, circle.now, t),
        }),
        href:
          next.href && isAppHref(next.href)
            ? next.href
            : ('/meetings' as const),
      };
    }

    return {
      label: t('home.pill.resume', { page: formatCount(page, language) }),
      href: '/quran' as const,
    };
  }, [circle.nextUp, circle.now, language, page, t]);

  return (
    <HeroScroll hero={hero} pill={pill} scrollLabel={t('home.scroll.region')}>
      <Head>
        <title>{t('app.name')}</title>
      </Head>

      {/*
       * The verse moves up, directly under the hero. It is the page's one
       * piece of scripture and the calmest thing on it, so it earns the
       * transition from the film into the week rather than closing a list of
       * links. Capped to a reading measure; the hairlines stay the band.
       */}
      <Page width="wide" className="pt-8 md:pt-12">
        <View className="mx-auto w-full max-w-xl">
          <VerseCard
            title={t('home.verse.title')}
            text={t('home.verse.text')}
            reference={t('home.verse.reference')}
          />
        </View>
      </Page>

      {/*
       * The circle: one column, capped so a chevron stays beside its label.
       * Sign in shares the heading row so it never floats between sections.
       */}
      <Page width="wide" className="pb-14 md:pb-20">
        <View className="mx-auto w-full max-w-xl pt-10 md:pt-12">
          <View className="flex-row items-end justify-between gap-4">
            <Section
              title={t('home.circle.title')}
              titleVariant="heading"
              descriptionVariant="caption"
              level={2}
              className="flex-1"
            />

            {!user ? (
              <Button
                variant="link"
                size="sm"
                className="shrink-0"
                label={t('action.signIn')}
                onPress={() => router.push('/auth/sign-in')}
                testID="home-sign-in"
              />
            ) : null}
          </View>

          <View className="mt-6">
            <CircleRail />
          </View>

          <DestinationStrip />
        </View>
      </Page>
    </HeroScroll>
  );
}
