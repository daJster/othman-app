import type { DateKey } from '@/core/types';
import { backendClient } from '@/platform/backend';
import type { MeetingsRepository } from './meetings.types';

/**
 * Meetings repository backed by the mock server.
 *
 * The wire response already matches `Meeting` (the server derives `status`), so
 * this adapter is intentionally thin. The service layer above it still owns the
 * per-day cache and the TanStack query still owns component subscriptions —
 * switching the data source does not change either.
 */
export const backendMeetingsRepository: MeetingsRepository = {
  async listByDate(dateKey: DateKey) {
    const { meetings } = await backendClient.listMeetings({ date: dateKey });

    return meetings;
  },

  async listByRange(from: DateKey, to: DateKey) {
    const { meetings } = await backendClient.listMeetings({ from, to });

    return meetings;
  },
};
