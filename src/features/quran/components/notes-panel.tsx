import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
import type { NoteAyah, QuranNote } from '@/core/domain/notes/notes';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { EmptyState, ErrorState, Loading } from '@/ui/states';
import { Text } from '@/ui/text';
import { useAyahNotes } from '../use-notes';

/**
 * Selected-ayah notes.
 *
 * The list is virtualized because a busy ayah can accumulate many notes, and
 * the composer sits outside the list so the save action stays reachable while
 * the keyboard is open (the list shrinks instead of pushing the button away).
 *
 * The draft is cleared only after `add` resolves. A rejected write leaves the
 * text and the failure in place, and saving again reuses the note's original id
 * (see `useAyahNotes`), so retrying cannot create a duplicate. The panel is
 * keyed by ayah identity by its parent, so a selection change remounts it and a
 * draft can never be submitted under the next ayah.
 */
export type NotesPanelProps = {
  namespace: string;
  /** Selected ayah, or `null` when nothing is selected. */
  ayah: NoteAyah | null;
};

export function NotesPanel({ namespace, ayah }: NotesPanelProps) {
  const { t } = useTranslation();
  const notes = useAyahNotes(namespace, ayah);
  const [draft, setDraft] = useState('');

  const submit = useCallback(async () => {
    if (draft.trim().length === 0 || notes.isAdding) return;

    try {
      await notes.add(draft);
      setDraft('');
    } catch {
      // Intentionally retained: the panel shows `notes.addError` and the
      // composer keeps the text so the user can retry without retyping.
    }
  }, [draft, notes]);

  if (ayah === null) return null;

  const rows = notes.state.status === 'ready' ? notes.state.data : [];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="gap-3"
      testID="notes-panel"
    >
      <View className="max-h-72 min-h-24">
        {notes.state.status === 'pending' ? (
          <Loading label={t('action.loading')} testID="notes-loading" />
        ) : null}

        {notes.state.status === 'error' ? (
          <ErrorState
            title={t('state.errorTitle')}
            description={t('state.errorDescription')}
            onRetry={notes.state.retry}
            testID="notes-error-state"
          />
        ) : null}

        {notes.state.status === 'empty' ? (
          <EmptyState
            title={t('reader.notesEmptyTitle')}
            description={t('reader.notesEmptyDescription')}
            testID="notes-empty"
          />
        ) : null}

        {notes.state.status === 'ready' ? (
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            testID="notes-list"
            renderItem={({ item }) => <NoteRow note={item} />}
          />
        ) : null}
      </View>

      {notes.addError ? (
        <Text variant="caption" tone="destructive" testID="notes-save-error">
          {t('reader.notesSaveError')}
        </Text>
      ) : null}

      <View className="gap-2">
        <Input
          value={draft}
          onChangeText={setDraft}
          multiline
          numberOfLines={3}
          placeholder={t('reader.notesPlaceholder')}
          accessibilityLabel={t('reader.notesPlaceholder')}
          editable={!notes.isAdding}
          className="min-h-20"
          testID="notes-draft"
        />
        <Button
          size="sm"
          label={
            notes.isAdding ? t('reader.notesSaving') : t('reader.notesSave')
          }
          onPress={() => void submit()}
          disabled={draft.trim().length === 0 || notes.isAdding}
          testID="notes-save"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function NoteRow({ note }: { note: QuranNote }) {
  return (
    <View className="border-border gap-1 border-b py-2">
      <Text variant="body" selectable testID={`note:${note.id}`}>
        {note.text}
      </Text>
    </View>
  );
}
