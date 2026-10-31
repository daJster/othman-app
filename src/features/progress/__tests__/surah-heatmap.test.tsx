import { fireEvent, render, screen } from '@testing-library/react-native';
import type { SurahProgress } from '@/core/domain/progress/surah-progress';
import { SurahHeatmap } from '@/features/progress/surah-heatmap';

/**
 * The grid is plain data: 114 cells, one per surah, each carrying its own spoken
 * label and its selection state. Layout is a device concern (Uniwind classNames
 * are inert here), so nothing below asserts a style.
 */
const ROWS: SurahProgress[] = Array.from({ length: 114 }, (_, index) => {
  const surahNumber = index + 1;
  const percent = surahNumber === 1 ? 0 : surahNumber === 2 ? 50 : 100;

  return {
    surahNumber,
    percent,
    lastReviewed: percent === 0 ? null : '2026-10-01',
  };
});

describe('SurahHeatmap', () => {
  it('renders one cell per surah', async () => {
    await render(
      <SurahHeatmap rows={ROWS} selectedSurah={null} onSelect={jest.fn()} />,
    );

    expect(screen.getAllByTestId(/^surah-cell:/)).toHaveLength(114);
  });

  it('labels every cell with its number and progress', async () => {
    await render(
      <SurahHeatmap rows={ROWS} selectedSurah={null} onSelect={jest.fn()} />,
    );

    expect(screen.getByLabelText('Surah 1: 0% memorised')).toBeTruthy();
    expect(screen.getByLabelText('Surah 2: 50% memorised')).toBeTruthy();
    expect(screen.getByLabelText('Surah 3: 100% memorised')).toBeTruthy();
  });

  it('reports the tapped surah and leaves selection to the parent', async () => {
    const onSelect = jest.fn();
    await render(
      <SurahHeatmap rows={ROWS} selectedSurah={null} onSelect={onSelect} />,
    );

    await fireEvent.press(screen.getByTestId('surah-cell:2'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('marks the selected surah in accessibility state and on the web dataset', async () => {
    await render(
      <SurahHeatmap rows={ROWS} selectedSurah={2} onSelect={jest.fn()} />,
    );

    const selected = screen.getByTestId('surah-cell:2');
    expect(selected.props.accessibilityState).toEqual({ selected: true });
    expect(selected.props.dataSet).toEqual({ selected: true });

    const other = screen.getByTestId('surah-cell:3');
    expect(other.props.accessibilityState).toEqual({ selected: false });
    expect(other.props.dataSet).toEqual({ selected: false });
  });
});
