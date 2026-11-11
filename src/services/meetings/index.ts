import { MOCK_BACKEND_ENABLED } from '@/platform/backend';
import { createMeetingsService } from './meetings.service';
import { backendMeetingsRepository } from './backend-meetings.repository';
import { mockMeetingsRepository } from './mock-meetings.repository';

/**
 * App-wide meetings service.
 *
 * `EXPO_PUBLIC_MOCK_BACKEND=1` (set by `npm run dev`) reads the mock server;
 * otherwise the app keeps its offline fixture. `meetings.service.ts` and its
 * tests are unchanged either way.
 */
export const meetingsService = createMeetingsService(
  MOCK_BACKEND_ENABLED ? backendMeetingsRepository : mockMeetingsRepository,
);

export { createMeetingsService } from './meetings.service';
export type { MeetingsRepository, MeetingsService } from './meetings.types';
