import { getHeatmapColor } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';

export function Legend() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const levels = [0, 25, 50, 75, 100];

    return (
        <div className="flex items-center gap-2 mb-4 w-full justify-center">
            <span className="text-sm text-muted-foreground">Less</span>
            {levels.map((lvl) => (
                <div
                    key={lvl}
                    className="w-5 h-5 rounded border border-neutral-300/90 dark:border-neutral-300/20"
                    style={{ backgroundColor: getHeatmapColor(lvl, isDark) }}
                />
            ))}
            <span className="text-sm text-muted-foreground">More</span>
        </div>
    );
}
