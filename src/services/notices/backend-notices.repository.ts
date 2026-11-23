import { backendClient, type BackendClient } from '@/platform/backend';
import { parseNoticesResponse } from './backend-notices.wire';
import type { NoticesQuery, NoticesRepository } from './notices.types';

/** Inbox pages from the mock server, validated before the panel sees them. */

export type NoticesBackend = Pick<BackendClient, 'listNotices'>;

export function createBackendNoticesRepository(
  client: NoticesBackend = backendClient,
): NoticesRepository {
  return {
    async list(query: NoticesQuery, options) {
      return parseNoticesResponse(
        await client.listNotices(
          { page: query.page, extended: query.extended, limit: query.limit },
          options,
        ),
      );
    },
  };
}

export const backendNoticesRepository = createBackendNoticesRepository();
