import { render, screen } from '@testing-library/react-native';
import '@/i18n';
import type { PageAyahBboxes, QuranEdition } from '@/core/types';
import { MushafPage } from '../components/mushaf-page';

/**
 * The page is a scan plus an overlay, and its one job is that the overlay's
 * rectangle and the image's rectangle are the same. Jest cannot measure that,
 * so what is asserted here is the wiring: the right URL for the page, the
 * caching policy, and that a page with no boxes still shows its scan instead of
 * an empty screen.
 *
 * `useWindowDimensions` supplies the first frame (there is no `onLayout` in a
 * test renderer), which is exactly the fallback the component documents.
 */

const EDITION: QuranEdition = {
  key: '1',
  name: 'Tajweed',
  riwaya: 'hafs',
  baseUrl: 'https://cdn.test/1',
  bboxUrl: 'https://cdn.test/1/bbox.json',
  bboxReversedUrl: 'https://cdn.test/1/bbox_reversed.json',
  bboxNormUrl: 'https://cdn.test/1/bbox_norm.json',
  bboxReversedNormUrl: 'https://cdn.test/1/bbox_reversed_norm.json',
  firstPage: 1,
  lastPage: 604,
  themeColor: '#FFFFD7',
};

const AYAT: Record<string, PageAyahBboxes> = {
  '7': {
    absoluteNumber: 7,
    surahNumber: 2,
    bboxes: [{ top: 0.1, left: 0.1, bottom: 0.2, right: 0.9 }],
  },
};

describe('MushafPage', () => {
  it('renders the scan for the page with the CDN file name', async () => {
    await render(
      <MushafPage
        edition={EDITION}
        page={7}
        ayat={AYAT}
        selectedAyahKey={null}
        onSelectAyah={jest.fn()}
        onClearSelection={jest.fn()}
      />,
    );

    // `expo-image` normalises `source` to an array before it reaches the host
    // component, so the assertion is against that shape.
    expect(screen.getByTestId('mushaf-image').props.source).toEqual([
      { uri: 'https://cdn.test/1/pages/007.png' },
    ]);
  });

  it('asks expo-image to keep the page on disk between visits', async () => {
    await render(
      <MushafPage
        edition={EDITION}
        page={7}
        ayat={AYAT}
        selectedAyahKey={null}
        onSelectAyah={jest.fn()}
        onClearSelection={jest.fn()}
      />,
    );

    expect(screen.getByTestId('mushaf-image').props.cachePolicy).toBe(
      'memory-disk',
    );
    expect(screen.getByTestId('mushaf-image').props.contentFit).toBe('contain');
  });

  it('puts the ayah boxes on the page that has them', async () => {
    await render(
      <MushafPage
        edition={EDITION}
        page={7}
        ayat={AYAT}
        selectedAyahKey={null}
        onSelectAyah={jest.fn()}
        onClearSelection={jest.fn()}
      />,
    );

    expect(screen.getByTestId('ayah:7:0')).toBeTruthy();
  });

  it('still shows a scan when the payload has no boxes for the page', async () => {
    await render(
      <MushafPage
        edition={EDITION}
        page={7}
        ayat={undefined}
        selectedAyahKey={null}
        onSelectAyah={jest.fn()}
        onClearSelection={jest.fn()}
      />,
    );

    expect(screen.getByTestId('mushaf-image')).toBeTruthy();
    expect(screen.queryByTestId('ayah-overlay-backdrop')).toBeNull();
  });

  it('labels the image with its page number', async () => {
    await render(
      <MushafPage
        edition={EDITION}
        page={7}
        ayat={AYAT}
        selectedAyahKey={null}
        onSelectAyah={jest.fn()}
        onClearSelection={jest.fn()}
      />,
    );

    expect(screen.getByTestId('mushaf-image').props.accessibilityLabel).toBe(
      'Page 7 of the mushaf',
    );
  });
});
