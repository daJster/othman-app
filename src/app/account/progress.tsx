import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/i18n';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { ScreenView } from '@/ui/screen';
import { EmptyState } from '@/ui/states';
import { Text } from '@/ui/text';
import { View } from 'react-native';

/**
 * Memorisation progress — **stub**.
 *
 * P4.3 owns the route and the navigation into it; P4.4 replaces this body with
 * the 114-cell heatmap, summary and detail sheet. Keeping the route now means
 * the account row links somewhere real and the back gesture works, instead of
 * the row promising a page that does not exist.
 */
export default function ProgressScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isRTL } = useDirection();
  const backIcon = isRTL ? 'chevron-right' : 'chevron-left';

  return (
    <ScreenView>
      <Head>
        <title>{`${t('pages.account.progress.title')} · ${t('app.name')}`}</title>
      </Head>

      <View className="flex-row items-center gap-2 border-b border-border px-2 py-2">
        <Button
          variant="ghost"
          accessibilityLabel={t('action.back')}
          onPress={() => router.back()}
          testID="progress-back"
        >
          <Icon name={backIcon} />
          <Text variant="label">{t('action.back')}</Text>
        </Button>
        <Text variant="subtitle">{t('pages.account.progress.title')}</Text>
      </View>

      <EmptyState
        title={t('pages.account.progress.title')}
        description={t('pages.account.progress.empty')}
      />
    </ScreenView>
  );
}
