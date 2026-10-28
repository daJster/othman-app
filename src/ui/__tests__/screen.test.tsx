import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Screen, ScreenView } from '@/ui/screen';

describe('Screen', () => {
  it('renders its children', async () => {
    await render(
      <Screen testID="screen">
        <Text>content</Text>
      </Screen>,
    );

    expect(screen.getByTestId('screen')).toBeTruthy();
    expect(screen.getByText('content')).toBeTruthy();
  });

  it('keeps the keyboard open when the first tap hits a button', async () => {
    await render(<Screen testID="screen" />);

    // RN's default is `never`: the first tap only dismisses the keyboard, so a
    // form button appears to need two taps.
    expect(screen.getByTestId('screen').props.keyboardShouldPersistTaps).toBe(
      'handled',
    );
  });

  it('respects the top inset unless told otherwise', async () => {
    await render(<Screen testID="screen" />);

    expect(
      screen.getByTestId('screen').props.contentInsetAdjustmentBehavior,
    ).toBe('automatic');
  });

  it('lets the caller override scroll behaviour', async () => {
    await render(
      <Screen
        testID="screen"
        keyboardShouldPersistTaps="never"
        scrollEnabled={false}
      />,
    );

    const node = screen.getByTestId('screen');
    expect(node.props.keyboardShouldPersistTaps).toBe('never');
    expect(node.props.scrollEnabled).toBe(false);
  });
});

describe('ScreenView', () => {
  it('renders without scrolling', async () => {
    await render(
      <ScreenView testID="view">
        <Text>centred</Text>
      </ScreenView>,
    );

    expect(screen.getByText('centred')).toBeTruthy();
    // A `View` has no scroll props at all — that is the point of the split.
    expect(screen.getByTestId('view').props.scrollEnabled).toBeUndefined();
  });
});
