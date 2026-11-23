import {
  createBackendProgressRepository,
  type ProgressBackend,
} from '@/services/progress/backend-progress.repository';

/**
 * Progress is the one feed where a bad value is silently wrong rather than
 * visibly broken: a percent of 150 would paint a heatmap cell past full. The
 * adapter clamps it, and refuses a surah the mushaf does not have.
 */

function fakeBackend(listProgress: jest.Mock): ProgressBackend {
  return { listProgress } as unknown as ProgressBackend;
}

describe('createBackendProgressRepository', () => {
  it('clamps an out-of-range percent and reads a missing date as never reviewed', async () => {
    const listProgress = jest.fn().mockResolvedValue({
      progress: [
        { surahNumber: 1, percent: 150, lastReviewed: null },
        { surahNumber: 2, percent: -4, lastReviewed: '2026-04-01' },
        { surahNumber: 3, percent: 40 },
      ],
    });
    const repository = createBackendProgressRepository(
      fakeBackend(listProgress),
    );

    const rows = await repository.listSurahProgress();

    expect(rows).toEqual([
      { surahNumber: 1, percent: 100, lastReviewed: null },
      { surahNumber: 2, percent: 0, lastReviewed: '2026-04-01' },
      { surahNumber: 3, percent: 40, lastReviewed: null },
    ]);
  });

  it('forwards the cancellation options to the request', async () => {
    const listProgress = jest.fn().mockResolvedValue({ progress: [] });
    const repository = createBackendProgressRepository(
      fakeBackend(listProgress),
    );
    const controller = new AbortController();

    await repository.listSurahProgress({ signal: controller.signal });

    expect(listProgress).toHaveBeenCalledWith({ signal: controller.signal });
  });

  it('rejects a surah number the mushaf does not have', async () => {
    const repository = createBackendProgressRepository(
      fakeBackend(
        jest.fn().mockResolvedValue({
          progress: [{ surahNumber: 115, percent: 10, lastReviewed: null }],
        }),
      ),
    );

    await expect(repository.listSurahProgress()).rejects.toMatchObject({
      name: 'WireShapeError',
      path: 'progress[0].surahNumber',
    });
  });
});
