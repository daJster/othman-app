import { useTranslation } from 'react-i18next';
import Head from 'expo-router/head';
import { EmptyState } from '@/ui/states';
import { ScreenView } from '@/ui/screen';

/**
 * Meetings tab — placeholder.
 *
 * The list, the status badges and the day picker are P4.2; the data path
 * (`meetingsService` + query hooks) is wired in P3.4 so the screen never
 * fetches inside an effect.
 */
export default function MeetingsScreen() {
  const { t } = useTranslation();

  return (
    <ScreenView>
      <Head>
        <title>{`${t('nav.meetings')} · ${t('app.name')}`}</title>
      </Head>
      <EmptyState
        title={t('page.meetings.header.title')}
        description={t('page.meetings.list.empty')}
      />
    </ScreenView>
  );
}
