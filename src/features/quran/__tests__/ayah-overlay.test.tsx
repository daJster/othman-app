import { fireEvent, render, screen } from '@testing-library/react-native';
import '@/i18n';
import type { PageAyahBboxes } from '@/core/types';
import { AyahOverlay } from '../components/ayah-overlay';

/**
 * The overlay is the only way to select an ayah, so the contract is: one button
 * per box the payload drew, every box of a wrapped ayah reports the same ayah,
 * and the margins clear the selection.
 *
 * The boxes are asserted through `testID` and `accessibilityState`; their
 * geometry is covered by `bbox-geometry.test.ts` and never reaches layout here.
 */

const BOX = { top: 0.1, left: 0.1, bottom: 0.2, right: 0.9 };

const AYAT: Record<string, PageAyahBboxes> = {
  '1': { absoluteNumber: 1, surahNumber: 1, bboxes: [BOX] },
  // An ayah that wraps onto a second line: two boxes, one ayah.
  '2': {
    absoluteNumber: 2,
    surahNumber: 1,
    bboxes: [BOX, { top: 0.25, left: 0.1, bottom: 0.3, right: 0.5 }],
  },
};

async function renderOverlay(
  props: Partial<Parameters<typeof AyahOverlay>[0]> = {},
) {
  const onSelectAyah = jest.fn();
  const onBackdropPress = jest.fn();

  await render(
    <AyahOverlay
      ayat={AYAT}
      selectedAyahKey={null}
      onSelectAyah={onSelectAyah}
      onBackdropPress={onBackdropPress}
      {...props}
    />,
  );

  return { onSelectAyah, onBackdropPress };
}

describe('AyahOverlay', () => {
  it('draws one button per box, not one per ayah', async () => {
    await renderOverlay();

    expect(screen.getByTestId('ayah:1:0')).toBeTruthy();
    expect(screen.getByTestId('ayah:2:0')).toBeTruthy();
    expect(screen.getByTestId('ayah:2:1')).toBeTruthy();
  });

  it('reports the ayah, not the box, when any line of it is pressed', async () => {
    const { onSelectAyah } = await renderOverlay();

    await fireEvent.press(screen.getByTestId('ayah:2:1'));

    expect(onSelectAyah).toHaveBeenCalledWith('2');
  });

  it('clears the selection when the margin is pressed', async () => {
    const { onBackdropPress, onSelectAyah } = await renderOverlay();

    await fireEvent.press(screen.getByTestId('ayah-overlay-backdrop'));

    expect(onBackdropPress).toHaveBeenCalledTimes(1);
    expect(onSelectAyah).not.toHaveBeenCalled();
  });

  it('marks every box of the selected ayah as selected', async () => {
    await renderOverlay({ selectedAyahKey: '2' });

    expect(
      screen.getByTestId('ayah:2:0').props.accessibilityState,
    ).toMatchObject({ selected: true });
    expect(
      screen.getByTestId('ayah:2:1').props.accessibilityState,
    ).toMatchObject({ selected: true });
    expect(
      screen.getByTestId('ayah:1:0').props.accessibilityState,
    ).toMatchObject({ selected: false });
  });

  it('exposes the web hook for the same state', async () => {
    await renderOverlay({ selectedAyahKey: '1' });

    expect(screen.getByTestId('ayah:1:0').props.dataSet).toEqual({
      ayah: '1',
      selected: true,
    });
  });
});
