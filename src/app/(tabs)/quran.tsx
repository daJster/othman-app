import { useLocalSearchParams, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import {
  useReaderPage,
  useRestoreReader,
} from '@/features/quran/store/use-reader';
import { parseQuranLink } from '@/features/quran/links';
import { Button } from '@/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/ui/card';
import { Screen, ScreenView } from '@/ui/screen';
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

  useRestoreReader();
  const page = useReaderPage();

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

  return (
    <Screen contentContainerClassName="gap-4 p-4">
      <Head>
        <title>{`${t('nav.quran')} · ${t('app.name')}`}</title>
      </Head>

      <View className="gap-1">
        <Text variant="title">{t('nav.quran')}</Text>
        <Text tone="muted">{t('nav.quranDesc')}</Text>
      </View>

      <Card>
        <CardTitle>{t('reader.continueTitle')}</CardTitle>
        <CardDescription>
          {t('reader.continueDescription', { page })}
        </CardDescription>
        <CardContent>
          <Button
            size="lg"
            label={t('reader.open')}
            onPress={open}
            testID="quran-open-reader"
          />
        </CardContent>
      </Card>

      <Text variant="caption" tone="muted">
        {t('reader.entryHint')}
      </Text>
    </Screen>
  );
}
