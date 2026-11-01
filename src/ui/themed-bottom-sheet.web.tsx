import { BottomSheet } from '@expo/ui';
import type { ComponentProps } from 'react';
import { useResolveClassNames } from 'uniwind';

type BottomSheetProps = ComponentProps<typeof BottomSheet>;

/**
 * `BottomSheet` with the app's surface colour.
 *
 * `@expo/ui` defaults the web sheet chrome to white. A dark reader opening a
 * white panel is a theme failure, so the sheet is painted from the same
 * `background` token as the page.
 */
export function ThemedBottomSheet({ children, ...props }: BottomSheetProps) {
  const { backgroundColor } = useResolveClassNames('bg-background');

  return (
    <BottomSheet {...props} containerColor={backgroundColor}>
      {children}
    </BottomSheet>
  );
}
