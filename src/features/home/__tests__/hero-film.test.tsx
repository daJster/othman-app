import { render } from '@testing-library/react-native';
import { HeroFilm } from '@/features/home/hero-film';

/**
 * The hero film starts somewhere new on every mount.
 *
 * The player seeks to a random position once its duration is known — either
 * immediately when it is already ready, or on the first `readyToPlay` status —
 * and only then plays, so the poster underneath hides the seek. `expo-video`
 * is mocked at its boundary; the media set itself stays real.
 */
type Listener = (payload: { status: string }) => void;

const mockListeners = new Map<string, Listener[]>();

const mockPlayer = {
  status: 'loading',
  duration: 42,
  currentTime: 0,
  loop: false,
  muted: false,
  audioMixingMode: '',
  play: jest.fn(),
  pause: jest.fn(),
  addListener: jest.fn((event: string, listener: Listener) => {
    const list = mockListeners.get(event) ?? [];
    list.push(listener);
    mockListeners.set(event, list);

    return { remove: jest.fn() };
  }),
};

jest.mock('expo-video', () => ({
  useVideoPlayer: (_source: unknown, setup: (instance: unknown) => void) => {
    setup(mockPlayer);

    return mockPlayer;
  },
  VideoView: () => null,
}));

function emitStatus(status: string): void {
  for (const listener of mockListeners.get('statusChange') ?? []) {
    listener({ status });
  }
}

beforeEach(() => {
  mockListeners.clear();
  jest.clearAllMocks();
  mockPlayer.status = 'loading';
  mockPlayer.currentTime = 0;
});

describe('HeroFilm', () => {
  it('seeks to a random position on ready, then plays', async () => {
    await render(<HeroFilm portrait />);

    expect(mockPlayer.play).not.toHaveBeenCalled();

    emitStatus('readyToPlay');

    expect(mockPlayer.currentTime).toBeGreaterThanOrEqual(0);
    expect(mockPlayer.currentTime).toBeLessThan(42);
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  });

  it('arms immediately when the player is already ready', async () => {
    mockPlayer.status = 'readyToPlay';

    await render(<HeroFilm portrait />);

    expect(mockPlayer.currentTime).toBeGreaterThanOrEqual(0);
    expect(mockPlayer.currentTime).toBeLessThan(42);
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  });
});
