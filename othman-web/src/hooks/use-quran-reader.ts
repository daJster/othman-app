
import { QuranReaderContext, type QuranReaderContextValue } from '@/providers/contexts';
import { useContext } from 'react';

export function useQuranReader(): QuranReaderContextValue{
    const ctx = useContext(QuranReaderContext);
    if (!ctx) {
        throw new Error(
            'useQuranReader must be used inside QuranReaderProvider'
        );
    }
    return ctx;
}
