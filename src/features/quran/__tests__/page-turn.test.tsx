import { screen } from '@testing-library/react-native';
import { render } from '@/test-utils/render';
import { Text } from 'react-native';
import { State } from 'react-native-gesture-handler';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import { PageTurn } from '../components/page-turn';

/**
 * The gesture layer, driven through gesture-handler's own test utilities rather
 * than by simulating touches: the library owns the touch bookkeeping, and faking
 * it would test the fake.
 *
 * Reanimated is a manual mock in this repo (`withTiming` returns its target and
 * never calls its completion callback), so the entrance animation itself is not
 * observable here — its pixels are verified on device. What is observable, and
 * what matters, is the mapping from a swipe to a page.
 */

async function renderTurn(props: Partial<Parameters<typeof PageTurn>[0]> = {}) {
  const onSwipe = jest.fn();
  const onSettled = jest.fn();

  await render(
    <PageTurn
      direction={null}
      onSwipe={onSwipe}
      onSettled={onSettled}
      {...props}
    >
      <Text>page</Text>
    </PageTurn>,
  );

  return { onSwipe, onSettled };
}

function swipe(translationX: number, velocityX = 0) {
  fireGestureHandler(getByGestureTestId('page-turn'), [
    { state: State.BEGAN, translationX: 0 },
    { state: State.ACTIVE, translationX },
    { state: State.END, translationX, velocityX },
  ]);
}

describe('PageTurn', () => {
  it('renders the page it wraps', async () => {
    await renderTurn();

    expect(screen.getByText('page')).toBeTruthy();
  });

  it('turns forward on a leftward swipe', async () => {
    const { onSwipe } = await renderTurn();

    swipe(-120);

    expect(onSwipe).toHaveBeenCalledWith('forward');
  });

  it('turns backward on a rightward swipe', async () => {
    const { onSwipe } = await renderTurn();

    swipe(120);

    expect(onSwipe).toHaveBeenCalledWith('backward');
  });

  it('ignores a tap', async () => {
    const { onSwipe } = await renderTurn();

    swipe(2);

    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('accepts a quick flick', async () => {
    const { onSwipe } = await renderTurn();

    swipe(-6, -900);

    expect(onSwipe).toHaveBeenCalledWith('forward');
  });
});
