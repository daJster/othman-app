import type { Meeting } from '@/types';
import {
    fetchMeetingsImpl,
    type FetchMeetingsCallback,
    type FetchMeetingsErrorCallback,
} from './db/fetchMeetings';

const meetingsCache = new Map<string, Meeting[]>();

export const getMeetingsFromCache = (date: string): Meeting[] | undefined => {
    return meetingsCache.get(date);
};

export const setMeetingsCache = (date: string, meetings: Meeting[]): void => {
    meetingsCache.set(date, meetings);
};

export const clearMeetingsCache = (): void => {
    meetingsCache.clear();
};

export const fetchMeetingsForDate = async (
    date: string,
    onSuccess?: (meetings: Meeting[]) => void,
    onError?: FetchMeetingsErrorCallback
): Promise<Meeting[]> => {
    const cached = getMeetingsFromCache(date);
    if (cached !== undefined) {
        onSuccess?.(cached);
        return cached;
    }

    try {
        const meetings = await fetchMeetingsImpl(date);
        setMeetingsCache(date, meetings);
        onSuccess?.(meetings);
        return meetings;
    } catch (error) {
        const err =
            error instanceof Error
                ? error
                : new Error('Failed to fetch meetings');
        onError?.(err);
        throw err;
    }
};

export const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export type { FetchMeetingsCallback, FetchMeetingsErrorCallback };
