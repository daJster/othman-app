import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Page } from '@/ui/page';
import { PageHeader } from '@/ui/page-header';
import { Screen, ScreenView } from '@/ui/screen';
import { Section } from '@/ui/section';
import { Text } from '@/ui/text';
import { HISTORY_MILESTONES } from './timeline';

/**
 * The history of the mushaf.
 *
 * A pushed page, so it owns a back control and keeps the reader's measured
 * column. The page is a reading sequence, not a timeline graphic: one Section
 * title, then one hairline band per milestone with the era as an overline, the
 * body at the reading measure, and the source as a caption.
 *
 * Every string here is descriptive and sourced. The data file is the guard
 * against invented history; this screen only renders it.
 */
export function HistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const title = t('quran.history.title');

  return (
    <ScreenView>
      <Head>
        <title>{`${title} · ${t('app.name')}`}</title>
      </Head>

      <PageHeader
        title={title}
        onBack={() => router.back()}
        backTestID="quran-history-back"
      />

      <Screen contentContainerClassName="gap-0 p-0">
        <Page width="default" className="pt-6 pb-10">
          <Section
            title={t('quran.landing.history')}
            level={2}
            titleVariant="heading"
            titleTestID="quran-history-title"
          />

          <Text variant="body" tone="muted" className="mt-2 max-w-md">
            {t('quran.history.intro')}
          </Text>

          {HISTORY_MILESTONES.map((milestone) => (
            <View
              key={milestone.id}
              testID={`quran-history-milestone-${milestone.id}`}
              className="mt-6 border-t border-border py-6"
            >
              <Text variant="overline" tone="muted">
                {t(milestone.eraKey)}
              </Text>

              <Text className="mt-2 max-w-md">{t(milestone.bodyKey)}</Text>

              <Text
                variant="caption"
                tone="muted"
                testID={`quran-history-source-${milestone.id}`}
                className="mt-3 max-w-md"
              >
                {t('quran.history.source')} · {milestone.source}
              </Text>
            </View>
          ))}
        </Page>
      </Screen>
    </ScreenView>
  );
}
