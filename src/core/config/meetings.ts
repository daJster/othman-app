/**
 * Meeting presentation config.
 *
 * Both tables here describe how a status or an attendee stack *presents*, not
 * how it behaves: the config carries intent (`tone`, `bordered`, `avatarSize`)
 * and nothing else. Binding that intent to concrete Tailwind classes is a UI
 * concern and lives in `src/ui` — `core/` must stay free of class strings.
 */

import type { MeetingStatus } from '../types';
import type { AttendeeListConfig, MeetingStatusConfig } from './types';
import { defineConfig, defineTable } from './primitives';

/**
 * Status keys are checked against `MeetingStatus`, so adding a status to
 * `core/types` without adding it here is a compile error.
 *
 * `labelKey` is a translation key, not display text. `core/` has no i18n and
 * must not have any.
 */
export const MEETING_STATUS_CONFIG = defineTable({
  soon: { labelKey: 'meeting.status.soon', tone: 'positive', pulse: true },
  upcoming: { labelKey: 'meeting.status.upcoming', tone: 'info', pulse: false },
  scheduled: {
    labelKey: 'meeting.status.scheduled',
    tone: 'neutral',
    pulse: false,
  },
} satisfies Record<MeetingStatus, MeetingStatusConfig>);

export const ATTENDEE_LIST_CONFIG = defineConfig({
  maxVisible: 4,
  avatarSize: 'sm',
  bordered: true,
  interactive: false,
} satisfies AttendeeListConfig);

/**
 * Status lookup, replacing the old `createMeetingStatusConfig()[status]`
 * pattern that rebuilt the whole table to read one entry.
 */
export function getMeetingStatusConfig(
  status: MeetingStatus,
): MeetingStatusConfig {
  return MEETING_STATUS_CONFIG.get(status);
}
