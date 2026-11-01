import { useLocalSearchParams, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { QURAN_PAGE_COUNT } from '@/core/domain/quran/surah';
import { MushafPreview } from '@/features/quran/components/mushaf-preview';
import { formatReaderNumber } from '@/features/quran/format';
import {
  useReaderEdition,
  useReaderPage,
  useReaderSurah,
  useRestoreReader,
} from '@/features/quran/store/use-reader';
import { parseQuranLink } from '@/features/quran/links';
import { useDirection } from '@/i18n';
import { Button } from '@/ui/button';
import { cn } from '@/ui/cn';
import { Page } from '@/ui/page';
import { Screen, ScreenView } from '@/ui/screen';
import { Section } from '@/ui/section';
import { ErrorState } from '@/ui/states';
import { Text } from '@/ui/text';

/**
 * Quran tab — the entry into the mushaf reader.
 *
 * The reader itself is a full-screen modal (`/reader/[page]`), not a tab: the
 * scan needs every pixel and the page-turn gesture would compete with the tab
 * bar. This screen therefore has one job — open that route at the right page —
 * and it deliberately does not duplicate the reader or prefetch its data.
 *
 * `useRestoreReader` reads the persisted page once. Calling it here is what
 * makes "continue" point at the page the reader last showed instead of always
 * page 1; the reader calls the same guarded action when it mounts, so opening
 * the tab first costs nothing extra.
 *
 * The position is shown with the same facts the reader uses: the stored page,
 * the standard 604-page extent, and the surah number the store last resolved.
 * Surah *names* live in the catalog payload, so naming the surah here would
 * mean fetching it on a screen whose only job is to forward; the number is
 * already in the store and is shown instead.
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
  const { language, isRTL } = useDirection();
  const params = useLocalSearchParams<{
    page?: string;
    surah?: string;
    ayah?: string;
  }>();

  useRestoreReader();
  const page = useReaderPage();
  const surah = useReaderSurah();
  const edition = useReaderEdition();

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

  const open = () => {
    router.push({ pathname: '/reader/[page]', params: { page: String(page) } });
  };

  const pageLabel = formatReaderNumber(page, language);
  const surahLabel = t('pages.account.progress.surah', {
    number: formatReaderNumber(surah, language),
  });
  // The extent is the standard mushaf, not the attached edition's own range:
  // the reader clamps to the edition after it attaches, and this screen does
  // not have that range to hand. Out-of-range values are pinned so the
  // hairline can never overflow or invert.
  const progress = Math.min(1, Math.max(0, page / QURAN_PAGE_COUNT));

  return (
    <Screen contentContainerClassName="gap-0 p-0">
      <Page width="default" className="pt-8 pb-10 md:px-8 md:pt-12">
        <Head>
          <title>{`${t('nav.quran')} · ${t('app.name')}`}</title>
        </Head>

        <Section title={t('nav.quran')} description={t('nav.quranDesc')} />

        <View className="mt-8 border-y border-border py-7 md:py-9">
          <View
            className={cn(
              'gap-5 md:gap-7',
              edition
                ? cn('flex-row', isRTL && 'flex-row-reverse')
                : 'flex-col',
            )}
          >
            {edition ? (
              <MushafPreview edition={edition} page={page} onPress={open} />
            ) : null}

            <View className="flex-1 gap-5">
              <View className="gap-1">
                <Text variant="heading" className="tabular-nums">
                  {t('reader.continueDescription', { page: pageLabel })}
                </Text>
                <Text variant="caption" tone="muted" className="tabular-nums">
                  {`${surahLabel} · ${t('reader.pageOf', {
                    page: pageLabel,
                    total: formatReaderNumber(QURAN_PAGE_COUNT, language),
                  })}`}
                </Text>
              </View>

              <View
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: 1,
                  max: QURAN_PAGE_COUNT,
                  now: page,
                }}
                className={cn(
                  'h-0.5 w-full flex-row overflow-hidden bg-border',
                  isRTL && 'flex-row-reverse',
                )}
              >
                <View
                  className="h-full bg-brass"
                  style={{ width: `${progress * 100}%` }}
                />
              </View>

              <Button
                size="lg"
                label={t('reader.open')}
                onPress={open}
                testID="quran-open-reader"
                className={isRTL ? 'self-end' : 'self-start'}
              />
            </View>
          </View>
        </View>

        <Text variant="caption" tone="muted" className="mt-5">
          {t('reader.entryHint')}
        </Text>
      </Page>
    </Screen>
  );
}
