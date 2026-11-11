import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';
import type { SurahProgress } from '@/core/domain/progress/surah-progress';
import { useDirection } from '@/i18n';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { Pressable } from '@/ui/pressable';
import { heatmapGeometry } from './heatmap-geometry';
import { formatNumber, formatPercent } from './progress-format';

/**
 * The surah heatmap.
 *
 * One square per surah, coloured by how much of it is memorised. This is the
 * whole reason the screen exists, so it is a plain `flex-row flex-wrap` of
 * `Pressable`s: 114 views are cheap, they scroll with the page, and there is no
 * windowing to get wrong on a screen whose content is fixed.
 *
 * Why `Pressable` and not a native control: the swatch *is* the data. There are
 * no labels to give a SwiftUI list, and the accessible interaction is "select a
 * surah, read its detail sheet" — which a button with a spoken label does
 * exactly.
 *
 * Colour now comes from the same five token steps as the legend and the week
 * strip (a static opacity map), not from an interpolated RGB value. That keeps
 * the grid inside the theme: a token change moves the whole ramp, and dark mode
 * no longer carries a separate hard-coded green.
 *
 * `data-selected` (via `dataSet`) is the web-facing hook the plan asks for; on
 * native it is inert, and the border plus `accessibilityState` carry the same
 * information. The grid is `flex-row`, so surah 1 sits at the left in both
 * languages: the layout does not mirror, only the labels' direction follows the
 * language.
 */
export type SurahHeatmapProps = {
  rows: readonly SurahProgress[];
  selectedSurah: number | null;
  onSelect: (surahNumber: number) => void;
};

const LEVEL_CLASS = [
  'bg-muted',
  'bg-primary/20',
  'bg-primary/40',
  'bg-primary/65',
  'bg-primary',
] as const;

/** Five steps, shared with `ProgressLegend` and `WeekStrip`. */
export function heatmapLevel(percent: number): 0 | 1 | 2 | 3 | 4 {
  if (percent <= 0) return 0;
  if (percent < 25) return 1;
  if (percent < 50) return 2;
  if (percent < 75) return 3;

  return 4;
}

export function SurahHeatmap({
  rows,
  selectedSurah,
  onSelect,
}: SurahHeatmapProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const { width } = useWindowDimensions();

  const geometry = heatmapGeometry(width);

  return (
    <View className="items-center">
      <View
        testID="surah-heatmap"
        className="flex-row flex-wrap gap-1"
        style={{ width: geometry.width }}
      >
        {rows.map((row) => {
          const selected = row.surahNumber === selectedSurah;

          return (
            <Pressable
              key={row.surahNumber}
              testID={`surah-cell:${row.surahNumber}`}
              accessibilityRole="button"
              accessibilityLabel={t('pages.account.progress.cell.a11y', {
                number: formatNumber(row.surahNumber, language),
                percent: formatPercent(row.percent, language),
              })}
              accessibilityState={{ selected }}
              dataSet={{ selected }}
              onPress={() => onSelect(row.surahNumber)}
              className={cn(
                'rounded-sm border-2 active:opacity-70',
                LEVEL_CLASS[heatmapLevel(row.percent)],
                selected ? 'border-foreground' : 'border-transparent',
                FOCUS_RING,
              )}
              hitSlop={6}
              style={{
                width: geometry.cell,
                height: geometry.cell,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
