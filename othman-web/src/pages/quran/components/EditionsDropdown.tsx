import React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useQuranReader } from '@/hooks/use-quran-reader';
import { type QuranEdition } from '@/providers/contexts/quran-reader-context';
import EditionSummary from './EditionSummary';

const EditionsDropdown: React.FC = () => {
    const { nav, editions, selectedEdition } = useQuranReader();

    if (!editions) return null;

    const editionList = Object.entries(editions) as [string, QuranEdition][];

    return (
        <Select
            value={selectedEdition?.name}
            onValueChange={(value) => {
                const selected = editionList.find(
                    ([, ed]) => ed.name === value
                );
                if (selected) {
                    nav?.switchEdition(selected[0]);
                }
            }}
        >
            <SelectTrigger className="w-full min-h-12">
                <SelectValue placeholder="Select edition">
                    {selectedEdition ? (
                        <EditionSummary edition={selectedEdition} />
                    ) : (
                        <span className="text-muted-foreground">
                            Select edition
                        </span>
                    )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent position='popper' className='border border-neutral-300/50 rounded-lg drop-shadow-xl'>
                {editionList.map(([key, edition]) => (
                    <SelectItem key={key} value={edition.name} className='min-h-12 '>
                        <EditionSummary edition={edition} />
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};

export default EditionsDropdown;
