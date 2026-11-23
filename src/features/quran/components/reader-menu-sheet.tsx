import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { IconName } from '@/core/config';
import { Icon } from '@/ui/icon';
import { NativeSheetContent } from '@/ui/native-sheet-content';
import { Pressable } from '@/ui/pressable';
import { Text } from '@/ui/text';
import { ThemedBottomSheet } from '@/ui/themed-bottom-sheet';

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
 * **No title row.** It is a bottom drawer: the drag indicator and the backdrop
 * are the dismissal, and a heading that only says "Reader menu" would spend a
 * line on a name the reader already knows. The sheet opens straight onto its
 * destinations.
 *
 * Theme is not here: day/night is a one-tap control in the header, and the
 * three-way choice (including "follow the system") lives on Account. The menu
 * is the only place that lists every destination; the header and footer expose
 * the two most-used ones directly, so nothing is more than one tap away.
 */
export type ReaderMenuAction =
  | 'surah'
  | 'edition'
  | 'read'
  | 'tafsir'
  | 'notes'
  | 'audio'
  | 'records'
  | 'share';

const ACTIONS: readonly {
  id: ReaderMenuAction;
  labelKey:
    | 'reader.menuSurah'
    | 'reader.menuMushaf'
    | 'reader.menuRead'
    | 'reader.menuTafsir'
    | 'reader.menuNotes'
    | 'reader.menuAudio'
    | 'reader.menuRecords'
    | 'reader.menuShare';
  icon: IconName;
}[] = [
  { id: 'surah', labelKey: 'reader.menuSurah', icon: 'book-open' },
  { id: 'edition', labelKey: 'reader.menuMushaf', icon: 'layers' },
  { id: 'read', labelKey: 'reader.menuRead', icon: 'file-text' },
  { id: 'tafsir', labelKey: 'reader.menuTafsir', icon: 'search' },
  { id: 'notes', labelKey: 'reader.menuNotes', icon: 'pencil' },
  { id: 'audio', labelKey: 'reader.menuAudio', icon: 'volume' },
  { id: 'records', labelKey: 'reader.menuRecords', icon: 'bookmark' },
  { id: 'share', labelKey: 'reader.menuShare', icon: 'external-link' },
];

export type ReaderMenuSheetProps = {
  isPresented: boolean;
  /** Selected ayah exists; content/audio destinations need one. */
  hasSelection: boolean;
  onDismiss: () => void;
  onSelect: (action: ReaderMenuAction) => void;
};

const SELECTION_ACTIONS: ReadonlySet<ReaderMenuAction> = new Set([
  'read',
  'tafsir',
  'notes',
  'audio',
]);

export function ReaderMenuSheet({
  isPresented,
  hasSelection,
  onDismiss,
  onSelect,
}: ReaderMenuSheetProps) {
  const { t } = useTranslation();
  const actions = hasSelection
    ? ACTIONS
    : ACTIONS.filter((action) => !SELECTION_ACTIONS.has(action.id));

  return (
    <ThemedBottomSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      testID="reader-menu-sheet"
    >
      <NativeSheetContent>
        <View className="gap-2">
          {actions.map((action) => (
            <Pressable
              key={action.id}
              className="flex-row items-center gap-3 rounded-chip px-3 py-3 active:bg-accent"
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
      </NativeSheetContent>
    </ThemedBottomSheet>
  );
}
