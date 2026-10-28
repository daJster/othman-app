import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useTranslation } from 'react-i18next';
import { ScreenView } from '@/ui/screen';
import { ErrorState } from '@/ui/states';

/**
 * Unknown URL.
 *
 * Expo Router renders this for any path that matches no file — a stale deep
 * link, a typo, or a route deleted after the link was shared. It is the only
 * place a 404 can come from now that nav rows are registry-backed.
 *
 * `replace`, not `push`: the broken URL should not stay in the history, or the
 * back gesture returns to a page that does not exist.
 */
export default function NotFoundScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ScreenView>
      <Head>
        <title>{`${t('error.404.title')} · ${t('app.name')}`}</title>
      </Head>
      <ErrorState
        title={t('error.404.title')}
        description={t('error.404.description')}
        retryLabel={t('action.goBackHome')}
        onRetry={() => router.replace('/')}
      />
    </ScreenView>
  );
}
