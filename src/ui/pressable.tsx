import type { ComponentType, RefAttributes } from 'react';
import {
  Pressable as NativePressable,
  type PressableProps,
  type View,
} from 'react-native';

/**
 * `Pressable` with react-native-web's `dataSet`.
 *
 * On web `dataSet={{ selected }}` becomes `data-selected`, which gives CSS and
 * end-to-end tests a stable hook for a state that has no text. On iOS/Android
 * the prop is inert — the native side reads `accessibilityState` instead.
 *
 * React Native's own types do not declare `dataSet` (only react-native-web
 * does, and TypeScript resolves `react-native` to the native types), so the
 * widening lives here rather than as a cast at every call site. The reader's
 * ayah overlay needs the same hook in P5.
 */
export type PressableDataSet = Record<string, string | number | boolean>;

export type WebPressableProps = PressableProps & {
  dataSet?: PressableDataSet;
};

export const Pressable = NativePressable as unknown as ComponentType<
  WebPressableProps & RefAttributes<View>
>;
