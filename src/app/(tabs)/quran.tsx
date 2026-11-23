import { useLocalSearchParams, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { notesNamespace } from '@/core/domain/notes/notes';
import { ReaderLinkError } from '@/features/quran/components/reader-link-error';
import { parseQuranLink } from '@/features/quran/links';
import { ReaderScreen } from '@/features/quran/reader-screen';
import { useAuth } from '@/providers/auth-provider';

/**
 * Quran tab — the reader, opened directly.
 *
 * Tapping the tab opens the mushaf itself at the last page read; there is no
 * landing surface in between. The screen is the same `ReaderScreen` the
 * `/reader/[page]` route presents as a full-screen modal, so a page turn cannot
 * behave differently depending on how the reader was opened.
 *
 * The tab is the reader's home ground, so it mounts it `embedded`: the modal's
 * exit control is absent because there is nowhere to return to — the tab bar is
 * the way out.
 *
 * A link such as `/quran?surah=2&ayah=255` still forwards to the reader route
 * with the same parameters. Validity is checked in two steps: the parser rejects
 * malformed or contradictory input here, while whether that ayah exists in the
 * edition is decided by the reader after its geometry attaches. Neither step
 * guesses a position.
 */
export default function QuranScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
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
    return <ReaderLinkError />;
  }

  // A valid link is forwarded by the effect above. Rendering nothing for that
  // frame keeps the tab's reader from mounting at the stored page and jumping.
  if (link.kind === 'link') return null;

  return (
    <>
      <Head>
        <title>{`${t('nav.quran')} · ${t('app.name')}`}</title>
      </Head>
      <ReaderScreen embedded notesNamespace={notesNamespace(user?.uid)} />
    </>
  );
}
