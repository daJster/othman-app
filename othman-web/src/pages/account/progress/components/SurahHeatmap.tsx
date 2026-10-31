import { useEffect, useState } from 'react';
import { HeatmapCell } from './HeatmapCell';
import { cn, fetchJSON, getHeatmapColor } from '@/lib/utils';
import { QURAN_METADATA_URL } from '@/data/configData';
import type { SurahCell } from '../types';
import type { SurahMetadata } from '@/providers';
import { Legend } from './Legend';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { View } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

const surahProgress: SurahCell[] = Array.from({ length: 114 }, (_, i) => ({
    id: i + 1,
    name: `Surah ${i + 1}`,
    progress: Math.floor(Math.random() * 101),
}));

type SurahHeatmapProps = {
    selectedSurah: number | null;
    onSelect: (surahId: number) => void;
};

export function SurahHeatmap({ selectedSurah, onSelect }: SurahHeatmapProps) {
    const [metadata, setMetadata] = useState<{
        [key: string]: SurahMetadata;
    } | null>(null);
    const [overview, setOverview] = useState(true);
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    useEffect(() => {
        fetchJSON<{ [key: string]: SurahMetadata }>(QURAN_METADATA_URL)
            .then(setMetadata)
            .catch(console.error);
    }, []);

    const displayData = metadata
        ? surahProgress.map((surah) => ({
              ...surah,
              name: metadata[String(surah.id)]?.name ?? surah.name,
          }))
        : surahProgress;

    return (
        <div className='flex flex-col items-center space-y-2'>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setOverview(!overview)}
                            className="flex gap-2 items-center text-muted-foreground"
                        >
                            <View className="size-5" />
                            <p>View more</p>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>View more</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {overview ? (
                <div className="flex flex-col items-center gap-0.5">
                    {Array.from({ length: 6 }, (_, row) => (
                        <div key={row} className="flex gap-0.5">
                            {Array.from({ length: 19 }, (_, col) => {
                                const index = row * 19 + col;
                                const surah = displayData[index];
                                if (!surah) return null;
                                return (
                                    <div
                                        key={surah.id}
                                        onClick={() => onSelect(surah.id)}
                                        className={cn(
                                            'w-4 h-4 cursor-pointer transition-transform hover:scale-150 hover:z-10 border border-neutral-300/20',
                                            selectedSurah === surah.id &&
                                                (isDark
                                                    ? 'ring-1 ring-green-300'
                                                    : 'ring-1 ring-green-900')
                                        )}
                                        style={{
                                            backgroundColor: getHeatmapColor(
                                                surah.progress,
                                                isDark
                                            ),
                                        }}
                                        title={`${surah.name} - ${surah.progress}%`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-3 w-full">
                    {displayData.map((surah) => (
                        <HeatmapCell
                            key={surah.id}
                            surah={surah}
                            isSelected={selectedSurah === surah.id}
                            onClick={() => onSelect(surah.id)}
                        />
                    ))}
                </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-5">
                <Legend />
            </div>
        </div>
    );
}
