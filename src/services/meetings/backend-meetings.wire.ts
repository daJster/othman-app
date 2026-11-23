import {
  array,
  asBoolean,
  asDateKey,
  asInteger,
  asOneOf,
  asRecord,
  asString,
  at,
  missingAsNull,
  optional,
  WireShapeError,
  type Parser,
} from '@/core/domain/wire/shape';
import type {
  Attendee,
  AttendeeStatus,
  Meeting,
  MeetingStatus,
} from '@/core/types';

/**
 * The wire shape of a meeting list, validated before any screen sees it.
 *
 * Every field the card, calendar and dialog read is checked here. A payload
 * that drifts (a renamed field, a string where a number belongs) fails with the
 * field's path, and the query shows its error state instead of rendering a card
 * with an `undefined` time.
 */

const MEETING_STATUSES = [
  'canceled',
  'past',
  'now',
  'soon',
  'scheduled',
] as const satisfies readonly MeetingStatus[];

const ATTENDEE_STATUSES = [
  'invited',
  'going',
  'declined',
] as const satisfies readonly AttendeeStatus[];

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

const parseStatus = asOneOf<MeetingStatus>(MEETING_STATUSES);
const parseAttendeeStatus = asOneOf<AttendeeStatus>(ATTENDEE_STATUSES);

function asClock(value: unknown, path: string): string {
  const text = asString(value, path);

  if (!CLOCK.test(text)) throw new WireShapeError(path, 'an HH:mm time');

  return text;
}

const parseAttendee: Parser<Attendee> = (value, path) => {
  const row = asRecord(value, path);
  const nameAr = optional(asString)(row.nameAr, at(path, 'nameAr'));
  const userId = optional(missingAsNull(asString))(
    row.userId,
    at(path, 'userId'),
  );
  const avatar = optional(asString)(row.avatar, at(path, 'avatar'));
  const status = optional(parseAttendeeStatus)(row.status, at(path, 'status'));

  return {
    name: asString(row.name, at(path, 'name')),
    ...(nameAr === undefined ? {} : { nameAr }),
    ...(userId === undefined ? {} : { userId }),
    ...(avatar === undefined ? {} : { avatar }),
    ...(status === undefined ? {} : { status }),
  };
};

export const parseBackendMeeting: Parser<Meeting> = (value, path) => {
  const row = asRecord(value, path);
  const canceled = optional(asBoolean)(row.canceled, at(path, 'canceled'));
  const titleAr = optional(asString)(row.titleAr, at(path, 'titleAr'));
  const descriptionAr = optional(asString)(
    row.descriptionAr,
    at(path, 'descriptionAr'),
  );
  const organizerAr = optional(asString)(
    row.organizerAr,
    at(path, 'organizerAr'),
  );
  const locationAr = optional(asString)(row.locationAr, at(path, 'locationAr'));

  return {
    id: asInteger(row.id, at(path, 'id')),
    title: asString(row.title, at(path, 'title')),
    description: asString(row.description, at(path, 'description')),
    date: asDateKey(row.date, at(path, 'date')),
    time: asClock(row.time, at(path, 'time')),
    durationMinutes: asInteger(
      row.durationMinutes,
      at(path, 'durationMinutes'),
      1,
    ),
    meetLink: asString(row.meetLink, at(path, 'meetLink')),
    status: parseStatus(row.status, at(path, 'status')),
    ...(canceled === undefined ? {} : { canceled }),
    attendees: array(parseAttendee)(row.attendees, at(path, 'attendees')),
    organizer: asString(row.organizer, at(path, 'organizer')),
    location: asString(row.location, at(path, 'location')),
    ...(titleAr === undefined ? {} : { titleAr }),
    ...(descriptionAr === undefined ? {} : { descriptionAr }),
    ...(organizerAr === undefined ? {} : { organizerAr }),
    ...(locationAr === undefined ? {} : { locationAr }),
  };
};

/** `GET /v1/meetings` → `{ meetings, total }`. */
export function parseMeetingsResponse(payload: unknown): Meeting[] {
  return array(parseBackendMeeting)(
    asRecord(payload, 'response').meetings,
    'meetings',
  );
}
