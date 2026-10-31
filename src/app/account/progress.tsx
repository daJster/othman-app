import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { ProgressSummary } from '@/features/progress/progress-summary';
import { RequireAuth } from '@/features/auth/require-auth';
import { SurahDetailSheet } from '@/features/progress/surah-detail-sheet';
import { SurahHeatmap } from '@/features/progress/surah-heatmap';
import { useSurahProgress } from '@/features/progress/use-surah-progress';
import { useDirection } from '@/i18n';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Screen, ScreenView } from '@/ui/screen';
import { EmptyState, ErrorState, Loading } from '@/ui/states';
import { Text } from '@/ui/text';

/**
 * Memorisation progress.
 *
 * Pushed from the account tab, so it owns a back control — the root stack hides
 * headers everywhere and builds one per screen. The three states (loading,
 * error, empty) keep the header mounted so the user can always leave; only the
 * body swaps.
 *
 * Selection is a `surahNumber`, not a row: the sheet reads the row from the same
 * array the grid draws, so a refetch cannot leave the sheet showing a value the
 * grid no longer displays.
 */
export default function ProgressScreen() {
  return (
    <RequireAuth>
      <ProgressContent />
    </RequireAuth>
  );
}

function ProgressContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isRTL } = useDirection();
  const { state } = useSurahProgress();
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);

  const title = t('pages.account.progress.title');
  const backIcon = isRTL ? 'chevron-right' : 'chevron-left';

  const rows = state.status === 'ready' ? state.data : [];
  const selectedRow =
    rows.find((row) => row.surahNumber === selectedSurah) ?? null;

  let body: ReactNode;

  if (state.status === 'pending') {
    body = <Loading label={t('action.loading')} />;
  } else if (state.status === 'error') {
    body = (
      <ErrorState
        title={t('state.errorTitle')}
        description={t('state.errorDescription')}
        onRetry={state.retry}
      />
    );
  } else if (state.status === 'empty') {
    body = (
      <EmptyState
        title={title}
        description={t('pages.account.progress.empty')}
      />
    );
  } else {
    body = (
      <Screen contentContainerClassName="gap-6 md:mx-auto md:max-w-3xl lg:max-w-4xl">
        <ProgressSummary rows={state.data} />

        <View className="gap-3">
          <Text
            variant="label"
            accessibilityRole="header"
            testID="progress-grid-title"
          >
            {t('pages.account.progress.gridTitle')}
          </Text>
          <SurahHeatmap
            rows={state.data}
            selectedSurah={selectedSurah}
            onSelect={setSelectedSurah}
          />
        </View>
      </Screen>
    );
  }

  return (
    <ScreenView>
      <Head>
        <title>{`${title} · ${t('app.name')}`}</title>
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
        <Text variant="subtitle">{title}</Text>
      </View>

      {body}

      {state.status === 'ready' ? (
        <SurahDetailSheet
          row={selectedRow}
          onClose={() => setSelectedSurah(null)}
        />
      ) : null}
    </ScreenView>
  );
}
