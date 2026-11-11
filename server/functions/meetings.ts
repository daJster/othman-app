import type { AttendeeInput, MeetingPatch } from '../repositories/meetings.ts';
import { createMeetingsRepository } from '../repositories/meetings.ts';
import { ApiError } from '../lib/errors.ts';
import {
  asObject,
  optionalInteger,
  optionalNullableString,
  optionalString,
  parseId,
  parseLimit,
  parseOffset,
  requiredClock,
  requiredDateKey,
  requiredInteger,
  requiredString,
} from '../lib/validation.ts';
import { requireAuth, requireRole } from './guards.ts';
import { created, defineFunction, noContent, ok } from './types.ts';
import type { FunctionResult } from './types.ts';

/**
 * Meeting CRUD + RSVP.
 *
 * Reads are public: Home and the landing page show the next session before a
 * reader signs in. Writes are admin-only. RSVP is the one mutation a normal user
 * owns, and it is scoped to their own attendee row.
 */

function parseAttendees(
  body: Record<string, unknown>,
): AttendeeInput[] | undefined {
  if (body.attendees === undefined) return undefined;
  if (!Array.isArray(body.attendees)) {
    throw ApiError.invalid('"attendees" must be an array');
  }

  return body.attendees.map((raw, index) => {
    const attendee = asObject(raw, `attendees[${index}]`);

    return {
      name: requiredString(attendee, 'name', { max: 120 }),
      nameAr: optionalNullableString(attendee, 'nameAr', { max: 120 }),
      avatar: optionalNullableString(attendee, 'avatar', { max: 2048 }),
      userId: optionalNullableString(attendee, 'userId', { max: 128 }),
      status:
        attendee.status === 'going' || attendee.status === 'declined'
          ? attendee.status
          : 'invited',
    };
  });
}

const list = defineFunction((event, context): FunctionResult => {
  const repo = createMeetingsRepository(context.db);
  const { date, from, to } = event.query;

  const { rows, total } = repo.list({
    date,
    from,
    to,
    limit: parseLimit(event.query, 100, 500),
    offset: parseOffset(event.query),
  });

  return ok({ meetings: rows, total });
});

const get = defineFunction((event, context): FunctionResult => {
  const id = parseId(event.params.id ?? '');
  const meeting = createMeetingsRepository(context.db).get(id);

  if (!meeting) throw ApiError.notFound(`Meeting ${id} does not exist`);

  return ok({ meeting });
});

const create = defineFunction((event, context): FunctionResult => {
  requireRole(context, 'admin');
  const body = asObject(event.body);

  const meeting = createMeetingsRepository(context.db).create({
    title: requiredString(body, 'title', { max: 200 }),
    titleAr: optionalNullableString(body, 'titleAr', { max: 200 }),
    description: optionalString(body, 'description', { max: 5_000 }) ?? '',
    descriptionAr: optionalNullableString(body, 'descriptionAr', {
      max: 5_000,
    }),
    date: requiredDateKey(body, 'date'),
    time: requiredClock(body, 'time'),
    durationMinutes: requiredInteger(body, 'durationMinutes', {
      min: 1,
      max: 24 * 60,
    }),
    meetLink: optionalString(body, 'meetLink', { max: 2_048 }) ?? '',
    organizer: optionalString(body, 'organizer', { max: 200 }) ?? '',
    organizerAr: optionalNullableString(body, 'organizerAr', { max: 200 }),
    location: optionalString(body, 'location', { max: 200 }) ?? '',
    locationAr: optionalNullableString(body, 'locationAr', { max: 200 }),
    attendees: parseAttendees(body),
  });

  context.events.publish('meetings.created', { id: meeting.id });

  return created({ meeting });
});

const update = defineFunction((event, context): FunctionResult => {
  requireRole(context, 'admin');
  const id = parseId(event.params.id ?? '');
  const body = asObject(event.body);

  const patch: MeetingPatch = {
    title: optionalString(body, 'title', { max: 200 }),
    titleAr: optionalNullableString(body, 'titleAr', { max: 200 }),
    description: optionalString(body, 'description', { max: 5_000 }),
    descriptionAr: optionalNullableString(body, 'descriptionAr', {
      max: 5_000,
    }),
    date: body.date === undefined ? undefined : requiredDateKey(body, 'date'),
    time: body.time === undefined ? undefined : requiredClock(body, 'time'),
    durationMinutes: optionalInteger(body, 'durationMinutes', {
      min: 1,
      max: 24 * 60,
    }),
    meetLink: optionalString(body, 'meetLink', { max: 2_048 }),
    organizer: optionalString(body, 'organizer', { max: 200 }),
    organizerAr: optionalNullableString(body, 'organizerAr', { max: 200 }),
    location: optionalString(body, 'location', { max: 200 }),
    locationAr: optionalNullableString(body, 'locationAr', { max: 200 }),
    attendees: parseAttendees(body),
  };

  const repo = createMeetingsRepository(context.db);
  const meeting = repo.update(id, patch);

  if (!meeting) throw ApiError.notFound(`Meeting ${id} does not exist`);

  if (patch.attendees) {
    // A PATCH that includes `attendees` replaces the list; an omitted list
    // leaves the existing rows alone.
    repo.clearAttendees(id);
    for (const attendee of patch.attendees) {
      repo.addAttendee(id, attendee);
    }

    context.events.publish('meetings.updated', { id });

    return ok({ meeting: repo.get(id) });
  }

  context.events.publish('meetings.updated', { id });

  return ok({ meeting });
});

const remove = defineFunction((event, context): FunctionResult => {
  requireRole(context, 'admin');
  const id = parseId(event.params.id ?? '');

  if (!createMeetingsRepository(context.db).remove(id)) {
    throw ApiError.notFound(`Meeting ${id} does not exist`);
  }

  context.events.publish('meetings.deleted', { id });

  return noContent();
});

const rsvp = defineFunction((event, context): FunctionResult => {
  const auth = requireAuth(context);
  const id = parseId(event.params.id ?? '');
  const repo = createMeetingsRepository(context.db);

  if (!repo.get(id)) throw ApiError.notFound(`Meeting ${id} does not exist`);

  // Remove first so a display-name change cannot leave two rows for one user.
  repo.removeAttendee(id, auth.user.uid);
  repo.addAttendee(id, {
    userId: auth.user.uid,
    name: auth.user.displayName ?? auth.user.email,
    status: 'going',
  });

  context.events.publish('meetings.rsvp', {
    id,
    uid: auth.user.uid,
    status: 'going',
  });

  return ok({ meeting: repo.get(id) });
});

const unrsvp = defineFunction((event, context): FunctionResult => {
  const auth = requireAuth(context);
  const id = parseId(event.params.id ?? '');
  const repo = createMeetingsRepository(context.db);

  if (!repo.get(id)) throw ApiError.notFound(`Meeting ${id} does not exist`);

  repo.removeAttendee(id, auth.user.uid);
  context.events.publish('meetings.rsvp', {
    id,
    uid: auth.user.uid,
    status: 'declined',
  });

  return ok({ meeting: repo.get(id) });
});

export const meetingFunctions = {
  'meetings.list': list,
  'meetings.get': get,
  'meetings.create': create,
  'meetings.update': update,
  'meetings.remove': remove,
  'meetings.rsvp': rsvp,
  'meetings.unrsvp': unrsvp,
};
