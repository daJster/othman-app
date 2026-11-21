import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { NoticesBell } from '@/features/home/notices-bell';
import {
  closeOpenBarMenuOnPress,
  useBarMenu,
} from '@/features/navigation/web/bar-menu';
import { LanguageMenu } from '@/features/navigation/web/language-menu';
import { NavMenu } from '@/features/navigation/web/nav-menu';
import { ThemeMenu } from '@/features/navigation/web/theme-menu';

/**
 * Trailing cluster of the web bar: inbox, session, appearance, language.
 *
 * The inbox comes first so it sits with the session controls rather than the
 * destinations: the three tabs are places, these four are state. It is the same
 * bell the hero panel renders, with the same unread dot and the same sheet —
 * one inbox, two doors.
 *
 * They are the only part of the bar that is not a navigator child; `TabList`
 * and every `TabTrigger` must stay direct children because Expo Router
 * discovers triggers by element type.
 *
 * **One press, one menu.** The three menus share the bar, so pressing a second
 * control while one is open has to both close the first and open the second.
 * The primitive can only be told to close through Escape, so the bar listens
 * for the press in the capture phase and sends it. Without this the press was
 * either swallowed by the menu's overlay (two clicks) or landed on the new
 * trigger while the old menu stayed mounted (two menus at once).
 */
export function WebNavControls() {
  const open = useBarMenu((state) => state.open);

  useEffect(() => {
    if (Platform.OS !== 'web' || !open) {
      return;
    }

    const onPointerDown = (event: Event) => closeOpenBarMenuOnPress(event);

    document.addEventListener('pointerdown', onPointerDown, true);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open]);

  return (
    <View className="ms-auto flex-row items-center gap-1">
      <NoticesBell variant="bar" />
      <NavMenu />
      <ThemeMenu />
      <LanguageMenu />
    </View>
  );
}
