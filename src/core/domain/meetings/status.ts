import { parseDateKey } from './date-key';
import type { DateKey, MeetingStatus } from '../../types';

/**
 * Where a meeting sits relative to now.
 *
 * The status used to be a literal in the fixture (`"status": "soon"`), which is
 * a promise the data cannot keep: the moment the session ends, a hard-coded
 * "starts soon" is a lie. It is derived instead, from the same day and clock
 * the card prints, so browsing yesterday shows "ended" and opening the app two
 * minutes before a session shows "starts soon".
 *
 * Rules:
 *  - `past`      — its end time has passed;
 *  - `soon`      — starts within two hours;
 *  - `upcoming`  — later today;
 *  - `scheduled` — any later day.
 */
const SOON_WINDOW_MS = 2 * 60 * 60 * 1000;

/** The session's local start. `parseDateKey` hands back a noon anchor. */
export function meetingStart(date: DateKey, time: string): Date {
  const day = parseDateKey(date);
  const [hours, minutes] = time.split(':').map(Number);

  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
  );
}

export function meetingStatusAt(
  meeting: {
    date: DateKey;
    time: string;
    durationMinutes: number;
  },
  now: Date,
): MeetingStatus {
  const start = meetingStart(meeting.date, meeting.time).getTime();
  const end = start + Math.max(0, meeting.durationMinutes) * 60_000;
  const at = now.getTime();

  if (at >= end) return 'past';
  if (start - at <= SOON_WINDOW_MS) return 'soon';

  const day = parseDateKey(meeting.date);
  const sameDay =
    day.getFullYear() === now.getFullYear() &&
    day.getMonth() === now.getMonth() &&
    day.getDate() === now.getDate();

  return sameDay ? 'upcoming' : 'scheduled';
}
