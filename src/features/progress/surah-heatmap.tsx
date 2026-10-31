import { useTranslation } from 'react-i18next';
import { useColorScheme, useWindowDimensions, View } from 'react-native';
import type { SurahProgress } from '@/core/domain/progress/surah-progress';
import { getHeatmapColor } from '@/core/utils/heatmap';
import { useDirection } from '@/i18n';
import { cn } from '@/ui/cn';
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
 * `data-selected` (via `dataSet`) is the web-facing hook the plan asks for; on
 * native it is inert, and the border plus `accessibilityState` carry the same
 * information. RTL needs no special case: `flex-row` starts at the inline start,
 * so surah 1 sits on the right under `LayoutDirection`.
 *
 * Colour comes from `core/utils/heatmap.ts`, so it is a computed ramp position
 * rather than a theme token and must travel through `style`. That is the single
 * documented exception to "no colours outside the token block".
 */
export type SurahHeatmapProps = {
  rows: readonly SurahProgress[];
  selectedSurah: number | null;
  onSelect: (surahNumber: number) => void;
};

export function SurahHeatmap({
  rows,
  selectedSurah,
  onSelect,
}: SurahHeatmapProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const { width } = useWindowDimensions();
  const isDark = useColorScheme() === 'dark';

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
                selected ? 'border-foreground' : 'border-transparent',
              )}
              style={{
                width: geometry.cell,
                height: geometry.cell,
                backgroundColor: getHeatmapColor(row.percent, isDark),
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
