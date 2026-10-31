import { useState, useCallback, type ReactNode } from 'react';
import type { Meeting } from '@/types';
import {
    fetchMeetingsForDate,
    formatDateKey,
    clearMeetingsCache,
    type FetchMeetingsErrorCallback,
} from '@/firebase/meetings';
import { MeetingsContext, type MeetingsContextValue } from './contexts/meetings-context.ts';

interface MeetingsProviderProps {
    children: ReactNode;
}

export const MeetingsProvider = ({ children }: MeetingsProviderProps) => {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    const fetchMeetings = useCallback(async (date: Date) => {
        setLoading(true);
        setError(null);
        setSelectedDate(date);

        const dateKey = formatDateKey(date);

        const onSuccess = (data: Meeting[]) => {
            setMeetings(data);
            setLoading(false);
        };

        const onError: FetchMeetingsErrorCallback = (err) => {
            setError(err);
            setMeetings([]);
            setLoading(false);
        };

        await fetchMeetingsForDate(dateKey, onSuccess, onError);
    }, []);

    const clearCache = useCallback(() => {
        clearMeetingsCache();
        setMeetings([]);
    }, []);

    const value: MeetingsContextValue = {
        meetings,
        loading,
        error,
        selectedDate,
        fetchMeetings,
        clearCache,
    };

    return (
        <MeetingsContext.Provider value={value}>
            {children}
        </MeetingsContext.Provider>
    );
};
