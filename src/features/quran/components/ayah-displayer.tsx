import { useColorScheme, View } from 'react-native';
import { AYAH_ORNAMENT } from '@/features/brand/assets';
import { useDirection } from '@/i18n';
import { useOptionalThemeMode } from '@/providers/theme-provider';
import { Image } from '@/ui/image';
import { Text } from '@/ui/text';
import type { AyahContentBlock } from '../ayah-content';
import { formatReaderNumber } from '../format';

/**
 * Renders one ayah's content blocks.
 *
 * Ported from the web's `AyahDisplayer`, with three deliberate changes:
 *
 *  - **Direction is per block, not per screen.** `writingDirection` and
 *    `textAlign` are set explicitly from the block, so an LTR translation stays
 *    left-aligned inside an Arabic reader and an RTL e3rab excerpt stays
 *    right-aligned inside an English one. The surrounding reader is never
 *    flipped by its content.
 *  - **The ayah-end ornament is the product's own artwork.** The source's
 *    `ayah_icon-*` medallions are back in the bundle; the ayah-in-surah number
 *    sits inside the medallion, in the reader's digits. The mark is decorative
 *    (the panel already states the selected ayah), so it is hidden from
 *    assistive tech and never announced twice.
 *  - **No fixed line height.** A hard `lineHeight` does not follow the OS text
 *    size and would clip 200% text; the Quran font's own generous metrics carry
 *    the loose leading, and `leading-loose` is a scaling-friendly loosening on
 *    top rather than a pixel value.
 *
 * `selectable` is on every block: a reader copying an ayah must be able to
 * select it, and Qt/Android's long-press selection is the only way to do that.
 */
export type AyahDisplayerProps = {
  blocks: readonly AyahContentBlock[];
  /** Ayah number inside its surah; the number printed in the medallion. */
  ayahNumber?: number | null;
  testID?: string;
};

export function AyahDisplayer({
  blocks,
  ayahNumber = null,
  testID = 'ayah-content',
}: AyahDisplayerProps) {
  const { language } = useDirection();
  const theme = useOptionalThemeMode();
  const scheme = useColorScheme();
  const isDark = theme?.isDark ?? scheme === 'dark';
  const ornament = AYAH_ORNAMENT[isDark ? 'onDark' : 'onLight'];
  const hasNumber =
    ayahNumber !== null && Number.isInteger(ayahNumber) && ayahNumber > 0;

  return (
    <View className="w-full max-w-2xl gap-4 self-center" testID={testID}>
      {blocks.map((block) => {
        const isQuran = block.kind === 'quran';
        const align = isQuran
          ? 'center'
          : block.direction === 'rtl'
            ? 'right'
            : 'left';

        return (
          <View key={block.key} className="gap-1">
            {block.label ? (
              <Text variant="overline" tone="muted">
                {block.label}
              </Text>
            ) : null}

            <Text
              family={isQuran ? 'quran' : 'auto'}
              variant={isQuran ? 'heading' : 'body'}
              selectable
              className={isQuran ? 'leading-loose' : 'leading-relaxed'}
              style={{
                writingDirection: block.direction,
                textAlign: align,
              }}
              testID={`ayah-block:${block.key}`}
            >
              {block.text}
            </Text>

            {isQuran && hasNumber ? (
              <View
                className="mt-2 h-12 w-12 items-center justify-center self-center"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Image
                  source={ornament}
                  className="absolute inset-0 h-full w-full"
                  contentFit="contain"
                />
                <Text variant="caption" className="pb-0.5 font-semibold">
                  {formatReaderNumber(ayahNumber, language)}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
