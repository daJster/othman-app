import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { PageAyahBboxes } from '@/core/types';
import { cn } from '@/ui/cn';
import { Pressable } from '@/ui/pressable';
import { bboxToRect } from '../bbox-geometry';

/**
 * Hit-testing for one mushaf page.
 *
 * The scan already prints the ayat, so there is nothing to render except an
 * invisible button over each box: tapping inside an ayah selects it, tapping the
 * margins clears the selection. The boxes are drawn only when selected, which is
 * why `bboxes` (one per line of a wrapped ayah) are rendered as siblings with
 * the same key rather than merged into one rectangle — the union of two lines is
 * a block that covers the text between them.
 *
 * Layout order is the hit-test order. React Native gives later siblings the
 * touch and web does the same with DOM order, so the full-page "clear" button
 * comes first and never swallows a tap meant for an ayah. (`stopPropagation`
 * would only work on one of the two platforms, and the nesting would still make
 * the background a parent of the boxes.)
 *
 * No `ScopedTheme`: the art is an opaque scan, so light/dark controls nothing
 * inside it. The highlight is the one place a theme token is visible, and it is
 * a real class rather than a `data-selected` attribute — Uniwind compiles
 * `className` at build time and has no attribute variants.
 */
export type AyahOverlayProps = {
  /** The page's rows, keyed by ayah-in-surah. */
  ayat: Readonly<Record<string, PageAyahBboxes>>;
  selectedAyahKey: string | null;
  onSelectAyah: (ayahKey: string) => void;
  onClearSelection: () => void;
};

export function AyahOverlay({
  ayat,
  selectedAyahKey,
  onSelectAyah,
  onClearSelection,
}: AyahOverlayProps) {
  const { t } = useTranslation();

  return (
    <View className="absolute inset-0" pointerEvents="box-none">
      <Pressable
        className="absolute inset-0"
        accessibilityRole="button"
        accessibilityLabel={t('reader.clearSelection')}
        onPress={onClearSelection}
        testID="ayah-overlay-backdrop"
      />

      {Object.entries(ayat).flatMap(([ayahKey, row]) =>
        row.bboxes.map((bbox, index) => {
          const selected = ayahKey === selectedAyahKey;

          return (
            <Pressable
              // Ayah keys are unique per page; the index only disambiguates the
              // several boxes of an ayah that wraps onto another line.
              key={`${ayahKey}:${index}`}
              style={bboxToRect(bbox)}
              className={cn(
                'absolute rounded-sm border',
                selected
                  ? 'border-primary bg-primary/20'
                  : 'border-transparent',
              )}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={t('reader.ayahLabel', {
                ayah: ayahKey,
                surah: row.surahNumber,
              })}
              dataSet={{ ayah: ayahKey, selected }}
              onPress={() => onSelectAyah(ayahKey)}
              testID={`ayah:${ayahKey}:${index}`}
            />
          );
        }),
      )}
    </View>
  );
}
