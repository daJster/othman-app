import { useLocalSearchParams, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityBand } from '@/features/quran/components/activity-band';
import { HistoryBand } from '@/features/quran/components/history-band';
import { ResumeBand } from '@/features/quran/components/resume-band';
import { StoryBand } from '@/features/quran/components/story-band';
import { parseQuranLink } from '@/features/quran/links';
import { useRestoreReader } from '@/features/quran/store/use-reader';
import { Page } from '@/ui/page';
import { Screen, ScreenView } from '@/ui/screen';
import { ErrorState } from '@/ui/states';

/**
 * Quran tab — the landing surface for the mushaf.
 *
 * The reader itself is a full-screen modal (`/reader/[page]`), not a tab: the
 * scan needs every pixel and the page-turn gesture would compete with the tab
 * bar. This screen is the front door: the resume band shows the last three
 * places the reading log recorded, and, as the supporting modules land, becomes
 * the place a reader starts their day — recent activity, history
 * and a suggested surah.
 *
 * The bands are a reading sequence, so the page stays a single column at every
 * width. Sections 1+2 lock to 30/70 of the viewport height in portrait only;
 * S2 subtracts the bottom safe-area inset so native tabs never cover the
 * legend (web insets are zero so web is unaffected). In landscape (height < width) no fixed heights apply and the
 * bands stack naturally — a fallback the builder of the future must keep.
 * Each module is optional; with none attached, the resume band alone is
 * a complete entry point.
 *
 * This screen owns where a position goes, not what it is: `openEntry()` is the
 * only navigation the band performs, and it always targets `/reader/[page]`
 * with the page and, when the session recorded one, the surah/ayah pair, so a
 * card restores the position it names rather than only its page.
 * `useRestoreReader` still runs here so the stored page is read once at the
 * front door; the reader keeps its own guarded restore for a direct deep link.
 *
 * A link such as `/quran?surah=2&ayah=255` forwards to the reader with the same
 * parameters. Validity is checked in two steps: the parser rejects malformed or
 * contradictory input here, while whether that ayah exists in the edition is
 * decided by the reader after its geometry attaches. Neither step guesses a
 * position.
 */
export default function QuranScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    page?: string;
    surah?: string;
    ayah?: string;
  }>();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const portrait = windowHeight >= windowWidth;
  const s1 = Math.round(windowHeight * 0.3);
  const tabBottom = insets.bottom ?? 0;
  const s2 = Math.max(0, Math.round(windowHeight * 0.7) - tabBottom);

  useRestoreReader();

  const link = useMemo(
    () => parseQuranLink(params),
    [params.page, params.surah, params.ayah],
  );

  useEffect(() => {
    if (link.kind !== 'link') return;

    router.replace({
      pathname: '/reader/[page]',
      params: {
        // The ayah mapping overrides this in the reader, but the segment must
        // still be a number for the route to match.
        page: String(link.page ?? 1),
        ...(link.surah !== null ? { surah: String(link.surah) } : {}),
        ...(link.ayah !== null ? { ayah: String(link.ayah) } : {}),
      },
    });
  }, [link, router]);

  if (link.kind === 'invalid') {
    return (
      <ScreenView>
        <ErrorState
          title={t('reader.linkInvalidTitle')}
          description={t('reader.linkInvalidDescription')}
          onRetry={() => router.replace('/quran')}
        />
      </ScreenView>
    );
  }

  const openEntry = (entry: {
    page: number;
    surah: number;
    ayahKey: string | null;
  }) => {
    router.push({
      pathname: '/reader/[page]',
      params: {
        page: String(entry.page),
        // `surah` without an `ayah` is a surah-start link: `resolveQuranLink`
        // would ignore the page. Send the pair together, or the page alone.
        ...(entry.ayahKey
          ? { surah: String(entry.surah), ayah: entry.ayahKey }
          : {}),
      },
    });
  };

  return (
    <Screen contentContainerClassName="gap-0 p-0">
      <Page width="default">
        <Head>
          <title>{`${t('nav.quran')} · ${t('app.name')}`}</title>
        </Head>

        <View
          testID="quran-section-history"
          style={{ height: portrait ? s1 : undefined }}
          className="justify-center"
        >
          <HistoryBand />
        </View>
        <ResumeBand onOpen={openEntry} />
        <View
          testID="quran-section-activity"
          style={{ height: portrait ? s2 : undefined }}
        >
          <ActivityBand />
        </View>
        <StoryBand />
      </Page>
    </Screen>
  );
}
