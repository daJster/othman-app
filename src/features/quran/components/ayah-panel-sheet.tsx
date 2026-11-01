import { BottomSheet } from '@expo/ui';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import type { NoteAyah } from '@/core/domain/notes/notes';
import type { AyahContent } from '@/core/types';
import type { AsyncPresentResult } from '@/features/query/async-state';
import { useDirection } from '@/i18n';
import { Button } from '@/ui/button';
import { NativeSheetContent } from '@/ui/native-sheet-content';
import { ErrorState, Loading } from '@/ui/states';
import { Text } from '@/ui/text';
import { buildAyahBlocks } from '../ayah-content';
import { formatReaderNumber } from '../format';
import { AyahDisplayer } from './ayah-displayer';
import { NotesPanel } from './notes-panel';
import { TafsirPanel } from './tafsir-panel';

/**
 * Read / Tafsir / Notes panels.
 *
 * P5.4 owns the surface; P5.5 fills the Read panel, P6.1 added audio, and P6.2
 * fills Notes. Tafsir (P6.3) still keeps its own content package. Each panel
 * needs the same three ingredients, which this sheet provides: a selected
 * canonical identity, an honest loading/error/ready boundary, and a dismissal
 * that cannot contradict the page underneath.
 *
 * `ayahKey` is an ayah-in-surah string. The canonical identity (surah + ayah)
 * is assembled from the selected row, so a page that crosses a surah boundary
 * cannot label one surah's ayah 1 as another's.
 *
 * Tafsir stays deliberately honest rather than empty: it says which ayah the
 * panel is about and that the content is not in this package yet. Showing a
 * blank panel (or a spinner that never resolves) would look like a bug in the
 * reader instead of an unfinished package.
 */
export type ReaderPanel = 'read' | 'tafsir' | 'notes';

const PANEL_COPY = {
  read: {
    titleKey: 'reader.panelReadTitle',
  },
  tafsir: {
    titleKey: 'reader.panelTafsirTitle',
  },
  notes: {
    titleKey: 'reader.panelNotesTitle',
  },
} as const;

export type AyahPanelSheetProps = {
  panel: ReaderPanel | null;
  /** Surah of the selected ayah, or `null` when nothing is selected. */
  surah: number | null;
  surahName: string | null;
  /** Ayah-in-surah key of the selected ayah, or `null`. */
  ayahKey: string | null;
  /**
   * The selected ayah's text. Only the Read panel reads it; Tafsir and Notes
   * keep their own content packages.
   */
  content: AsyncPresentResult<AyahContent>;
  /** Local notes scope: the signed-in account or the explicit guest. */
  notes?: {
    namespace: string;
    ayah: NoteAyah | null;
  };
  /** Canonical selected ayah for content sources (P6.3). */
  ayah?: NoteAyah | null;
  onDismiss: () => void;
};

export function AyahPanelSheet({
  panel,
  surah,
  surahName,
  ayahKey,
  content,
  notes = { namespace: 'guest', ayah: null },
  ayah = null,
  onDismiss,
}: AyahPanelSheetProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const copy = panel ? PANEL_COPY[panel] : null;
  const selected = panel !== null && ayahKey !== null && surah !== null;

  return (
    <BottomSheet
      isPresented={panel !== null}
      onDismiss={onDismiss}
      testID="ayah-panel-sheet"
    >
      {copy ? (
        <NativeSheetContent>
          <View className="gap-3">
            <View className="flex-row items-center justify-between gap-2">
              <Text variant="subtitle">{t(copy.titleKey)}</Text>
              <Button
                variant="ghost"
                size="sm"
                label={t('action.close')}
                onPress={onDismiss}
                testID="ayah-panel-close"
              />
            </View>

            {selected ? (
              <>
                <Text
                  variant="caption"
                  tone="muted"
                  testID="ayah-panel-identity"
                >
                  {t('reader.selectedAyah', {
                    ayah: formatReaderNumber(Number(ayahKey), language),
                    surah: surahName ?? formatReaderNumber(surah, language),
                  })}
                </Text>

                {panel === 'read' ? (
                  <ReadPanelBody
                    content={content}
                    ayahNumber={ayahKey === null ? null : Number(ayahKey)}
                  />
                ) : null}

                {panel === 'notes' ? (
                  <NotesPanel
                    // Remount per ayah: a draft belongs to the ayah it was typed
                    // for, and an in-flight save must not leak into the next one.
                    key={`${notes.namespace}:${notes.ayah?.absoluteNumber ?? 0}`}
                    namespace={notes.namespace}
                    ayah={notes.ayah}
                  />
                ) : null}

                {panel === 'tafsir' ? <TafsirPanel ayah={ayah} /> : null}
              </>
            ) : (
              <Text variant="body" tone="muted" testID="ayah-panel-empty">
                {t('reader.panelNeedsSelection')}
              </Text>
            )}
          </View>
        </NativeSheetContent>
      ) : null}
    </BottomSheet>
  );
}

/**
 * The Read panel's four states.
 *
 * `Loading` and `ErrorState` are wrapped in a bounded box because they centre
 * themselves with `flex-1`, and a sheet has no natural height to fill. The
 * ready state is a `ScrollView` with a *maximum* height rather than a fixed
 * one: at 200% text size the content grows and scrolls instead of clipping.
 */
function ReadPanelBody({
  content,
  ayahNumber,
}: {
  content: AsyncPresentResult<AyahContent>;
  ayahNumber: number | null;
}) {
  const { t } = useTranslation();

  if (content.state.status === 'pending') {
    return (
      <View className="h-40">
        <Loading label={t('action.loading')} testID="ayah-panel-loading" />
      </View>
    );
  }

  if (content.state.status === 'error') {
    return (
      <View className="h-56">
        <ErrorState
          title={t('state.errorTitle')}
          description={t('state.errorDescription')}
          onRetry={content.state.retry}
        />
      </View>
    );
  }

  return (
    <ScrollView className="max-h-96" testID="ayah-panel-content">
      <AyahDisplayer
        blocks={buildAyahBlocks(content.state.data)}
        ayahNumber={ayahNumber}
      />
    </ScrollView>
  );
}
