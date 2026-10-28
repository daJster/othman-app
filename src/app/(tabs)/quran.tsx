import { useTranslation } from 'react-i18next';
import Head from 'expo-router/head';
import { EmptyState } from '@/ui/states';
import { ScreenView } from '@/ui/screen';

/**
 * Quran tab — placeholder.
 *
 * The reader itself (image-based mushaf, bbox ayah selection, last-visited page)
 * is P5.3–P5.5 and lives in `src/app/reader/[page].tsx`, pushed on top of the
 * tabs. This tab is the entry point that will link into it.
 */
export default function QuranScreen() {
  const { t } = useTranslation();

  return (
    <ScreenView>
      <Head>
        <title>{`${t('nav.quran')} · ${t('app.name')}`}</title>
      </Head>
      <EmptyState title={t('nav.quran')} description={t('nav.quranDesc')} />
    </ScreenView>
  );
}
