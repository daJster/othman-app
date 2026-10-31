import type { ReactElement, ReactNode } from 'react';
import {
  render as renderFromTestingLibrary,
  type RenderOptions,
} from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

/**
 * Render with the gesture root required by react-native-gesture-handler v3.
 *
 * The app supplies this in `src/app/_layout.tsx`; a component test renders the
 * screen directly, so without it every `GestureDetector` throws before the
 * assertion runs. Keeping the wrapper here avoids repeating it in each suite.
 */
export function render(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return renderFromTestingLibrary(ui, {
    wrapper: ({ children }: { children?: ReactNode }) => (
      <GestureHandlerRootView style={{ flex: 1 }}>
        {children}
      </GestureHandlerRootView>
    ),
    ...options,
  });
}
