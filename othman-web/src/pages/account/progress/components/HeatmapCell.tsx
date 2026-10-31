import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn, getHeatmapColor } from '@/lib/utils';
import type { SurahCell } from '../types';
import { useTheme } from '@/hooks/use-theme';

type HeatmapCellProps = {
    surah: SurahCell;
    isSelected: boolean;
    onClick: () => void;
};

export function HeatmapCell({ surah, isSelected, onClick }: HeatmapCellProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const getTextColor = (progress: number) => {
        if (isDark) {
            if (progress < 50) return 'text-neutral-300';
            return 'text-white';
        }
        if (progress < 50) return 'text-green-800';
        return 'text-white';
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        onClick={onClick}
                        className={cn(
                            'aspect-square border border-neutral-200/50 dark:border-neutral-200/20 cursor-pointer flex items-center justify-center text-[25px] font-medium',
                            getTextColor(surah.progress),
                            isSelected &&
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
                    >
                        {surah.name}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-md">
                        {surah.name} - {surah.progress}% complete
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
