import { RNHostView } from '@expo/ui';
import { View } from 'react-native';
import { Text } from './text';

/**
 * A section title inside an `@expo/ui` `List`.
 *
 * `List` has no section API (unlike `FieldGroup`, which owns its own scroll
 * surface), so the title has to be an RN view hosted in the list.
 * `matchContents={{ vertical: true }}` takes the width from the list and the
 * height from the text, which keeps Arabic's taller line box from being clipped.
 *
 * Shared by Account and About so the two lists keep the same rhythm; every row
 * in them is hosted the same way.
 */
export function ListSectionHeader({ label }: { label: string }) {
  return (
    <RNHostView matchContents={{ vertical: true }}>
      <View className="px-4 pt-6 pb-2">
        <Text variant="overline" tone="muted">
          {label}
        </Text>
      </View>
    </RNHostView>
  );
}
