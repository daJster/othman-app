import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';

/**
 * Smoke test for the test harness itself: does `jest-expo` + RNTL render a
 * component tree that uses `className`?
 *
 * It does not and cannot prove that Uniwind's styling works — that transform
 * runs in Metro, not in Jest, so `className` is inert here. Styling is verified
 * on device and in the exported web CSS.
 *
 * RNTL 14 renders asynchronously (`render` returns a promise), so every test
 * here awaits it.
 */
function Subject({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <View className="flex-1 gap-2 bg-background p-4">
      <Text className="text-lg text-foreground">{label}</Text>
      {onPress ? (
        <Pressable className="rounded-lg bg-primary p-4" onPress={onPress}>
          <Text className="text-primary-foreground">press</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

describe('render smoke', () => {
  it('renders a className tree', async () => {
    await render(<Subject label="مرحبا" />);

    expect(screen.getByText('مرحبا')).toBeTruthy();
    expect(screen.queryByText('press')).toBeNull();
  });

  it('wires up press handlers', async () => {
    const onPress = jest.fn();
    await render(<Subject label="title" onPress={onPress} />);

    fireEvent.press(screen.getByText('press'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
