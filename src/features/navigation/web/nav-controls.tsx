import { View } from 'react-native';
import { LanguageMenu } from '@/features/navigation/web/language-menu';
import { NavMenu } from '@/features/navigation/web/nav-menu';
import { ThemeMenu } from '@/features/navigation/web/theme-menu';

/**
 * Trailing cluster of the web bar: session, appearance, language.
 *
 * The avatar comes first and the two preference controls follow it, so the
 * session is the first thing at the inline end and the settings sit outboard of
 * it. Three ghost controls, each with one job.
 *
 * They are the only part of the bar that is not a navigator child; `TabList`
 * and every `TabTrigger` must stay direct children because Expo Router
 * discovers triggers by element type.
 */
export function WebNavControls() {
  return (
    <View className="ms-auto flex-row items-center gap-0.5">
      <NavMenu />
      <ThemeMenu />
      <LanguageMenu />
    </View>
  );
}
