import { useState } from 'react';
import {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOut,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/ui/motion';
import type { SwipeDirection } from './swipe';
import { useSwipeGesture } from './use-swipe-gesture';

/**
 * A swipe plus the transition of the element it replaces.
 *
 * The gesture only decides *that* a swipe happened and which physical way the
 * thumb went. This hook keeps that direction for one render and returns the
 * matching entrance preset: the new element arrives from the side the thumb
 * pushed it from, while the outgoing element fades away. The caller keys the
 * animated view by its page, so changing the page is what runs the pair.
 *
 * Direction is physical, never language-derived. A surface maps it to its own
 * next/previous meaning before calling `onSwipe`.
 */
export type SwipeTransitionOptions = {
  onSwipe: (direction: SwipeDirection) => void;
  enabled?: boolean;
  /** Gate one direction at a boundary without disabling the whole gesture. */
  allowedDirections?: Partial<Record<SwipeDirection, boolean>>;
  /** Time the incoming element takes, in milliseconds. */
  duration?: number;
  /** Time the outgoing element takes, in milliseconds. */
  exitDuration?: number;
  testID?: string;
};

const ENTER_MS = 220;
const EXIT_MS = 140;

export function useSwipeTransition({
  onSwipe,
  enabled = true,
  allowedDirections,
  duration = ENTER_MS,
  exitDuration = EXIT_MS,
  testID,
}: SwipeTransitionOptions) {
  const reducedMotion = useReducedMotion();
  const [direction, setDirection] = useState<SwipeDirection | null>(null);

  const gesture = useSwipeGesture({
    enabled,
    testID,
    onSwipe: (next) => {
      if (allowedDirections?.[next] === false) return;

      setDirection(next);
      onSwipe(next);
    },
  });

  const enterMs = reducedMotion ? 0 : duration;
  const exitMs = reducedMotion ? 0 : exitDuration;

  const entering =
    direction === 'left'
      ? FadeInRight.duration(enterMs)
      : direction === 'right'
        ? FadeInLeft.duration(enterMs)
        : direction === 'up'
          ? FadeInDown.duration(enterMs)
          : direction === 'down'
            ? FadeInUp.duration(enterMs)
            : FadeIn.duration(enterMs);

  return {
    gesture,
    entering,
    exiting: FadeOut.duration(exitMs),
  };
}
