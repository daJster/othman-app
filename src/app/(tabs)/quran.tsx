import { useLocalSearchParams, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { HistoryBand } from '@/features/quran/components/history-band';
import { StoryBand } from '@/features/quran/components/story-band';
import { parseQuranLink } from '@/features/quran/links';
import { Icon } from '@/ui/icon';
import { Page } from '@/ui/page';
import { Pressable } from '@/ui/pressable';
import { Screen, ScreenView } from '@/ui/screen';
import { ErrorState } from '@/ui/states';
import { Text } from '@/ui/text';

/**
 * Quran tab — the landing surface for the mushaf.
 *
 * The reader itself is a full-screen modal (`/reader/[page]`), not a tab: the
 * scan needs every pixel and the page-turn gesture would compete with the tab
 * bar. This screen is the front door to the mushaf: the history band keeps the
 * last places read, the records entry opens bookmarks and notes, and the story
 * band closes the page.
 *
 * **Resume reading and recent activity live on Home now.** They answer "what
 * now" rather than "where in the mushaf", and Home is the surface a reader
 * opens first; keeping a second copy here would make the two drift. This page
 * stays about the book itself.
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

  return (
    <Screen contentContainerClassName="gap-0 p-0">
      <Page width="default" className="pt-8 pb-10 md:pt-12">
        <Head>
          <title>{`${t('nav.quran')} · ${t('app.name')}`}</title>
        </Head>

        <HistoryBand />

        <View className="py-4" testID="quran-section-records">
          <Pressable
            testID="quran-records-entry"
            accessibilityRole="button"
            accessibilityLabel={`${t('quran.landing.records')} — ${t(
              'quran.landing.recordsHint',
            )}`}
            onPress={() => router.push('/quran/records')}
            className="min-h-14 flex-row items-center gap-3 border-y border-border py-3 active:opacity-70"
          >
            <Icon name="bookmark" size={18} tone="muted" />
            <View className="min-w-0 flex-1 gap-0.5">
              <Text variant="label">{t('quran.landing.records')}</Text>
              <Text variant="caption" tone="muted">
                {t('quran.landing.recordsHint')}
              </Text>
            </View>
            <Icon name="chevron-right" size={18} tone="muted" />
          </Pressable>
        </View>

        <StoryBand />
      </Page>
    </Screen>
  );
}
