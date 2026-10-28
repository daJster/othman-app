import { render, screen } from '@testing-library/react-native';
import { Progress } from '@/ui/progress';

/**
 * A bar is a number made visible. The tests assert the number, not the pixels:
 * Uniwind classNames are inert under Jest, so width belongs to the device pass.
 */
describe('Progress', () => {
  it('reports its value to assistive tech', async () => {
    await render(<Progress value={42} testID="bar" />);

    const bar = screen.getByTestId('bar');
    expect(bar.props.accessibilityRole).toBe('progressbar');
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 42 });
  });

  it('clamps a value above the range instead of overflowing the track', async () => {
    await render(<Progress value={180} testID="bar" />);

    expect(screen.getByTestId('bar').props.accessibilityValue.now).toBe(100);
  });

  it('clamps a negative value to zero', async () => {
    await render(<Progress value={-20} testID="bar" />);

    expect(screen.getByTestId('bar').props.accessibilityValue.now).toBe(0);
  });

  it('treats a non-finite value as zero rather than rendering NaN', async () => {
    await render(<Progress value={Number.NaN} testID="bar" />);

    expect(screen.getByTestId('bar').props.accessibilityValue.now).toBe(0);
  });

  it('accepts an accessibility label from the caller', async () => {
    await render(<Progress value={10} accessibilityLabel="Surah 2" />);

    expect(screen.getByLabelText('Surah 2')).toBeTruthy();
  });
});
