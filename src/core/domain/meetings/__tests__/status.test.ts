import type { DateKey } from '@/core/types';
import { meetingStatusAt } from '../status';

/**
 * The status is derived, not stored: these are the four moments a calendar can
 * put a session in, and the boundary cases that used to be a lying fixture.
 */
const TODAY = '2026-11-09' as DateKey;
const TOMORROW = '2026-11-10' as DateKey;

function at(hour: number, minute = 0): Date {
  return new Date(2026, 10, 9, hour, minute);
}

const session = {
  date: TODAY,
  time: '18:00',
  durationMinutes: 60,
};

describe('meetingStatusAt', () => {
  it('is scheduled on a later day', () => {
    expect(meetingStatusAt({ ...session, date: TOMORROW }, at(9))).toBe(
      'scheduled',
    );
  });

  it('is upcoming earlier on its own day', () => {
    expect(meetingStatusAt(session, at(9))).toBe('upcoming');
  });

  it('is soon inside the two-hour window', () => {
    expect(meetingStatusAt(session, at(16, 30))).toBe('soon');
  });

  it('is past once its end time has passed', () => {
    expect(meetingStatusAt(session, at(19))).toBe('past');
  });

  it('is still live during its own duration', () => {
    expect(meetingStatusAt(session, at(18, 30))).toBe('soon');
  });

  it('is past for yesterday', () => {
    expect(
      meetingStatusAt({ ...session, date: '2026-11-08' as DateKey }, at(9)),
    ).toBe('past');
  });
});
