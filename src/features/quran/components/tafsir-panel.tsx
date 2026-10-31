import { Column, Host, Picker } from '@expo/ui';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import type { ContentBody, ContentType } from '@/core/types';
import { Button } from '@/ui/button';
import { EmptyState, ErrorState, Loading } from '@/ui/states';
import { Text } from '@/ui/text';
import type { SelectedAyah } from '../ayah-content';
import { useTafsirPanel } from '../use-tafsir';

/**
 * Tafsir / e3rab / translation / surah-info panel.
 *
 * The type and source pickers are native `@expo/ui` controls inside one `Host`.
 * Each content state is honest and local to the selected source: pending,
 * retryable error, legitimate empty, and ready text. The reader selection is
 * never cleared by a content failure — retry re-runs only this panel.
 *
 * Text is selectable and carries its own direction from the provider
 * (`book.language.direction`), so an English translation stays LTR inside the
 * Arabic reader and Arabic tafsir stays RTL inside an English one.
 */
export type TafsirPanelProps = {
  ayah: SelectedAyah | null;
};

const TYPE_LABEL_KEY = {
  surah: 'reader.contentTypeSurah',
  tafsir: 'reader.contentTypeTafsir',
  e3rab: 'reader.contentTypeE3rab',
  translation: 'reader.contentTypeTranslation',
} as const satisfies Record<ContentType, string>;

const TYPES: readonly ContentType[] = [
  'tafsir',
  'e3rab',
  'translation',
  'surah',
];

export function TafsirPanel({ ayah }: TafsirPanelProps) {
  const { t } = useTranslation();
  const panel = useTafsirPanel(ayah);

  if (ayah === null) {
    return (
      <Text variant="body" tone="muted" testID="tafsir-needs-selection">
        {t('reader.panelNeedsSelection')}
      </Text>
    );
  }

  const isBookType = panel.type !== 'surah';

  return (
    <View className="gap-3" testID="tafsir-panel">
      <Host matchContents={{ vertical: true }} style={{ alignSelf: 'stretch' }}>
        <Column spacing={12}>
          <Picker
            selectedValue={panel.type}
            onValueChange={(value) => panel.setType(value as ContentType)}
            testID="tafsir-type"
          >
            {TYPES.map((type) => (
              <Picker.Item
                key={type}
                label={t(TYPE_LABEL_KEY[type])}
                value={type}
              />
            ))}
          </Picker>

          {isBookType && panel.sources.state.status === 'ready' ? (
            <Picker
              selectedValue={panel.sourceId ?? -1}
              onValueChange={(value) => {
                if (typeof value === 'number' && value > 0) {
                  panel.setSourceId(value);
                }
              }}
              testID="tafsir-source"
            >
              {panel.sources.state.data.map((source) => (
                <Picker.Item
                  key={source.id}
                  label={
                    source.author
                      ? `${source.name} — ${source.author}`
                      : source.name
                  }
                  value={source.id}
                />
              ))}
            </Picker>
          ) : null}
        </Column>
      </Host>

      {isBookType ? (
        <BookContent panel={panel} />
      ) : (
        <SurahInformation panel={panel} />
      )}
    </View>
  );
}

function BookContent({ panel }: { panel: ReturnType<typeof useTafsirPanel> }) {
  const { t } = useTranslation();

  if (panel.sources.state.status === 'pending') {
    return (
      <View className="h-40">
        <Loading label={t('action.loading')} testID="tafsir-loading" />
      </View>
    );
  }

  if (panel.sources.state.status === 'error') {
    return (
      <View className="h-56">
        <ErrorState
          title={t('state.errorTitle')}
          description={t('state.errorDescription')}
          onRetry={panel.sources.state.retry}
          testID="tafsir-sources-error"
        />
      </View>
    );
  }

  if (panel.sources.state.status === 'empty') {
    return (
      <View className="gap-2" testID="tafsir-sources-empty">
        <Text variant="body" tone="muted">
          {t('reader.contentSourcesEmpty')}
        </Text>
        <Button
          variant="outline"
          size="sm"
          label={t('action.retry')}
          onPress={panel.retrySources}
          testID="tafsir-sources-retry"
        />
      </View>
    );
  }

  if (panel.content.state.status === 'pending') {
    return (
      <View className="h-40">
        <Loading label={t('action.loading')} testID="tafsir-loading" />
      </View>
    );
  }

  if (panel.content.state.status === 'error') {
    return (
      <View className="h-56">
        <ErrorState
          title={t('state.errorTitle')}
          description={t('state.errorDescription')}
          onRetry={panel.content.state.retry}
          testID="tafsir-error-state"
        />
      </View>
    );
  }

  if (panel.content.state.status === 'empty') {
    return (
      <EmptyState
        title={t('reader.contentEmptyTitle')}
        description={t('reader.contentEmptyDescription')}
        testID="tafsir-empty"
      />
    );
  }

  return <ContentText body={panel.content.state.data} />;
}

function ContentText({ body }: { body: ContentBody }) {
  if (body.status === 'empty') return null;

  return (
    <ScrollView className="max-h-96" testID="tafsir-content">
      <Text
        variant="body"
        selectable
        className="leading-relaxed"
        style={{
          writingDirection: body.direction,
          textAlign: body.direction === 'rtl' ? 'right' : 'left',
        }}
      >
        {body.text}
      </Text>
    </ScrollView>
  );
}

function SurahInformation({
  panel,
}: {
  panel: ReturnType<typeof useTafsirPanel>;
}) {
  const { t } = useTranslation();

  if (panel.surahInfo.state.status === 'pending') {
    return (
      <View className="h-40">
        <Loading label={t('action.loading')} testID="tafsir-loading" />
      </View>
    );
  }

  if (panel.surahInfo.state.status === 'error') {
    return (
      <View className="h-56">
        <ErrorState
          title={t('state.errorTitle')}
          description={t('state.errorDescription')}
          onRetry={panel.surahInfo.state.retry}
          testID="tafsir-error-state"
        />
      </View>
    );
  }

  if (panel.surahInfo.state.status === 'empty') {
    return (
      <EmptyState
        title={t('reader.contentEmptyTitle')}
        description={t('reader.contentEmptyDescription')}
        testID="tafsir-empty"
      />
    );
  }

  return (
    <ScrollView className="max-h-96" testID="tafsir-surah-info">
      {panel.surahInfo.state.data.map((section) => (
        <View key={section.key} className="gap-1 py-1">
          <Text variant="subtitle">{section.title}</Text>
          <Text
            variant="body"
            selectable
            className="leading-relaxed"
            style={{ writingDirection: 'rtl', textAlign: 'right' }}
            testID={`tafsir-surah-section:${section.key}`}
          >
            {section.text}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
