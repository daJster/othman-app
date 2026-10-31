import {
    AudioLines,
    BookOpenIcon,
    StickyNoteIcon,
    Volume2Icon,
} from 'lucide-react';
import { QuranAyahReader } from './AyahReaderUtility';
import { TafsirUtility } from './TafsirUtility';
import { NoteUtility } from './NoteUtility';

export interface UtilityConfig {
    label: string;
    icon: React.ReactNode;
    panelFn: (callbacks: { onClose: () => void }) => React.ReactNode;
}

export interface QuranReaderUtilitiesConfig {
    utilities: { [key: string]: UtilityConfig };
    defaultUtility: string;
}

/**
 * createQuranReaderUtilitiesConfig
 *
 * Returns the full configuration object for the QuranReaderUtilities component.
 * Extend the `utilities` array here to add new tools in the future.
 */
export function createQuranReaderUtilitiesConfig(): QuranReaderUtilitiesConfig {
    return {
        defaultUtility: 'read',
        utilities: {
            read: {
                label: 'Read',
                icon: <Volume2Icon className="size-4" />,
                panelFn: ({ onClose }) => (
                    <QuranAyahReader />
                ),
            },
            recite: {
                label: 'Recite',
                icon: <AudioLines className="size-4" />,
                panelFn: () => <></>,
            },
            tafsir: {
                label: 'Tafsir',
                icon: <BookOpenIcon className="size-4" />,
                panelFn: ({ onClose }) => (
                    <TafsirUtility onClose={onClose} />
                ),
            },
            note: {
                label: 'Note',
                icon: <StickyNoteIcon className="size-4" />,
                panelFn: ({ onClose }) => (
                    <NoteUtility onClose={onClose} />
                ),
            },
        },
    };
}
