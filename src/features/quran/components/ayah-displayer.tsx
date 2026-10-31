import { View } from 'react-native';
import { Text } from '@/ui/text';
import type { AyahContentBlock } from '../ayah-content';

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
 *  - **The ayah-end ornament replaces a PNG.** The web inlined
 *    `/ayah_icon-*.svg` before and after the text. Those assets are not in the
 *    Expo bundle, so the typographic ayah marker (`۝`, U+06DD) in the Quran font
 *    serves the same decorative role without a theme-dependent binary. It is
 *    marked non-accessible: a screen reader should read the ayah, not "end of
 *    ayah" twice.
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
  testID?: string;
};

export function AyahDisplayer({
  blocks,
  testID = 'ayah-content',
}: AyahDisplayerProps) {
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
              {isQuran ? (
                <Text accessible={false} className="text-primary">
                  ۝{' '}
                </Text>
              ) : null}
              {block.text}
              {isQuran ? (
                <Text accessible={false} className="text-primary">
                  {' '}
                  ۝
                </Text>
              ) : null}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
