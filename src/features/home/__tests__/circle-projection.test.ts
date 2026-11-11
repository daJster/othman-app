import type { CircleItem } from '@/services/circle';
import {
  daysAway,
  pickNewestNotice,
  pickNextExam,
  pickNextHalqa,
  pickNextUp,
} from '../circle-projection';

const NOW = new Date(2026, 10, 8, 9, 0); // 8 Nov 2026, 09:00 local

function item(overrides: Partial<CircleItem> & { id: string }): CircleItem {
  return {
    kind: 'halqa',
    date: '2026-11-08',
    time: '18:00',
    title: { ar: 'عنوان', en: 'Title' },
    body: { ar: 'نص', en: 'Body' },
    meta: null,
    topic: null,
    href: null,
    ...overrides,
  };
}

describe('circle projections', () => {
  it('reports the soonest timed item', () => {
    const halqa = item({ id: 'h', date: '2026-11-08', time: '18:00' });
    const exam = item({
      id: 'e',
      kind: 'exam',
      date: '2026-11-13',
      time: '17:00',
    });

    expect(pickNextUp([exam, halqa], NOW)?.id).toBe('h');
  });

  it('skips an item whose time has already passed today', () => {
    const passed = item({ id: 'h', date: '2026-11-08', time: '08:00' });
    const later = item({ id: 'next', date: '2026-11-10', time: '18:00' });

    expect(pickNextUp([passed, later], NOW)?.id).toBe('next');
    expect(pickNextHalqa([passed, later], NOW)?.id).toBe('next');
  });

  it('keeps the pill inside its seven-day horizon', () => {
    const far = item({ id: 'far', date: '2026-11-20', time: '18:00' });

    expect(pickNextUp([far], NOW)).toBeNull();
    // The rail still reports it: the horizon is the pill's rule, not the page's.
    expect(pickNextHalqa([far], NOW)?.id).toBe('far');
  });

  it('prefers a session over an exam at the same time', () => {
    const halqa = item({ id: 'h', date: '2026-11-09', time: '18:00' });
    const exam = item({
      id: 'e',
      kind: 'exam',
      date: '2026-11-09',
      time: '18:00',
    });

    expect(pickNextUp([exam, halqa], NOW)?.id).toBe('h');
    expect(pickNextUp([halqa, exam], NOW)?.id).toBe('h');
  });

  it('never lets a notice become the next thing', () => {
    const notice = item({
      id: 'n',
      kind: 'notice',
      date: '2026-11-08',
      time: null,
      topic: 'shaykh',
    });

    expect(pickNextUp([notice], NOW)).toBeNull();
    expect(pickNextExam([notice], NOW)).toBeNull();
  });

  it('picks the newest notice, not the oldest', () => {
    const older = item({ id: 'old', kind: 'notice', date: '2026-11-01' });
    const newer = item({ id: 'new', kind: 'notice', date: '2026-11-07' });

    expect(pickNewestNotice([older, newer])?.id).toBe('new');
    expect(pickNewestNotice([newer, older])?.id).toBe('new');
  });

  it('counts whole days from today', () => {
    expect(daysAway(item({ id: 'a', date: '2026-11-08' }), NOW)).toBe(0);
    expect(daysAway(item({ id: 'b', date: '2026-11-13' }), NOW)).toBe(5);
    expect(daysAway(item({ id: 'c', kind: 'notice', date: null }), NOW)).toBe(
      null,
    );
  });
});
