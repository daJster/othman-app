import { cn } from '@/ui/cn';

/**
 * Ghost trigger for the bar's chrome controls.
 *
 * RNR's ghost variant paints `bg-accent` on hover and again on press. In a
 * permanent chrome bar that wash reads as a selection state the control does
 * not have: the menu is the state, the trigger is only its handle. Every
 * control in the trailing cluster uses this, so the bar stays flat while the
 * pointer moves across it.
 *
 * Keyboard focus is deliberately untouched: `focus-visible` still draws the
 * ring from the button base, because a flat surface must not mean an
 * unreachable control.
 */
export const FLAT_TRIGGER =
  'hover:bg-transparent active:bg-transparent dark:hover:bg-transparent dark:active:bg-transparent';

/** `FLAT_TRIGGER` plus a caller's own classes, merged the way Uniwind expects. */
export function flatTrigger(className?: string) {
  return cn(FLAT_TRIGGER, className);
}
