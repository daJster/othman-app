import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useCSSVariable } from 'uniwind';
import { getEditionPageSize } from '@/core/config';
import { quranPageImageUrl } from '@/core/domain/quran/page';
import type { PageAyahBboxes, QuranEdition } from '@/core/types';
import { Image } from '@/ui/image';
import { fitBox, type Size } from '../bbox-geometry';
import { cssNumber } from '../css-value';
import { AyahOverlay } from './ayah-overlay';

/**
 * One mushaf page: the scan, plus the ayah hit-testing on top.
 *
 * The image is `contentFit="contain"` inside a box whose size is computed from
 * the scan's own aspect ratio, not from the layout's. `contain` would otherwise
 * letterbox the scan inside an arbitrary box and every bbox would land off the
 * text by the width of the letterbox. Measuring the container and fitting the
 * page to it keeps the view and the image the same rectangle.
 *
 * The first frame is seeded from the window because `onLayout` reports nothing
 * until after mount, and a blank page is more jarring than a page that resizes
 * once. The layout callback then refines it — in the reader the window and the
 * container differ by the safe-area insets, and P5.4's chrome will take more.
 *
 * `cachePolicy="memory-disk"` is what makes a page turn instant after the first
 * visit; `use-page-prefetch` warms the neighbours.
 *
 * `backgroundColor` is the edition's own `themeColor`, the tint printed around
 * the scan. That is data, not a design token, so it travels through `style` like
 * the heatmap ramp.
 */
export type MushafPageProps = {
  edition: QuranEdition;
  page: number;
  /** The page's rows, or `undefined` when the payload has none. */
  ayat: Readonly<Record<string, PageAyahBboxes>> | undefined;
  selectedAyahKey: string | null;
  onSelectAyah: (ayahKey: string) => void;
  onClearSelection: () => void;
};

export function MushafPage({
  edition,
  page,
  ayat,
  selectedAyahKey,
  onSelectAyah,
  onClearSelection,
}: MushafPageProps) {
  const { t } = useTranslation();
  const window = useWindowDimensions();
  const [container, setContainer] = useState<Size>({
    width: window.width,
    height: window.height,
  });

  const [tokenWidth, tokenHeight, tokenMaxWidth] = useCSSVariable([
    '--reader-page-width',
    '--reader-page-height',
    '--reader-max-width',
  ]);

  const pageSize = getEditionPageSize(edition.name) ?? {
    width: cssNumber(tokenWidth, 412),
    height: cssNumber(tokenHeight, 600),
  };
  const maxWidth = cssNumber(tokenMaxWidth, 720);

  const box = fitBox(pageSize, {
    width: Math.min(container.width, maxWidth),
    height: container.height,
  });

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    setContainer((current) =>
      current.width === width && current.height === height
        ? current
        : { width, height },
    );
  }, []);

  return (
    <View
      className="flex-1 items-center justify-center"
      onLayout={handleLayout}
      testID="mushaf-frame"
    >
      {box.width > 0 ? (
        <View
          className="relative overflow-hidden"
          style={{
            width: box.width,
            height: box.height,
            backgroundColor: edition.themeColor,
          }}
          testID={`mushaf-page:${page}`}
        >
          <Image
            source={{ uri: quranPageImageUrl(edition, page) }}
            className="h-full w-full"
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={120}
            accessibilityLabel={t('reader.pageImage', { page })}
            testID="mushaf-image"
          />

          {ayat ? (
            <AyahOverlay
              ayat={ayat}
              selectedAyahKey={selectedAyahKey}
              onSelectAyah={onSelectAyah}
              onClearSelection={onClearSelection}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
