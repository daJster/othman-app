import type { RequestOptions } from '@/platform/http';
import type { NoticesPage, NoticesRepository } from './notices.types';

export interface NoticesService {
  /** One page of the inbox. `page` is 1-based. */
  list(
    page?: number,
    extended?: boolean,
    limit?: number,
    options?: RequestOptions,
  ): Promise<NoticesPage>;
}

export function createNoticesService(
  repository: NoticesRepository,
): NoticesService {
  return {
    list(page = 1, extended = false, limit, options) {
      return repository.list({ page, extended, limit }, options);
    },
  };
}
