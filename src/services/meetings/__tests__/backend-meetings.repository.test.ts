import type { DateKey } from '@/core/types';
import {
  createBackendMeetingsRepository,
  type MeetingsBackend,
} from '@/services/meetings/backend-meetings.repository';

/**
 * The meetings adapter names the two queries the calendar uses and refuses a
 * row the screen cannot place. A clock time that is not `HH:mm` must fail here,
 * not render as a card with an empty time.
 */

const MEETING = {
  id: 1,
  title: 'Halqa',
  description: 'Weekly session',
  date: '2026-04-02',
  time: '18:00',
  durationMinutes: 60,
  meetLink: 'https://meet.example/halqa',
  status: 'scheduled',
  canceled: false,
  attendees: [{ name: 'Ali', userId: null, status: 'invited' }],
  organizer: 'Shaykh',
  location: 'Online',
  // Server-only fields the app does not read.
  createdAt: '2026-03-30T09:00:00.000Z',
  updatedAt: '2026-03-30T09:00:00.000Z',
};

function fakeBackend(listMeetings: jest.Mock): MeetingsBackend {
  return { listMeetings } as unknown as MeetingsBackend;
}

describe('createBackendMeetingsRepository', () => {
  it('reads one day by date and returns the validated meetings', async () => {
    const listMeetings = jest
      .fn()
      .mockResolvedValue({ meetings: [MEETING], total: 1 });
    const repository = createBackendMeetingsRepository(
      fakeBackend(listMeetings),
    );
    const controller = new AbortController();

    const meetings = await repository.listByDate('2026-04-02' as DateKey, {
      signal: controller.signal,
    });

    expect(listMeetings).toHaveBeenCalledWith(
      { date: '2026-04-02' },
      { signal: controller.signal },
    );
    expect(meetings).toEqual([
      {
        id: 1,
        title: 'Halqa',
        description: 'Weekly session',
        date: '2026-04-02',
        time: '18:00',
        durationMinutes: 60,
        meetLink: 'https://meet.example/halqa',
        status: 'scheduled',
        canceled: false,
        attendees: [{ name: 'Ali', userId: null, status: 'invited' }],
        organizer: 'Shaykh',
        location: 'Online',
      },
    ]);
  });

  it('reads a date range with from and to', async () => {
    const listMeetings = jest
      .fn()
      .mockResolvedValue({ meetings: [], total: 0 });
    const repository = createBackendMeetingsRepository(
      fakeBackend(listMeetings),
    );

    await expect(
      repository.listByRange('2026-04-01' as DateKey, '2026-04-30' as DateKey),
    ).resolves.toEqual([]);
    expect(listMeetings).toHaveBeenCalledWith(
      { from: '2026-04-01', to: '2026-04-30' },
      undefined,
    );
  });

  it('rejects a clock time that is not HH:mm and names the field', async () => {
    const drifted = { ...MEETING, time: '6pm' };
    const repository = createBackendMeetingsRepository(
      fakeBackend(
        jest.fn().mockResolvedValue({ meetings: [drifted], total: 1 }),
      ),
    );

    await expect(
      repository.listByDate('2026-04-02' as DateKey),
    ).rejects.toMatchObject({
      name: 'WireShapeError',
      path: 'meetings[0].time',
    });
  });
});
