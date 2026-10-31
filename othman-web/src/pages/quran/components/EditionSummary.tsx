import React from 'react';
import { BookIcon } from 'lucide-react';
import { type QuranEdition } from '@/providers/contexts/quran-reader-context';
import { capitalizeFirst } from '@/lib/utils';

interface EditionSummaryProps {
    edition: QuranEdition;
}

const EditionSummary: React.FC<EditionSummaryProps> = ({ edition }) => {
    return (
        <div className="flex items-center gap-2 w-full">
            <BookIcon className="w-5 h-5" />
            <p className="text-sm font-semibold truncate text-foreground">
                {edition.name} • <span className='text-xs'>{capitalizeFirst(edition.riwaya)}</span>
            </p>
        </div>
    );
};

export default EditionSummary;
