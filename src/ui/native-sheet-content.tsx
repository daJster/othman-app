import { RNHostView } from '@expo/ui';
import type { ReactElement } from 'react';

/**
 * React Native content inside a native `BottomSheet`.
 *
 * `@expo/ui`'s sheet is a SwiftUI/Compose surface, not an RN view. RN children
 * mounted directly inside it render but do not receive touches on Android: the
 * Compose sheet owns the gesture layer and the RN subtree sits outside it.
 * `RNHostView` creates the bridge surface, and `matchContents` lets the sheet
 * size to the content instead of collapsing to zero height.
 */
export type NativeSheetContentProps = {
  children: ReactElement;
};

export function NativeSheetContent({ children }: NativeSheetContentProps) {
  return <RNHostView matchContents={{ vertical: true }}>{children}</RNHostView>;
}
