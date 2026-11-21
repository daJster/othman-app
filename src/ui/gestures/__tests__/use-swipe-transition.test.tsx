import { Text } from 'react-native';
import { GestureDetector, State } from 'react-native-gesture-handler';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import { act, screen } from '@testing-library/react-native';
import Animated from 'react-native-reanimated';
import { render } from '@/test-utils/render';
import type { SwipeTransitionOptions } from '../use-swipe-transition';
import { useSwipeTransition } from '../use-swipe-transition';

/**
 * The transition manager keeps the physical swipe contract and adds the
 * shared-value entrance. In Jest the animation builders are inert, so these
 * cases pin the part that matters: which swipes are allowed to start a page
 * change and which boundary directions are refused.
 */
function Harness(
  props: Omit<SwipeTransitionOptions, 'testID' | 'transitionKey'>,
) {
  const { gesture, style } = useSwipeTransition({
    ...props,
    transitionKey: 0,
    testID: 'transition-swipe',
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={style}>
        <Text>map</Text>
      </Animated.View>
    </GestureDetector>
  );
}

async function swipe(translationX: number) {
  await act(async () => {
    fireGestureHandler(getByGestureTestId('transition-swipe'), [
      { state: State.BEGAN, translationX: 0 },
      { state: State.ACTIVE, translationX },
      { state: State.END, translationX, velocityX: 0 },
    ]);
  });
}

describe('useSwipeTransition', () => {
  it('hands a physical swipe to the caller', async () => {
    const onSwipe = jest.fn();
    await render(<Harness onSwipe={onSwipe} />);

    await swipe(-120);

    expect(onSwipe).toHaveBeenCalledWith('left');
    expect(screen.getByText('map')).toBeTruthy();
  });

  it('allows one boundary direction to be refused', async () => {
    const onSwipe = jest.fn();
    await render(
      <Harness
        onSwipe={onSwipe}
        allowedDirections={{ left: false, right: true }}
      />,
    );

    await swipe(-120);
    expect(onSwipe).not.toHaveBeenCalled();

    await swipe(120);
    expect(onSwipe).toHaveBeenCalledWith('right');
  });
});
