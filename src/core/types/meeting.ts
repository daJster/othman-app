import type { DateKey } from './date';

export type Attendee = {
  name: string;
  avatar: string;
};

export type MeetingStatus = 'soon' | 'upcoming' | 'scheduled';

export type Meeting = {
  id: number;
  title: string;
  description: string;
  /**
   * Calendar day the meeting belongs to, as `YYYY-MM-DD`.
   *
   * A string, not a `Date`: the value crosses Firestore and JSON as a day, and
   * a `Date` would be re-interpreted in the device's timezone. Format it for
   * display at the presentation boundary (`parseDateKey` → `Intl`).
   */
  date: DateKey;
  time: string;
  duration: string;
  meetLink: string;
  status: MeetingStatus;
  attendees: Attendee[];
  organizer: string;
  location: string;
};
