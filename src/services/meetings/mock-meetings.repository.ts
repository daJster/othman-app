import { isDateKey } from '@/core/domain/meetings/date-key';
import type { DateKey, Meeting } from '@/core/types';
import meetingsData from '@/data/mock/MeetingsMock.json';
import type { MeetingsRepository } from './meetings.types';

/**
 * Mock meetings, in place until the Firestore repository lands.
 *
 * The JSON is hand-edited, so it is treated as an external boundary: every row
 * is checked before it enters the cache. A malformed date would otherwise be
 * stored under a key no calendar day can match and the meeting would silently
 * disappear, which is much harder to notice than a boot-time warning.
 */

/** `date` is the only field whose JSON form differs from the domain type. */
type RawMeeting = Omit<Meeting, 'date'> & { date: string };

function parseMeetings(raw: RawMeeting[]): Meeting[] {
  const meetings: Meeting[] = [];

  for (const row of raw) {
    if (!isDateKey(row.date)) {
      console.warn(
        `[meetings:mock] skipping "${row.title}" — invalid date "${row.date}"`,
      );
      continue;
    }

    meetings.push({ ...row, date: row.date });
  }

  return meetings;
}

const meetings = parseMeetings(meetingsData.meetings as RawMeeting[]);

/** Artificial latency so loading states are exercised in development. */
const MOCK_LATENCY_MS = 300;

export const mockMeetingsRepository: MeetingsRepository = {
  async listByDate(dateKey: DateKey): Promise<Meeting[]> {
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

    return meetings.filter((meeting) => meeting.date === dateKey);
  },
};
