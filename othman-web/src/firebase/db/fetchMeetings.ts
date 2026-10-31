import type { Meeting } from '@/types';
import meetingsData from '@/data/mock/MeetingsMock.json';

export type FetchMeetingsCallback = (date: string) => Promise<Meeting[]>;

export type FetchMeetingsErrorCallback = (error: Error) => void;

export const fetchMockMeetingsCallback: FetchMeetingsCallback = async (
    date: string
) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const allMeetings = meetingsData.meetings as Meeting[];
    const filtered = allMeetings.filter((m) => m.date === date);
    return filtered;
};

export const fetchMeetingsFromDBCallback: FetchMeetingsCallback = async (
    date: string
) => {
    console.log('fetching meetings of date : ', date);
    // to implement db call later
    return [];
};

export const setMeetingsFetchFunction = (fn: FetchMeetingsCallback): void => {
    fetchMeetingsImpl = fn;
};

export let fetchMeetingsImpl: FetchMeetingsCallback = fetchMockMeetingsCallback;
