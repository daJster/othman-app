import { backendClient } from '@/platform/backend';

/**
 * The inbox, over the wire.
 *
 * Notices live on the mock server rather than in a local fixture, so the panel
 * exercises a real request — including its delay — instead of resolving before
 * a waiting state could ever be painted. The rows are shaped like the
 * `CircleItem` notice the app already renders; nothing in the UI changes when
 * this moves to Firestore.
 */
export type Localized = {
  readonly ar: string;
  readonly en: string;
};

export type Notice = {
  readonly id: string;
  readonly kind: 'notice';
  /** Local calendar day, `YYYY-MM-DD`. */
  readonly date: string | null;
  /** ISO timestamp, for the relative time on each row. */
  readonly createdAt: string;
  readonly title: Localized;
  readonly body: Localized;
  readonly topic: 'shaykh' | 'halqa' | 'app' | null;
};

export type NoticesPage = {
  readonly notices: Notice[];
  readonly page: number;
  readonly hasMore: boolean;
  readonly total: number;
};

export const noticesService = {
  async list(page = 1, extended = false, limit?: number): Promise<NoticesPage> {
    const result = await backendClient.listNotices({ page, extended, limit });

    return {
      notices: result.notices,
      page: result.page,
      hasMore: result.hasMore,
      total: result.total,
    };
  },
};
