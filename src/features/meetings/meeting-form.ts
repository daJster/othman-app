import { formatDateKey, isDateKey } from '@/core/domain/meetings/date-key';
import type { DateKey, Meeting } from '@/core/types';
import type { Language } from '@/i18n';

/**
 * The meeting form's draft and its rules.
 *
 * Kept as plain functions, outside the component, for three reasons: the same
 * normalisation feeds create and edit, a draft can be validated without a
 * renderer, and "dirty" is a decision two screens must agree on.
 *
 * The draft holds strings because every field is typed. `durationMinutes` is
 * the only number, and it is converted at the boundary — a `number` input that
 * the user is halfway through clearing would otherwise become `0` under their
 * cursor.
 */
export type DraftAttendee = {
  userId: string | null;
  name: string;
  status: 'invited' | 'going' | 'declined';
};

export type MeetingDraft = {
  title: string;
  date: string;
  time: string;
  durationMinutes: string;
  location: string;
  meetLink: string;
  organizer: string;
  description: string;
  /**
   * The invitation list. Rows created by an admin start as `invited`; rows read
   * from an existing meeting keep their answer so an edit does not silently
   * reset everyone who already replied.
   *
   * `userId` is null for a guest an admin typed in by hand in an older record.
   * Those rows are preserved on save but are not selectable in the member
   * picker.
   */
  attendees: DraftAttendee[];
};

export type MeetingField = keyof MeetingDraft;

export type MeetingErrorKey =
  | 'meeting.form.validation.title'
  | 'meeting.form.validation.date'
  | 'meeting.form.validation.time'
  | 'meeting.form.validation.duration'
  | 'meeting.form.validation.link'
  | 'meeting.form.validation.attendees';

export type MeetingErrors = Partial<Record<MeetingField, MeetingErrorKey>>;

/** What the server accepts; mirrored here so the form can explain it first. */
export const MEETING_LIMITS = {
  title: 200,
  location: 200,
  organizer: 200,
  description: 5000,
  meetLink: 2048,
  maxDuration: 24 * 60,
} as const;

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
const HTTP = /^https?:\/\/\S+$/i;

/** A new session defaults to today, one hour at 18:00 — the demo cohort's hour. */
export function createEmptyDraft(today: Date = new Date()): MeetingDraft {
  return {
    title: '',
    date: formatDateKey(today),
    time: '18:00',
    durationMinutes: '60',
    location: '',
    meetLink: '',
    organizer: '',
    description: '',
    attendees: [],
  };
}

/**
 * The durations the form offers as a choice.
 *
 * A session is half an hour to a full day; arbitrary minute counts invite
 * typos and produce sessions nobody planned for. `1440` is the backend's
 * maximum, so "whole day" is a real value rather than a label for an invalid
 * one. A stored duration outside the list keeps its own row so an old meeting
 * never silently changes length.
 */
export const DURATION_STEPS = [30, 60, 90, 120, 1440] as const;

export function toMeetingDraft(
  meeting: Meeting,
  language: Language = 'en',
): MeetingDraft {
  const ar = language === 'ar';

  return {
    title: ar ? (meeting.titleAr ?? meeting.title) : meeting.title,
    date: meeting.date,
    time: meeting.time,
    durationMinutes: String(meeting.durationMinutes),
    location: ar ? (meeting.locationAr ?? meeting.location) : meeting.location,
    meetLink: meeting.meetLink,
    organizer: ar
      ? (meeting.organizerAr ?? meeting.organizer)
      : meeting.organizer,
    description: ar
      ? (meeting.descriptionAr ?? meeting.description)
      : meeting.description,
    attendees: meeting.attendees.map((attendee) => ({
      userId: attendee.userId ?? null,
      name: attendee.name,
      status: attendee.status ?? 'invited',
    })),
  };
}

export function validateMeetingDraft(draft: MeetingDraft): MeetingErrors {
  const errors: MeetingErrors = {};
  const title = draft.title.trim();

  if (title.length === 0 || title.length > MEETING_LIMITS.title) {
    errors.title = 'meeting.form.validation.title';
  }

  if (!isDateKey(draft.date.trim())) {
    errors.date = 'meeting.form.validation.date';
  }

  if (!CLOCK.test(draft.time.trim())) {
    errors.time = 'meeting.form.validation.time';
  }

  const duration = Number(draft.durationMinutes.trim());
  if (
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > MEETING_LIMITS.maxDuration
  ) {
    errors.durationMinutes = 'meeting.form.validation.duration';
  }

  const link = draft.meetLink.trim();
  if (
    link.length > 0 &&
    (!HTTP.test(link) || link.length > MEETING_LIMITS.meetLink)
  ) {
    errors.meetLink = 'meeting.form.validation.link';
  }

  if (draft.attendees.length === 0) {
    errors.attendees = 'meeting.form.validation.attendees';
  }

  return errors;
}

/**
 * The wire payload.
 *
 * The form is language-neutral, so both variants are written with the same
 * text. Leaving one behind is how an edit made in Arabic disappeared when the
 * interface switched to English — the card prefers `*Ar` in Arabic and `*`
 * everywhere else, and a stale half is worse than no translation.
 *
 * Optional strings are sent as `''` rather than omitted: the server treats a
 * missing field as "leave unchanged" on PATCH, so an edit that deliberately
 * clears the location has to say so explicitly.
 */
export type MeetingInput = {
  title: string;
  titleAr: string;
  date: DateKey;
  time: string;
  durationMinutes: number;
  location: string;
  locationAr: string;
  meetLink: string;
  organizer: string;
  organizerAr: string;
  description: string;
  descriptionAr: string;
  attendees: DraftAttendee[];
};

export function toMeetingInput(draft: MeetingDraft): MeetingInput {
  const title = draft.title.trim();
  const location = draft.location.trim();
  const organizer = draft.organizer.trim();
  const description = draft.description.trim();

  return {
    title,
    titleAr: title,
    date: draft.date.trim() as DateKey,
    time: draft.time.trim(),
    durationMinutes: Number(draft.durationMinutes.trim()),
    location,
    locationAr: location,
    meetLink: draft.meetLink.trim(),
    organizer,
    organizerAr: organizer,
    description,
    descriptionAr: description,
    attendees: draft.attendees,
  };
}

function sameText(a: string, b: string): boolean {
  return a.trim() === b.trim();
}

function attendeeKey(attendees: readonly DraftAttendee[]): string {
  return attendees
    .map(
      (attendee) =>
        `${attendee.userId ?? ''}:${attendee.name}:${attendee.status}`,
    )
    .sort()
    .join('|');
}

const TEXT_FIELDS = [
  'title',
  'date',
  'time',
  'durationMinutes',
  'location',
  'meetLink',
  'organizer',
  'description',
] as const satisfies readonly Exclude<MeetingField, 'attendees'>[];

export function isMeetingDraftDirty(
  draft: MeetingDraft,
  meeting: Meeting | null,
  language: Language = 'en',
): boolean {
  if (!meeting) {
    // A user who has only cleared the prefilled fields has not changed anything.
    const empty = createEmptyDraft();
    return (
      TEXT_FIELDS.some((field) => !sameText(draft[field], empty[field])) ||
      draft.attendees.length > 0
    );
  }

  const original = toMeetingDraft(meeting, language);

  return (
    TEXT_FIELDS.some((field) => !sameText(draft[field], original[field])) ||
    attendeeKey(draft.attendees) !== attendeeKey(original.attendees)
  );
}
