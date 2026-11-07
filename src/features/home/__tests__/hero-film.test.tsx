import { act, render, screen } from '@testing-library/react-native';
import { HeroFilm } from '@/features/home/hero-film';

/**
 * The hero film plays from the beginning in an infinite loop.
 *
 * Playback starts on mount (looped, muted); the poster underneath lifts on
 * the first rendered frame, and a player that errors never lifts it — the
 * still frame stays the hero. `expo-video` is mocked at its boundary; the
 * media set itself stays real.
 */
type Listener = (payload: { status: string }) => void;

const mockListeners = new Map<string, Listener[]>();
let mockFirstFrame: (() => void) | null = null;

const mockPlayer = {
  status: 'loading',
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
  VideoView: (props: { onFirstFrameRender?: () => void }) => {
    mockFirstFrame = props.onFirstFrameRender ?? null;

    return null;
  },
}));

let mockReducedMotion = false;

jest.mock('@/ui/motion', () => ({
  useReducedMotion: () => mockReducedMotion,
}));

function emitStatus(status: string): Promise<void> {
  return act(async () => {
    for (const listener of mockListeners.get('statusChange') ?? []) {
      listener({ status });
    }
  });
}

function emitFirstFrame(): Promise<void> {
  return act(async () => {
    mockFirstFrame?.();
  });
}

function poster(): unknown {
  return screen.queryByTestId('hero-poster', { includeHiddenElements: true });
}

beforeEach(() => {
  mockListeners.clear();
  mockFirstFrame = null;
  jest.clearAllMocks();
  mockPlayer.status = 'loading';
  mockReducedMotion = false;
});

describe('HeroFilm', () => {
  it('loops muted from the start and lifts the poster on first frame', async () => {
    await render(<HeroFilm />);

    expect(mockPlayer.loop).toBe(true);
    expect(mockPlayer.muted).toBe(true);
    expect(mockPlayer.play).toHaveBeenCalled();
    expect(poster()).toBeTruthy();

    await emitFirstFrame();

    expect(poster()).toBeNull();
  });

  it('plays even when the visitor asked to reduce motion', async () => {
    mockReducedMotion = true;

    await render(<HeroFilm />);

    expect(mockPlayer.play).toHaveBeenCalled();

    await emitFirstFrame();

    expect(poster()).toBeNull();
  });

  it('warns on error but still lifts on a real frame', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await render(<HeroFilm />);
      await emitStatus('error');

      expect(warn).toHaveBeenCalledWith(
        '[HeroFilm] playback failed; keeping the poster.',
        null,
      );
      // No frame has rendered, so the still frame stays the hero.
      expect(poster()).toBeTruthy();

      // A frame is a frame: once pixels exist the poster gets out of the way.
      await emitFirstFrame();

      expect(poster()).toBeNull();
    } finally {
      warn.mockRestore();
    }
  });
});
