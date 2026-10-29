import { useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useTranslation } from 'react-i18next';
import { ReaderScreen } from '@/features/quran/reader-screen';

/**
 * Reader route.
 *
 * The page is a full-screen modal because the mushaf is a distinct mode: it
 * hides the tab bar, and its own page-turn gesture competes with the stack's
 * back-swipe (hence `predictiveBackGestureEnabled: false` in `app.config.ts`).
 * That presentation is declared once in the root layout (`src/app/_layout.tsx`),
 * not here, so the route's chrome cannot drift from the navigator that owns it.
 *
 * The segment is parsed here and nowhere else: a deep link can carry anything,
 * and the reader store expects a number. Non-integers fall back to the stored
 * page; a number outside the edition is clamped by `goToPage`, which is what
 * makes `/reader/9999` land on the last page instead of a 404 from the CDN.
 */
export default function ReaderRoute() {
  const { t } = useTranslation();
  const { page } = useLocalSearchParams<{ page?: string }>();

  const parsed = Number(page);
  const initialPage = Number.isInteger(parsed) ? parsed : null;

  return (
    <>
      <Head>
        <title>{`${t('nav.quran')} — ${initialPage ?? ''}`}</title>
      </Head>
      <ReaderScreen initialPage={initialPage} />
    </>
  );
}
