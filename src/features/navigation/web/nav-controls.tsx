import { View } from 'react-native';
import { NoticesBell } from '@/features/home/notices-bell';
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
 */
export function WebNavControls() {
  return (
    <View className="ms-auto flex-row items-center gap-0.5">
      <NoticesBell variant="bar" />
      <NavMenu />
      <ThemeMenu />
      <LanguageMenu />
    </View>
  );
}
