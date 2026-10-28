import { useTranslation } from 'react-i18next';
import Head from 'expo-router/head';
import { EmptyState } from '@/ui/states';
import { ScreenView } from '@/ui/screen';

/**
 * Account tab — placeholder.
 *
 * Sign-in (P3.3), the profile card and the progress heatmap (P4.4) all land
 * here. Until then this is deliberately inert rather than a fake account
 * screen: nothing here should promise data the app does not have yet.
 */
export default function AccountScreen() {
  const { t } = useTranslation();

  return (
    <ScreenView>
      <Head>
        <title>{`${t('nav.account')} · ${t('app.name')}`}</title>
      </Head>
      <EmptyState
        title={t('pages.account.progress.title')}
        description={t('pages.account.progress.empty')}
      />
    </ScreenView>
  );
}
