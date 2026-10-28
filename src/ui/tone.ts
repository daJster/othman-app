import type { StatusTone } from '@/core/config';

/**
 * Where colour *intent* becomes concrete classes.
 *
 * `core/config/meetings.ts` says a status is `positive | info | neutral`; this
 * file is the only place that decides what those words look like. Keep the
 * strings here, as complete literals — Tailwind scans statically and
 * `bg-${tone}-500` would produce no CSS at all.
 *
 * Split into surface and text because React Native has no colour inheritance:
 * a badge is a `View` wrapping a `Text`, and each needs its own class.
 */

/** Badge background + border for a status tone. */
export const TONE_SURFACE_CLASSES = {
  positive:
    'border-emerald-200 bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950',
  info: 'border-sky-200 bg-sky-100 dark:border-sky-800 dark:bg-sky-950',
  neutral: 'border-border bg-muted',
} satisfies Readonly<Record<StatusTone, string>>;

/** Badge label colour for a status tone. */
export const TONE_TEXT_CLASSES = {
  positive: 'text-emerald-700 dark:text-emerald-400',
  info: 'text-sky-700 dark:text-sky-400',
  neutral: 'text-muted-foreground',
} satisfies Readonly<Record<StatusTone, string>>;

/** Status dot fill. Pair with `TONE_DOT_PULSE_CLASS` when `pulse` is true. */
export const TONE_DOT_CLASSES = {
  positive: 'bg-emerald-500',
  info: 'bg-sky-500',
  neutral: 'bg-muted-foreground',
} satisfies Readonly<Record<StatusTone, string>>;
