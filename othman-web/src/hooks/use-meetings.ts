import { useContext } from 'react';
import {
    MeetingsContext,
    type MeetingsContextValue,
} from '@/providers/contexts';

export const useMeetingsContext = (): MeetingsContextValue => {
    const ctx = useContext(MeetingsContext);
    if (!ctx) {
        throw new Error(
            'useMeetingsContext must be used within a MeetingsProvider'
        );
    }
    return ctx;
};
