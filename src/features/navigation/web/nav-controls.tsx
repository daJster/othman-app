import { View } from 'react-native';
import { NavMenu } from '@/features/navigation/web/nav-menu';

/**
 * Trailing cluster of the web bar.
 *
 * One control at every width: the session/preferences menu. It is the only
 * part of the bar that is not a navigator child; `TabList` and every
 * `TabTrigger` must stay direct children because Expo Router discovers triggers
 * by element type.
 */
export function WebNavControls() {
  return (
    <View className="ms-auto flex-row items-center">
      <NavMenu />
    </View>
  );
}
