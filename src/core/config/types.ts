/**
 * Shapes shared by more than one config table.
 *
 * This layer must stay runtime-agnostic (see the layering rules in
 * eslint.config.js): no React, no react-native, no DOM. Icons are therefore
 * declared as string keys rather than components — the presentation layer owns
 * the key -> component registry and can resolve each key to a different set of
 * icons per platform.
 */

/**
 * Logical icon names used across config data.
 *
 * A UI layer supplies the implementation once:
 *
 *   const icons = {
 *     'book-open': BookOpen,
 *     chart: ChartLine,
 *     ...
 *   } satisfies IconRegistry<LucideIcon>;
 *
 * `IconRegistry` makes that object exhaustively checked: renaming a key here
 * breaks the registry at compile time instead of rendering a blank icon.
 */
export type IconName =
  | 'book-open'
  | 'chart-line'
  | 'check-circle'
  | 'cog'
  | 'external-link'
  | 'file-text'
  | 'megaphone'
  | 'trash'
  | 'university'
  | 'video'
  // Added with the navigation tree (P3.2): the four tab roots need glyphs.
  | 'home'
  | 'user'
  // Added with the UI states (P2.1): error and empty screens need a glyph.
  | 'alert-circle'
  | 'inbox'
  // Added with the meetings calendar and card (P4.2).
  | 'calendar'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'clock'
  | 'map-pin'
  | 'users';

/** Component type for an icon registry, kept platform-agnostic. */
export type IconRegistry<Component> = Readonly<Record<IconName, Component>>;

/** Semantic colour intent. The literal classes live in `tokens.ts`. */
export type StatusTone = 'positive' | 'info' | 'neutral';

/**
 * Translation keys for the three meeting statuses.
 *
 * Declared as literals, not `string`: the UI passes this value straight to
 * `t()`, and the typed `t()` rejects a widened string. Adding a status to
 * `MeetingStatus` still fails to compile until this key union and
 * `MEETING_STATUS_CONFIG` both gain the entry.
 */
export type MeetingStatusLabelKey =
  | 'meeting.status.soon'
  | 'meeting.status.upcoming'
  | 'meeting.status.scheduled';

export type MeetingStatusConfig = {
  /** Translation key, not display text. */
  readonly labelKey: MeetingStatusLabelKey;
  readonly tone: StatusTone;
  /** Render the status dot with a pulse, to signal urgency. */
  readonly pulse: boolean;
};

/** Avatar scale for the attendee stack. */
export type AttendeeSize = 'sm';

export type AttendeeListConfig = {
  /** Avatars shown before collapsing the rest into a counter. */
  readonly maxVisible: number;
  readonly avatarSize: AttendeeSize;
  /** Contrast ring drawn against the surrounding surface. */
  readonly bordered: boolean;
  readonly interactive: boolean;
};

export type PhoneExtension = {
  readonly name: string;
  /** ISO 3166-1 alpha-2. Doubles as the table key. */
  readonly iso: string;
  readonly dialCode: string;
  readonly flag: string;
};
