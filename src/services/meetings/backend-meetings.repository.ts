import { backendClient, type BackendClient } from '@/platform/backend';
import { parseMeetingsResponse } from './backend-meetings.wire';
import type { MeetingsRepository } from './meetings.types';

/**
 * Meetings repository backed by the mock server.
 *
 * The adapter's only jobs are to name the request and to validate the answer.
 * The service above owns the per-day cache, and TanStack Query owns the
 * subscriptions, so switching the data source changes neither.
 */

/** The slice of the backend client this adapter uses. */
export type MeetingsBackend = Pick<BackendClient, 'listMeetings'>;

export function createBackendMeetingsRepository(
  client: MeetingsBackend = backendClient,
): MeetingsRepository {
  return {
    async listByDate(dateKey, options) {
      return parseMeetingsResponse(
        await client.listMeetings({ date: dateKey }, options),
      );
    },

    async listByRange(from, to, options) {
      return parseMeetingsResponse(
        await client.listMeetings({ from, to }, options),
      );
    },
  };
}

export const backendMeetingsRepository = createBackendMeetingsRepository();
