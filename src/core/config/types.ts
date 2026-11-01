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
 * The list is the single source of the name type; the presentation layer maps
 * each name to a platform glyph and `IconRegistry` proves the map is exhaustive.
 * It lives here as data because `core/` cannot import expo or react-native to
 * describe the glyph types themselves.
 */
export const ICON_NAMES = [
  'book-open',
  'chart-line',
  'check-circle',
  'cog',
  'external-link',
  'file-text',
  'megaphone',
  'trash',
  'university',
  'video',
  // The four tab roots.
  'home',
  'user',
  // UI states.
  'alert-circle',
  'inbox',
  // Calendar and meeting cards.
  'calendar',
  'chevron-down',
  'chevron-left',
  'chevron-right',
  'chevron-up',
  'clock',
  'map-pin',
  'users',
  // Account.
  'camera',
  'info',
  'logout',
  // Reader chrome.
  'menu',
  'search',
  'layers',
  'pencil',
  // Audio.
  'volume',
  'play',
  'pause',
  // Auth and password surfaces.
  'close',
  'eye',
  'eye-off',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

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
