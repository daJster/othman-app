import type { Meeting } from '@/core/types';
import {
  createEmptyDraft,
  isMeetingDraftDirty,
  toMeetingDraft,
  toMeetingInput,
  validateMeetingDraft,
} from '../meeting-form';

const meeting: Meeting = {
  id: 7,
  title: 'Weekly review',
  titleAr: 'مراجعة الأسبوع',
  description: 'Juz 3',
  descriptionAr: 'الجزء الثالث',
  date: '2026-11-14',
  time: '18:00',
  durationMinutes: 60,
  meetLink: 'https://meet.google.com/abc',
  status: 'scheduled',
  attendees: [],
  organizer: 'Shaykh',
  organizerAr: 'الشيخ',
  location: 'Kuttab',
  locationAr: 'الكُتّاب',
};

describe('meeting form', () => {
  it('accepts a complete draft', () => {
    const draft = toMeetingDraft(meeting, 'en');

    expect(validateMeetingDraft(draft)).toEqual({});
  });

  it('rejects an impossible day, clock, duration and link', () => {
    const errors = validateMeetingDraft({
      ...createEmptyDraft(),
      title: 'x',
      date: '2026-02-30',
      time: '25:00',
      durationMinutes: '0',
      meetLink: 'meet.google.com/abc',
    });

    expect(Object.keys(errors).sort()).toEqual([
      'date',
      'durationMinutes',
      'meetLink',
      'time',
    ]);
  });

  it('prefills the language the reader is looking at', () => {
    expect(toMeetingDraft(meeting, 'ar')).toMatchObject({
      title: 'مراجعة الأسبوع',
      location: 'الكُتّاب',
      organizer: 'الشيخ',
      description: 'الجزء الثالث',
    });

    expect(toMeetingDraft(meeting, 'en')).toMatchObject({
      title: 'Weekly review',
      location: 'Kuttab',
    });
  });

  it('writes both language variants from one input', () => {
    const input = toMeetingInput({
      ...createEmptyDraft(),
      title: '  مراجعة  ',
      location: 'الكُتّاب',
    });

    expect(input.title).toBe('مراجعة');
    expect(input.titleAr).toBe('مراجعة');
    expect(input.locationAr).toBe('الكُتّاب');
    expect(input.durationMinutes).toBe(60);
  });

  it('is clean when nothing changed and dirty after an edit', () => {
    const draft = toMeetingDraft(meeting, 'en');

    expect(isMeetingDraftDirty(draft, meeting, 'en')).toBe(false);
    expect(
      isMeetingDraftDirty({ ...draft, title: 'New title' }, meeting, 'en'),
    ).toBe(true);
  });

  it('treats an untouched new draft as clean', () => {
    expect(isMeetingDraftDirty(createEmptyDraft(), null)).toBe(false);
  });
});
