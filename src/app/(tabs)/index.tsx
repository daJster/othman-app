import Head from 'expo-router/head';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useDirection } from '@/i18n';
import { isAppHref } from '@/features/navigation/route-registry';
import {
  formatCount,
  formatWhen,
  pickLocalized,
} from '@/features/home/circle-format';
import { HeroScroll } from '@/features/home/hero-scroll';
import { useCircle } from '@/features/home/use-circle';
import { ActivityBand } from '@/features/quran/components/activity-band';
import { ResumeBand } from '@/features/quran/components/resume-band';
import { useReaderPage } from '@/features/quran/store/use-reader';
import { Page } from '@/ui/page';

/**
 * Home: the study circle and the reader's day.
 *
 * The page opens on the film and its frosted panel, hands over to the verse,
 * then continues with the two reading sections that moved here from the Quran
 * tab: the resume card beside today's goal, and the recent-activity board. They
 * answer "what now", which is this page's question — the Quran tab answers
 * "where in the mushaf".
 *
 * The hero film and its frosted panel open it and hand over to the verse. The
 * pinned pill reports the next timed item, or the page the reader left off on,
 * so the one surface that is always in view is never a repeat of the CTA behind
 * it.
 *
 * Everything below the hero is demo content from `services/circle` and the
 * reading log's seed, flagged as demo by the fixtures themselves. No
 * photography of people, no testimonials and no live statistics are invented —
 * the film is unattributed atmosphere, not evidence.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const { language } = useDirection();
  const circle = useCircle();
  const page = useReaderPage();
  const router = useRouter();

  const hero = {
    title: t('app.name'),
    verseTitle: t('home.verse.title'),
    verseText: t('home.verse.text'),
    verseReference: t('home.verse.reference'),
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

  /**
   * Opens the reader at the position a session recorded.
   *
   * Owned by the screen, not the band: the band knows what a session is, the
   * route is the page's business. `surah` without an `ayah` is a surah-start
   * link, which `resolveQuranLink` would use to override the page, so the pair
   * travels together or not at all.
   */
  const openEntry = (entry: {
    page: number;
    surah: number;
    ayahKey: string | null;
  }) => {
    router.push({
      pathname: '/reader/[page]',
      params: {
        page: String(entry.page),
        ...(entry.ayahKey
          ? { surah: String(entry.surah), ayah: entry.ayahKey }
          : {}),
      },
    });
  };

  return (
    <HeroScroll hero={hero} pill={pill} scrollLabel={t('home.scroll.region')}>
      <Head>
        <title>{t('app.name')}</title>
      </Head>

      {/*
       * The two reading sections moved here from the Quran tab: they answer
       * "what now", which is Home's question. They share the hero's own column
       * (`WIDE_CLASS`), and from `lg` stand side by side between hairlines: at
       * the measured reading width each one is a narrow island with dead space
       * on both sides, which reads as an unfinished page rather than a calm
       * one. Stacked, they keep the full measure a phone needs.
       */}
      <Page width="wide" className="py-section">
        <View className="border-y border-glass-edge">
          <View className="flex-col xl:flex-row xl:items-stretch">
            <View testID="home-section-resume" className="xl:w-1/2 xl:pe-10">
              <ResumeBand onOpen={openEntry} />
            </View>

            {/* A rule between the pair: horizontal when stacked, vertical
                when side by side. It belongs to the composition, not to
                either band, so it can never double up with a band's own. */}
            <View className="h-px w-full bg-glass-edge xl:h-auto xl:w-px xl:self-stretch" />

            <View
              testID="home-section-activity"
              className="xl:min-w-0 xl:flex-1 xl:ps-10"
            >
              <ActivityBand />
            </View>
          </View>
        </View>
      </Page>
    </HeroScroll>
  );
}
