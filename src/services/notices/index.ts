import { MOCK_BACKEND_ENABLED } from '@/platform/backend';
import { backendNoticesRepository } from './backend-notices.repository';
import { createNoticesService } from './notices.service';
import type { NoticesRepository } from './notices.types';

/**
 * Without the mock server there is no inbox. An empty page keeps the bell and
 * the panel honest, instead of pointing a Firebase build at a server that does
 * not exist (the audit's finding F1).
 */
const emptyNoticesRepository: NoticesRepository = {
  async list(query) {
    return { notices: [], page: query.page, hasMore: false, total: 0 };
  },
};

/**
 * App-wide inbox service.
 *
 * `EXPO_PUBLIC_MOCK_BACKEND=1` reads the mock server; otherwise the inbox is
 * empty. Screens import this barrel and never a repository.
 */
export const noticesService = createNoticesService(
  MOCK_BACKEND_ENABLED ? backendNoticesRepository : emptyNoticesRepository,
);

export { createNoticesService } from './notices.service';
export type { NoticesService } from './notices.service';
export type {
  Localized,
  Notice,
  NoticesPage,
  NoticesQuery,
  NoticesRepository,
} from './notices.types';
