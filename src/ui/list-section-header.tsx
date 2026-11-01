import { RNHostView } from '@expo/ui';
import { Platform, View } from 'react-native';
import { Text } from './text';

/**
 * A section title inside an `@expo/ui` `List`.
 *
 * `List` has no section API (unlike `FieldGroup`, which owns its own scroll
 * surface), so the title has to be an RN view hosted in the list.
 * `matchContents={{ vertical: true }}` takes the width from the list and the
 * height from the text, which keeps Arabic's taller line box from being clipped.
 *
 * On web the same label is returned without the host wrapper: `@expo/ui`'s web
 * fallback is not used there (see the Account web rows), so the plain RN view
 * is already inside an RN layout.
 *
 * The label is a quiet brass overline. `brass-ink` is the token for small brass
 * text on a background surface — `brass` itself is line work on canopy.
 */
export function ListSectionHeader({ label }: { label: string }) {
  const content = (
    <View className="px-4 pt-6 pb-2">
      <Text variant="overline" className="text-brass-ink">
        {label}
      </Text>
    </View>
  );

  if (Platform.OS === 'web') return content;

  return <RNHostView matchContents={{ vertical: true }}>{content}</RNHostView>;
}
