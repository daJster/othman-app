import { fireEvent, render, screen } from '@testing-library/react-native';
import { EmptyState, ErrorState, Loading } from '@/ui/states';

describe('Loading', () => {
  it('reports progress and shows its label', async () => {
    await render(<Loading label="Loading meetings" testID="loading" />);

    const node = screen.getByTestId('loading');
    expect(node.props.accessibilityRole).toBe('progressbar');
    expect(node.props.accessibilityLabel).toBe('Loading meetings');
    expect(screen.getByText('Loading meetings')).toBeTruthy();
  });

  it('renders without a label', async () => {
    await render(<Loading testID="loading" />);

    expect(
      screen.getByTestId('loading').props.accessibilityLabel,
    ).toBeUndefined();
  });
});

describe('ErrorState', () => {
  it('announces itself as an alert', async () => {
    await render(<ErrorState title="Something broke" testID="error" />);

    expect(screen.getByTestId('error').props.accessibilityRole).toBe('alert');
    expect(screen.getByText('Something broke')).toBeTruthy();
  });

  it('is a level-2 heading inline and a level-1 heading on a page', async () => {
    await render(<ErrorState title="Offline" />);
    expect(screen.getByText('Offline').props['aria-level']).toBe(2);

    await render(<ErrorState title="Page missing" headingLevel={1} />);
    expect(screen.getByText('Page missing').props['aria-level']).toBe(1);
  });

  it('runs a primary action', async () => {
    const onAction = jest.fn();
    await render(
      <ErrorState
        title="Page missing"
        actionLabel="Back to home"
        onAction={onAction}
      />,
    );

    await fireEvent.press(screen.getByText('Back to home'));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('surfaces the description', async () => {
    await render(
      <ErrorState title="Offline" description="Check your connection" />,
    );

    expect(screen.getByText('Check your connection')).toBeTruthy();
  });

  it('runs the retry action', async () => {
    const onRetry = jest.fn();
    await render(<ErrorState title="Offline" onRetry={onRetry} />);

    // Label comes from `action.retry`; the test locale is English.
    fireEvent.press(screen.getByText('Try again'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('uses a custom retry label', async () => {
    await render(
      <ErrorState title="Offline" onRetry={() => {}} retryLabel="Try again" />,
    );

    expect(screen.getByText('Try again')).toBeTruthy();
  });

  it('has no button when there is nothing to retry', async () => {
    await render(<ErrorState title="Forbidden" />);

    expect(screen.queryByText('Try again')).toBeNull();
  });
});

describe('EmptyState', () => {
  it('shows the title and description', async () => {
    await render(
      <EmptyState title="No meetings" description="Enjoy the day" />,
    );

    expect(screen.getByText('No meetings')).toBeTruthy();
    expect(screen.getByText('Enjoy the day')).toBeTruthy();
    expect(screen.getByText('No meetings').props['aria-level']).toBe(2);
  });

  it('runs the call to action', async () => {
    const onAction = jest.fn();
    await render(
      <EmptyState
        title="No meetings"
        actionLabel="Add meeting"
        onAction={onAction}
      />,
    );

    fireEvent.press(screen.getByText('Add meeting'));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('offers no action when the screen cannot handle one', async () => {
    await render(<EmptyState title="No meetings" />);

    expect(screen.queryByText('Add meeting')).toBeNull();
  });
});
