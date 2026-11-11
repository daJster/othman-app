import { formatDateKey } from '@/core/domain/meetings/date-key';
import { meetingStatusAt } from '@/core/domain/meetings/status';
import type { Attendee, DateKey, Meeting } from '@/core/types';
import meetingsData from '@/data/mock/MeetingsMock.json';
import type { MeetingsRepository } from './meetings.types';

/**
 * Demo meetings, in place until the Firestore repository lands.
 *
 * Two decisions make the demo honest:
 *
 *  - **The fixture stores a day offset, not a date.** A hard-coded day starts
 *    lying the moment it passes — the previous fixture was an April 2026
 *    product stand-up, so the calendar opened on an empty day and Home linked
 *    to a session that did not exist.
 *  - **The status is derived at read time**, never stored. Opening the app two
 *    minutes before a session shows "starts soon"; opening it the next morning
 *    shows "ended", because the same rule recomputes on every read.
 *
 * The JSON is hand-edited, so it is treated as an external boundary: a row with
 * a broken offset, clock or duration is skipped with a warning instead of
 * entering the cache as a half-rendered card.
 */

type RawAttendee = {
  name: string;
  nameAr?: string;
  avatar?: string;
};

type RawMeeting = {
  id: number;
  dayOffset: number;
  time: string;
  durationMinutes: number;
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  meetLink: string;
  attendees: RawAttendee[];
  organizer: string;
  organizerAr?: string;
  location: string;
  locationAr?: string;
};

type Seed = Omit<RawMeeting, 'dayOffset'> & { dayOffset: number };

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Local midnight today, so an offset never drifts through a DST boundary. */
function midnightToday(): Date {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function dateFor(offset: number): DateKey {
  return formatDateKey(new Date(midnightToday().getTime() + offset * DAY_MS));
}

function parseRows(raw: RawMeeting[]): Seed[] {
  const seeds: Seed[] = [];

  for (const row of raw) {
    if (
      !Number.isFinite(row.id) ||
      !Number.isFinite(row.dayOffset) ||
      !Number.isFinite(row.durationMinutes) ||
      row.durationMinutes <= 0 ||
      typeof row.time !== 'string' ||
      !CLOCK.test(row.time) ||
      typeof row.title !== 'string' ||
      row.title.length === 0
    ) {
      console.warn(`[meetings:mock] skipping malformed row "${row.id}"`);
      continue;
    }

    seeds.push(row);
  }

  return seeds;
}

const seeds = parseRows(meetingsData.meetings as RawMeeting[]);

function materialize(seed: Seed, now: Date): Meeting {
  const date = dateFor(seed.dayOffset);

  return {
    id: seed.id,
    title: seed.title,
    titleAr: seed.titleAr,
    description: seed.description,
    descriptionAr: seed.descriptionAr,
    date,
    time: seed.time,
    durationMinutes: seed.durationMinutes,
    meetLink: seed.meetLink,
    status: meetingStatusAt(
      { date, time: seed.time, durationMinutes: seed.durationMinutes },
      now,
    ),
    attendees: seed.attendees as Attendee[],
    organizer: seed.organizer,
    organizerAr: seed.organizerAr,
    location: seed.location,
    locationAr: seed.locationAr,
  };
}

/** Artificial latency so loading states are exercised in development. */
const MOCK_LATENCY_MS = 300;

function later<T>(value: T, ms = MOCK_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const mockMeetingsRepository: MeetingsRepository = {
  async listByDate(dateKey: DateKey): Promise<Meeting[]> {
    const now = new Date();
    const meetings = seeds
      .filter((seed) => dateFor(seed.dayOffset) === dateKey)
      .map((seed) => materialize(seed, now))
      .sort((a, b) => a.time.localeCompare(b.time));

    return later(meetings);
  },

  async listByRange(from: DateKey, to: DateKey): Promise<Meeting[]> {
    const now = new Date();
    const meetings = seeds
      .map((seed) => materialize(seed, now))
      .filter((meeting) => meeting.date >= from && meeting.date <= to)
      .sort(
        (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
      );

    return later(meetings, 120);
  },
};
