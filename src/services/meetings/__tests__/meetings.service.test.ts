import { clearMeetingsCache } from '@/core/domain/meetings/cache';
import type { DateKey, Meeting } from '@/core/types';
import { createMeetingsService } from '@/services/meetings/meetings.service';
import type { MeetingsRepository } from '@/services/meetings/meetings.types';

const DAY = '2026-04-02' as DateKey;
const OTHER_DAY = '2026-04-03' as DateKey;

function meeting(id: number, date: DateKey = DAY): Meeting {
  return {
    id,
    title: `Meeting ${id}`,
    description: '',
    date,
    time: '2:00 PM',
    duration: '60 min',
    meetLink: '',
    status: 'scheduled',
    attendees: [],
    organizer: '',
    location: '',
  };
}

function createFakeRepository(
  byDay: Partial<Record<DateKey, Meeting[]>> = {},
): MeetingsRepository & { listByDate: jest.Mock } {
  const listByDate = jest.fn(async (dateKey: DateKey) => byDay[dateKey] ?? []);

  return { listByDate };
}

describe('createMeetingsService', () => {
  beforeEach(() => {
    clearMeetingsCache();
  });

  it('reads a day once and serves repeats from the cache', async () => {
    const repository = createFakeRepository({ [DAY]: [meeting(1)] });
    const service = createMeetingsService(repository);

    await expect(service.listByDate(DAY)).resolves.toEqual([meeting(1)]);
    await expect(service.listByDate(DAY)).resolves.toEqual([meeting(1)]);

    expect(repository.listByDate).toHaveBeenCalledTimes(1);
    expect(repository.listByDate).toHaveBeenCalledWith(DAY);
  });

  it('caches each day separately', async () => {
    const repository = createFakeRepository({
      [DAY]: [meeting(1)],
      [OTHER_DAY]: [meeting(2, OTHER_DAY)],
    });
    const service = createMeetingsService(repository);

    await service.listByDate(DAY);
    await service.listByDate(OTHER_DAY);

    expect(repository.listByDate).toHaveBeenCalledTimes(2);
  });

  it('caches an empty day too, so a blank calendar is not re-fetched', async () => {
    const repository = createFakeRepository();
    const service = createMeetingsService(repository);

    await expect(service.listByDate(DAY)).resolves.toEqual([]);
    await expect(service.listByDate(DAY)).resolves.toEqual([]);

    expect(repository.listByDate).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failure', async () => {
    const listByDate = jest
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([meeting(1)]);
    const service = createMeetingsService({ listByDate });

    await expect(service.listByDate(DAY)).rejects.toThrow('offline');
    await expect(service.listByDate(DAY)).resolves.toEqual([meeting(1)]);

    expect(listByDate).toHaveBeenCalledTimes(2);
  });

  it('drops the cache on invalidate', async () => {
    const repository = createFakeRepository({ [DAY]: [meeting(1)] });
    const service = createMeetingsService(repository);

    await service.listByDate(DAY);
    service.invalidate();
    await service.listByDate(DAY);

    expect(repository.listByDate).toHaveBeenCalledTimes(2);
  });
});
