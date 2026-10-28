import { createMeetingsService } from './meetings.service';
import { mockMeetingsRepository } from './mock-meetings.repository';

/**
 * App-wide meetings service.
 *
 * Swapping mock data for Firestore is a one-line change here;
 * `meetings.service.ts` and its tests stay as they are.
 */
export const meetingsService = createMeetingsService(mockMeetingsRepository);

export { createMeetingsService } from './meetings.service';
export type { MeetingsRepository, MeetingsService } from './meetings.types';
