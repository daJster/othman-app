import type { DateKey } from './date';

/**
 * How an attendee answered the invitation.
 *
 * `invited` means "no answer yet" and is what the UI calls *unknown*; the
 * server stores that literal, so the card and the dialog can map one field to
 * the three states without inventing a fourth.
 */
export type AttendeeStatus = 'invited' | 'going' | 'declined';

export type Attendee = {
  name: string;
  /** Arabic name for the Arabic interface; `name` is the fallback. */
  nameAr?: string;
  /**
   * The account that owns this attendee row.
   *
   * `null` for a guest the organiser typed in by hand; the seed data leaves it
   * null on purpose. RSVP writes the caller's uid here, which is what lets the
   * card answer "am I attending?" without a second request.
   */
  userId?: string | null;
  /**
   * Optional portrait URL.
   *
   * Demo data ships none on purpose: the product has no cohort photography, and
   * a stack of stock faces would be photography of people the circle has never
   * met. The avatar falls back to initials.
   */
  avatar?: string;
  /** The invitation answer. Missing is treated as `invited` (`unknown`). */
  status?: AttendeeStatus;
};

export type MeetingStatus = 'canceled' | 'past' | 'now' | 'soon' | 'scheduled';

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
  /**
   * Local wall-clock start, `HH:mm`.
   *
   * Stored as a clock reading, not a display string: "2:00 PM" cannot be
   * re-rendered in Arabic digits, and the card formats it per language.
   */
  time: string;
  /** Length in minutes; the card formats it with the active language. */
  durationMinutes: number;
  meetLink: string;
  status: MeetingStatus;
  /**
   * The organiser called the session off.
   *
   * Separate from `status`: cancellation is a stored fact, while the status is
   * derived from the clock. A canceled session stays canceled even after its
   * intended end time, so the card can never claim it "ended" as if it ran.
   */
  canceled?: boolean;
  attendees: Attendee[];
  organizer: string;
  location: string;
  /**
   * Demo content is bilingual, English first.
   *
   * The Arabic variant is optional so the eventual Firestore record can ship
   * one language and fall back to the other; the card picks at render.
   */
  titleAr?: string;
  descriptionAr?: string;
  organizerAr?: string;
  locationAr?: string;
};
