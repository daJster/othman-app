import { useTranslation } from 'react-i18next';
import { Platform, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '@/ui/cn';
import { NativeSheetContent } from '@/ui/native-sheet-content';
import { SheetHeader } from '@/ui/sheet-header';
import { ThemedBottomSheet } from '@/ui/themed-bottom-sheet';
import { NoticesPanel } from './notices-panel';

/** The drag handle and its breathing room sit above the native content host. */
const SHEET_HANDLE_SPACE = 56;
/** Vertical padding, header, and the gap above the tray. */
const SHEET_HEADER_SPACE = 88;

/**
 * The phone inbox.
 *
 * The tray itself is shared with the web popover: newest-first paging, the same
 * unread markers, and a row press that marks only that notice read. The sheet
 * remains native chrome with its drag indicator and platform dismissal.
 *
 * Opening the tray never clears unread state. A notice is marked read only when
 * its row is pressed, so the bell dot and row marker stay in sync with web.
 */
export type NoticesSheetProps = {
  open: boolean;
  onClose: () => void;
};

export function NoticesSheet({ open, onClose }: NoticesSheetProps) {
  const { t } = useTranslation();
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Native sheets host RN without a width; web dialogs already constrain it.
  const native = Platform.OS !== 'web';
  const sheetHeight = Math.max(
    0,
    window.height - insets.top - insets.bottom - SHEET_HANDLE_SPACE,
  );
  const trayHeight = Math.max(0, sheetHeight - SHEET_HEADER_SPACE);
  const sheetStyle = native
    ? {
        width: Math.max(0, window.width - 32),
        height: sheetHeight,
      }
    : undefined;

  return (
    <ThemedBottomSheet
      isPresented={open}
      onDismiss={onClose}
      showDragIndicator={Platform.OS !== 'web'}
      // Native fills the screen; web sizes its dialog to the tray's content.
      snapPoints={Platform.OS === 'web' ? undefined : ['full']}
      testID="notices-sheet"
    >
      <NativeSheetContent>
        {/*
         * A native sheet host has no width to give its RN subtree: without an
         * explicit measure the text lays out at its intrinsic width and runs
         * off the right edge of the sheet. The window minus a gutter is the
         * native sheet's width; the web dialog constrains itself separately.
         */}
        <View
          style={sheetStyle}
          className={cn(
            'gap-5 p-4 pb-6',
            native && 'flex-1',
            Platform.OS === 'web' && 'mx-auto w-full max-w-xl py-6',
          )}
        >
          <SheetHeader title={t('home.notices.title')} />

          <NoticesPanel
            availableHeight={native ? trayHeight : undefined}
            extended={native}
            limit={native ? 12 : undefined}
          />
        </View>
      </NativeSheetContent>
    </ThemedBottomSheet>
  );
}
