import { useLayoutEffect, useRef } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/ui/motion';
import type { SwipeAxis, SwipeDirection } from './swipe';
import { useSwipeGesture } from './use-swipe-gesture';

/**
 * A swipe plus the transition of the element it replaces.
 *
 * The gesture reports the physical direction. The owner updates the page,
 * which changes `transitionKey`; just before that new content paints, this hook
 * places it a short distance back along the thumb's axis and animates it and
 * its opacity into place. That uses explicit shared values instead of mount
 * animations, so the response is immediate and the transition runs on the UI
 * thread.
 *
 * Direction is physical, never language-derived. A surface maps it to its own
 * next/previous meaning before calling `onSwipe`.
 */
export type SwipeTransitionOptions = {
  onSwipe: (direction: SwipeDirection) => void;
  /** Changes when the visible content changes; drives the entrance. */
  transitionKey: string | number | boolean;
  enabled?: boolean;
  /** Gate one direction at a boundary without disabling the whole gesture. */
  allowedDirections?: Partial<Record<SwipeDirection, boolean>>;
  axis?: SwipeAxis;
  /** Travel of the incoming content, in points. */
  offset?: number;
  /** Entrance duration, in milliseconds. */
  duration?: number;
  /** Fade the incoming content with the travel. */
  fade?: boolean;
  testID?: string;
};

const ENTER_MS = 190;
const ENTER_OFFSET = 28;

export function useSwipeTransition({
  onSwipe,
  transitionKey,
  enabled = true,
  allowedDirections,
  axis = 'horizontal',
  offset = ENTER_OFFSET,
  duration = ENTER_MS,
  fade = true,
  testID,
}: SwipeTransitionOptions) {
  const reducedMotion = useReducedMotion();
  const pending = useRef<SwipeDirection | null>(null);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  const gesture = useSwipeGesture({
    enabled,
    axis,
    testID,
    onSwipe: (next) => {
      if (allowedDirections?.[next] === false) return;

      pending.current = next;
      onSwipe(next);
    },
  });

  useLayoutEffect(() => {
    const direction = pending.current;

    if (!direction) return;

    pending.current = null;

    if (reducedMotion) {
      translateX.value = 0;
      translateY.value = 0;
      opacity.value = 1;
      return;
    }

    if (axis === 'horizontal') {
      translateX.value = direction === 'left' ? offset : -offset;
      translateY.value = 0;
    } else {
      translateY.value = direction === 'up' ? offset : -offset;
      translateX.value = 0;
    }

    opacity.value = fade ? 0 : 1;
    translateX.value = withTiming(0, { duration });
    translateY.value = withTiming(0, { duration });
    opacity.value = withTiming(1, { duration });
  }, [
    axis,
    duration,
    fade,
    offset,
    opacity,
    reducedMotion,
    transitionKey,
    translateX,
    translateY,
  ]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return { gesture, style };
}
