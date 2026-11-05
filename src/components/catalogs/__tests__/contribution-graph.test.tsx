import { render, screen } from '@testing-library/react-native';
import type { ContributionDay } from '../contribution-graph.native';
import ContributionGraph from '../contribution-graph.native';

/**
 * Month labels for the native Annual heatmap.
 *
 * Five consecutive weeks from Monday 2026-09-28 to Sunday 2026-11-01 in six
 * week columns (Sunday start): the lead pads the first week and the last
 * column starts on Nov 1, so each month boundary starts a column and each of
 * the three month keys renders exactly once. The keys are sliced, never
 * Intl-formatted, so the cases do not depend on ICU data.
 */
function fiveWeeks(): ContributionDay[] {
  return Array.from({ length: 35 }, (_, index) => {
    const date = new Date(2026, 8, 28 + index, 12);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return { day: `${date.getFullYear()}-${month}-${day}`, count: 1 };
  });
}

function monthKey(day: string): string | null {
  return day.slice(0, 7);
}

describe('ContributionGraph month labels (native)', () => {
  it('renders each spanned month exactly once above the columns', async () => {
    const weeks = fiveWeeks();

    expect(weeks).toHaveLength(35);
    expect(weeks[0].day).toBe('2026-09-28');
    expect(weeks[weeks.length - 1].day).toBe('2026-11-01');

    await render(
      <ContributionGraph weeks={weeks} columns={6} monthLabel={monthKey} />,
    );

    expect(screen.getAllByText('2026-09')).toHaveLength(1);
    expect(screen.getAllByText('2026-10')).toHaveLength(1);
    expect(screen.getAllByText('2026-11')).toHaveLength(1);

    // Anchors, not column-width boxes: each label sits at its week's x
    // offset with room for its text (default cell 10 + gap 3).
    const leftOf = (text: string): number =>
      screen.getByText(text).parent?.props.style.left;
    expect([leftOf('2026-09'), leftOf('2026-10'), leftOf('2026-11')]).toEqual([
      0, 13, 65,
    ]);
    expect(
      screen.getAllByTestId('contribution-cell', {
        includeHiddenElements: true,
      }),
    ).toHaveLength(6 * 7);
  });

  it('renders no label row without monthLabel', async () => {
    await render(<ContributionGraph weeks={fiveWeeks()} columns={6} />);

    expect(screen.queryByText('2026-09')).toBeNull();
    expect(
      screen.getAllByTestId('contribution-cell', {
        includeHiddenElements: true,
      }),
    ).toHaveLength(6 * 7);
  });
});
