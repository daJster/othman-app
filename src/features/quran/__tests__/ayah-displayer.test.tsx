import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { AyahContentBlock } from '../ayah-content';
import { AyahDisplayer } from '../components/ayah-displayer';

/**
 * The ayah content renderer.
 *
 * The web version relied on a single document direction and a fixed
 * `leading-[2.1]`. Both break the moment a translation sits under the Quran
 * text at 200% text size, so these cases assert the two properties that keep it
 * readable: explicit per-block direction, and no line cap or fixed height that
 * could clip enlarged text.
 */

const QURAN = 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ';
const TRANSLATION = 'Allah — there is no deity except Him, the Ever-Living.';

const BLOCKS: AyahContentBlock[] = [
  { key: 'quran', kind: 'quran', text: QURAN, direction: 'rtl' },
  {
    key: 'en',
    kind: 'translation',
    text: TRANSLATION,
    direction: 'ltr',
    label: 'Translation',
  },
];

function styleOf(testID: string) {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style);
}

describe('AyahDisplayer', () => {
  it('renders every block with its text selectable', async () => {
    await render(<AyahDisplayer blocks={BLOCKS} />);

    expect(screen.getByTestId('ayah-block:quran').props.selectable).toBe(true);
    expect(screen.getByTestId('ayah-block:en').props.selectable).toBe(true);
    expect(screen.getByTestId('ayah-block:quran').props.children).toContain(
      QURAN,
    );
    expect(screen.getByTestId('ayah-block:en').props.children).toContain(
      TRANSLATION,
    );
  });

  it('keeps an LTR translation LTR inside the reader', async () => {
    await render(<AyahDisplayer blocks={BLOCKS} />);

    expect(styleOf('ayah-block:quran')).toMatchObject({
      writingDirection: 'rtl',
      textAlign: 'center',
    });
    expect(styleOf('ayah-block:en')).toMatchObject({
      writingDirection: 'ltr',
      textAlign: 'left',
    });
  });

  it('labels a source block without turning it into Quran text', async () => {
    await render(<AyahDisplayer blocks={BLOCKS} />);

    expect(screen.getByText('Translation')).toBeTruthy();
    expect(
      String(screen.getByTestId('ayah-block:en').props.className),
    ).not.toContain('font-quran');
  });

  it('does not cap lines or fix a line height, so 200% text cannot clip', async () => {
    await render(<AyahDisplayer blocks={BLOCKS} />);

    const quran = screen.getByTestId('ayah-block:quran');

    expect(quran.props.numberOfLines).toBeUndefined();
    expect(styleOf('ayah-block:quran').lineHeight).toBeUndefined();
    // The loose leading is a class (`leading-loose`), not a pixel value.
    expect(String(quran.props.className)).toContain('leading-loose');
  });

  it('bounds the text column on a tablet instead of stretching it', async () => {
    await render(<AyahDisplayer blocks={BLOCKS} />);

    expect(
      String(screen.getByTestId('ayah-content').props.className),
    ).toContain('max-w-2xl');
  });
});
