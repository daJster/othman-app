import { Text } from 'react-native';
import { GestureDetector, State } from 'react-native-gesture-handler';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import { screen } from '@testing-library/react-native';
import { render } from '@/test-utils/render';
import {
  useSwipeGesture,
  type UseSwipeGestureOptions,
} from '../use-swipe-gesture';

/**
 * The hook is the app's generic swipe contract: physical direction in,
 * caller-owned meaning out. These cases drive gesture-handler's own test
 * utilities, so the pan lifecycle and threshold are the library's, not a fake.
 */
function Harness(props: Omit<UseSwipeGestureOptions, 'testID'>) {
  const gesture = useSwipeGesture({ ...props, testID: 'test-swipe' });

  return (
    <GestureDetector gesture={gesture}>
      <Text>surface</Text>
    </GestureDetector>
  );
}

function swipe(translationX: number, velocityX = 0, translationY = 0) {
  fireGestureHandler(getByGestureTestId('test-swipe'), [
    { state: State.BEGAN, translationX: 0, translationY: 0 },
    { state: State.ACTIVE, translationX, translationY },
    { state: State.END, translationX, velocityX, translationY, velocityY: 0 },
  ]);
}

describe('useSwipeGesture', () => {
  it('reports a rightward thumb as right', async () => {
    const onSwipe = jest.fn();
    await render(<Harness onSwipe={onSwipe} />);

    swipe(120);

    expect(onSwipe).toHaveBeenCalledWith('right');
  });

  it('reports a leftward thumb as left', async () => {
    const onSwipe = jest.fn();
    await render(<Harness onSwipe={onSwipe} />);

    swipe(-120);

    expect(onSwipe).toHaveBeenCalledWith('left');
  });

  it('ignores a tap and a short drag', async () => {
    const onSwipe = jest.fn();
    await render(<Harness onSwipe={onSwipe} />);

    swipe(2);
    swipe(20);

    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('accepts a quick flick', async () => {
    const onSwipe = jest.fn();
    await render(<Harness onSwipe={onSwipe} />);

    swipe(-6, -900);

    expect(onSwipe).toHaveBeenCalledWith('left');
  });

  it('does nothing while disabled', async () => {
    const onSwipe = jest.fn();
    await render(<Harness onSwipe={onSwipe} enabled={false} />);

    swipe(-120);

    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('names vertical travel when the axis is vertical', async () => {
    const onSwipe = jest.fn();
    await render(<Harness onSwipe={onSwipe} axis="vertical" />);

    swipe(0, 0, -120);

    expect(onSwipe).toHaveBeenCalledWith('up');
    expect(screen.getByText('surface')).toBeTruthy();
  });
});
