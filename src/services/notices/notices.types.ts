import type { RequestOptions } from '@/platform/http';

/**
 * The inbox: its rows, its page, and the repository contract behind it.
 *
 * Notices are shaped like the `CircleItem` notice the app already renders, so
 * the panel does not change when the source does.
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

export type NoticesQuery = {
  page: number;
  extended: boolean;
  limit?: number;
};

export interface NoticesRepository {
  list(query: NoticesQuery, options?: RequestOptions): Promise<NoticesPage>;
}
