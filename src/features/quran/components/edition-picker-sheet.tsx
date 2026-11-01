import { ThemedBottomSheet } from '@/ui/themed-bottom-sheet';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { QuranEdition } from '@/core/types';
import { useDirection } from '@/i18n';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { NativeSheetContent } from '@/ui/native-sheet-content';
import { Pressable } from '@/ui/pressable';
import { Text } from '@/ui/text';
import { formatReaderNumber } from '../format';

/**
 * Edition picker and summary.
 *
 * The row states what actually differs between editions — name, riwaya, and
 * the page range — because "Tajweed" and "MedinaOld" mean nothing to a reader
 * who has not seen the two scans. The range is also the honest place to show
 * that editions do not share page numbers: a jump keeps the page, clamped.
 *
 * Choosing a row only *requests* the edition. The reader fetches that edition's
 * geometry first and attaches it atomically; rendering the new name here before
 * its boxes exist would label the old scan with the new edition.
 */
export type EditionPickerSheetProps = {
  isPresented: boolean;
  editions: Readonly<Record<string, QuranEdition>>;
  currentKey: string | null;
  onDismiss: () => void;
  onSelect: (editionKey: string) => void;
};

export function EditionPickerSheet({
  isPresented,
  editions,
  currentKey,
  onDismiss,
  onSelect,
}: EditionPickerSheetProps) {
  const { t } = useTranslation();
  const { language } = useDirection();

  const rows = useMemo(
    () => Object.values(editions).sort((a, b) => a.key.localeCompare(b.key)),
    [editions],
  );

  return (
    <ThemedBottomSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      testID="edition-picker-sheet"
    >
      <NativeSheetContent>
        <View className="gap-3">
          <View className="flex-row items-center justify-between gap-2">
            <Text variant="subtitle">{t('reader.editionPickerTitle')}</Text>
            <Button
              variant="ghost"
              size="sm"
              label={t('action.close')}
              onPress={onDismiss}
              testID="edition-picker-close"
            />
          </View>

          {rows.map((edition) => {
            const selected = edition.key === currentKey;

            return (
              <Pressable
                key={edition.key}
                className={
                  selected
                    ? 'flex-row items-center gap-3 rounded-lg bg-muted px-3 py-3'
                    : 'flex-row items-center gap-3 rounded-lg px-3 py-3'
                }
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${edition.name} — ${edition.riwaya}`}
                onPress={() => onSelect(edition.key)}
                testID={`edition-row:${edition.key}`}
              >
                <View className="min-w-0 flex-1 gap-1">
                  <Text variant="label" numberOfLines={1}>
                    {edition.name}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {edition.riwaya} ·{' '}
                    {t('reader.editionPages', {
                      first: formatReaderNumber(edition.firstPage, language),
                      last: formatReaderNumber(edition.lastPage, language),
                    })}
                  </Text>
                </View>

                {selected ? (
                  <>
                    <Text variant="caption" tone="muted">
                      {t('reader.editionSelected')}
                    </Text>
                    <Icon name="check-circle" size={18} tone="primary" />
                  </>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </NativeSheetContent>
    </ThemedBottomSheet>
  );
}
