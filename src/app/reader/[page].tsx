import { useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useTranslation } from 'react-i18next';
import { notesNamespace } from '@/core/domain/notes/notes';
import { ReaderLinkError } from '@/features/quran/components/reader-link-error';
import { parseQuranLink } from '@/features/quran/links';
import { ReaderScreen } from '@/features/quran/reader-screen';
import { useAuth } from '@/providers/auth-provider';

/**
 * Reader route.
 *
 * The page is a full-screen modal because the mushaf is a distinct mode: it
 * hides the tab bar, and its own page-turn gesture competes with the stack's
 * back-swipe (hence `predictiveBackGestureEnabled: false` in `app.config.ts`).
 * That presentation is declared once in the root layout (`src/app/_layout.tsx`),
 * not here, so the route's chrome cannot drift from the navigator that owns it.
 *
 * `page`, `surah` and `ayah` all go through `parseQuranLink`, the same parser
 * the `/quran` tab uses. Malformed or contradictory parameters render a
 * recoverable error rather than a fabricated position; a valid link is handed
 * to the screen, which applies it once the edition's geometry is attached (so
 * the ayah mapping can win over a contradictory page).
 *
 * The numeric page is still the route segment, which keeps `/reader/9999`
 * shareable: `goToPage` clamps it when it is the only parameter.
 */
export default function ReaderRoute() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    page?: string;
    surah?: string;
    ayah?: string;
  }>();

  const link = parseQuranLink(params);

  if (link.kind === 'invalid') {
    return (
      <>
        <Head>
          <title>{t('reader.linkInvalidTitle')}</title>
        </Head>
        <ReaderLinkError />
      </>
    );
  }

  const position =
    link.kind === 'link' ? link : { page: null, surah: null, ayah: null };

  return (
    <>
      <Head>
        <title>{`${t('nav.quran')} — ${position.page ?? ''}`}</title>
      </Head>
      <ReaderScreen
        initialPage={position.page}
        initialSurah={position.surah}
        initialAyah={position.ayah}
        notesNamespace={notesNamespace(user?.uid)}
      />
    </>
  );
}
