import { createContext } from 'react';
import type { Meeting } from '@/types';

export interface MeetingsContextValue {
    meetings: Meeting[];
    loading: boolean;
    error: Error | null;
    selectedDate: Date;
    fetchMeetings: (date: Date) => Promise<void>;
    clearCache: () => void;
}

export const MeetingsContext = createContext<MeetingsContextValue | null>(null);
