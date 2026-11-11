import type { Attendee, Meeting } from '@/core/types';
import type { Language } from '@/i18n';

/**
 * Picks the field the active language reads.
 *
 * Demo content carries both languages because the product is Arabic-first and
 * an English-only fixture would render Arabic headings over Latin body copy.
 * The English field is the fallback: a Firestore record that ships only one
 * language still renders.
 */
function pick(en: string, ar: string | undefined, language: Language): string {
  return language === 'ar' && ar ? ar : en;
}

export function meetingTitle(meeting: Meeting, language: Language): string {
  return pick(meeting.title, meeting.titleAr, language);
}

export function meetingDescription(
  meeting: Meeting,
  language: Language,
): string {
  return pick(meeting.description, meeting.descriptionAr, language);
}

export function meetingOrganizer(meeting: Meeting, language: Language): string {
  return pick(meeting.organizer, meeting.organizerAr, language);
}

export function meetingLocation(meeting: Meeting, language: Language): string {
  return pick(meeting.location, meeting.locationAr, language);
}

export function attendeeName(attendee: Attendee, language: Language): string {
  return pick(attendee.name, attendee.nameAr, language);
}
