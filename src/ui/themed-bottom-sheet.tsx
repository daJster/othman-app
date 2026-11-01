import { BottomSheet } from '@expo/ui';
import type { ComponentProps } from 'react';

type BottomSheetProps = ComponentProps<typeof BottomSheet>;

/**
 * `BottomSheet` with the app's surface colour.
 *
 * Native sheets already follow the platform colour scheme, so the native
 * wrapper is a pass-through. Web needs the explicit token paint (see
 * `themed-bottom-sheet.web.tsx`); this split also keeps the Uniwind colour
 * resolver out of native tests.
 */
export function ThemedBottomSheet(props: BottomSheetProps) {
  return <BottomSheet {...props} />;
}
