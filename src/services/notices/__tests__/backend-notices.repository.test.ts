import type { NoticesBackend } from '@/services/notices/backend-notices.repository';
import { createBackendNoticesRepository } from '@/services/notices/backend-notices.repository';

/**
 * The adapter's contract: the request it names, the page it returns, and the
 * refusal of a page whose rows drifted. The client is a fake, so no network is
 * involved and the assertions are about this layer alone.
 */

const NOTICE = {
  id: 'notice-halqa-shift',
  kind: 'notice',
  date: '2026-04-02',
  createdAt: '2026-04-02T10:00:00.000Z',
  // Fields the server sends that the app does not read.
  time: null,
  meta: null,
  href: null,
  title: { ar: 'عنوان', en: 'Title' },
  body: { ar: 'نص', en: 'Body' },
  topic: 'halqa',
};

const PAGE = {
  notices: [NOTICE],
  page: 1,
  hasMore: false,
  total: 1,
};

function fakeBackend(listNotices: jest.Mock): NoticesBackend {
  return { listNotices } as unknown as NoticesBackend;
}

describe('createBackendNoticesRepository', () => {
  it('requests the page with its query and returns the validated rows', async () => {
    const listNotices = jest.fn().mockResolvedValue(PAGE);
    const repository = createBackendNoticesRepository(fakeBackend(listNotices));
    const controller = new AbortController();

    const page = await repository.list(
      { page: 1, extended: false, limit: undefined },
      { signal: controller.signal },
    );

    expect(listNotices).toHaveBeenCalledWith(
      { page: 1, extended: false, limit: undefined },
      { signal: controller.signal },
    );
    expect(page.notices).toEqual([
      {
        id: 'notice-halqa-shift',
        kind: 'notice',
        date: '2026-04-02',
        createdAt: '2026-04-02T10:00:00.000Z',
        title: { ar: 'عنوان', en: 'Title' },
        body: { ar: 'نص', en: 'Body' },
        topic: 'halqa',
      },
    ]);
    expect(page).toMatchObject({ page: 1, hasMore: false, total: 1 });
  });

  it('rejects a row whose topic drifted and names the field', async () => {
    const drifted = { ...PAGE, notices: [{ ...NOTICE, topic: 'committee' }] };
    const repository = createBackendNoticesRepository(
      fakeBackend(jest.fn().mockResolvedValue(drifted)),
    );

    await expect(
      repository.list({ page: 1, extended: false }),
    ).rejects.toMatchObject({
      name: 'WireShapeError',
      path: 'notices[0].topic',
    });
  });
});
