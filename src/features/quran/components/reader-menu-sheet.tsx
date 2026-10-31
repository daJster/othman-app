import { BottomSheet } from '@expo/ui';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { IconName } from '@/core/config';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Pressable } from '@/ui/pressable';
import { Text } from '@/ui/text';

/**
 * The reader's menu.
 *
 * Implemented as a `BottomSheet` rather than the native `@expo/ui` `MenuView`
 * on purpose: `MenuView` is Android/iOS-only and its own documentation says the
 * trigger renders but actions never fire on web. The reader is a cross-platform
 * surface (P8.2), so a control that is silently inert on one target is worse
 * than a sheet that behaves the same everywhere. The sheet is still native
 * (SwiftUI / Compose / vaul), so it keeps platform drag and backdrop behaviour.
 *
 * The menu is the only place that lists every destination; the header and
 * footer expose the two most-used ones directly, so nothing is more than one
 * tap away.
 */
export type ReaderMenuAction =
  'surah' | 'edition' | 'read' | 'tafsir' | 'notes' | 'audio' | 'share';

const ACTIONS: readonly {
  id: ReaderMenuAction;
  labelKey:
    | 'reader.menuSurah'
    | 'reader.menuEdition'
    | 'reader.menuRead'
    | 'reader.menuTafsir'
    | 'reader.menuNotes'
    | 'reader.menuAudio'
    | 'reader.menuShare';
  icon: IconName;
}[] = [
  { id: 'surah', labelKey: 'reader.menuSurah', icon: 'book-open' },
  { id: 'edition', labelKey: 'reader.menuEdition', icon: 'layers' },
  { id: 'read', labelKey: 'reader.menuRead', icon: 'file-text' },
  { id: 'tafsir', labelKey: 'reader.menuTafsir', icon: 'search' },
  { id: 'notes', labelKey: 'reader.menuNotes', icon: 'pencil' },
  { id: 'audio', labelKey: 'reader.menuAudio', icon: 'volume' },
  { id: 'share', labelKey: 'reader.menuShare', icon: 'external-link' },
];

export type ReaderMenuSheetProps = {
  isPresented: boolean;
  onDismiss: () => void;
  onSelect: (action: ReaderMenuAction) => void;
};

export function ReaderMenuSheet({
  isPresented,
  onDismiss,
  onSelect,
}: ReaderMenuSheetProps) {
  const { t } = useTranslation();

  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      testID="reader-menu-sheet"
    >
      <View className="gap-2">
        <View className="flex-row items-center justify-between gap-2">
          <Text variant="subtitle">{t('reader.menuTitle')}</Text>
          <Button
            variant="ghost"
            size="sm"
            label={t('action.close')}
            onPress={onDismiss}
            testID="reader-menu-close"
          />
        </View>

        {ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            className="active:bg-muted flex-row items-center gap-3 rounded-lg px-3 py-3"
            accessibilityRole="button"
            accessibilityLabel={t(action.labelKey)}
            onPress={() => onSelect(action.id)}
            testID={`reader-menu-${action.id}`}
          >
            <Icon name={action.icon} size={20} tone="muted" />
            <Text variant="label">{t(action.labelKey)}</Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}
