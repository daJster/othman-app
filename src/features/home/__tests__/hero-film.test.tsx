import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { HeroFilm } from '@/features/home/hero-film';

/**
 * The hero film plays from the beginning in an infinite loop.
 *
 * The poster is a loading placeholder: it covers the film until the player
 * reports `readyToPlay` (or paints a first frame), and a player that errors
 * falls back to it. The glass toggle starts and stops playback. `expo-video`
 * is mocked at its boundary; the media set itself stays real.
 */
type Listener = (payload: {
  status?: string;
  isPlaying?: boolean;
  error?: unknown;
}) => void;

const mockListeners = new Map<string, Listener[]>();
let mockFirstFrame: (() => void) | null = null;
let mockSetupDone = false;

const mockPlayer = {
  status: 'loading',
  playing: false,
  loop: false,
  muted: false,
  audioMixingMode: '',
  play: jest.fn(() => {
    mockPlayer.playing = true;
  }),
  pause: jest.fn(() => {
    mockPlayer.playing = false;
  }),
  addListener: jest.fn((event: string, listener: Listener) => {
    const list = mockListeners.get(event) ?? [];
    list.push(listener);
    mockListeners.set(event, list);

    return { remove: jest.fn() };
  }),
};

jest.mock('expo-video', () => ({
  useVideoPlayer: (_source: unknown, setup: (instance: unknown) => void) => {
    // The real hook runs the setup once at creation, not on every render.
    if (!mockSetupDone) {
      mockSetupDone = true;
      setup(mockPlayer);
    }

    return mockPlayer;
  },
  VideoView: (props: { onFirstFrameRender?: () => void }) => {
    mockFirstFrame = props.onFirstFrameRender ?? null;

    return null;
  },
}));

function emitStatus(status: string): Promise<void> {
  return act(async () => {
    for (const listener of mockListeners.get('statusChange') ?? []) {
      listener({ status });
    }
  });
}

function emitPlaying(isPlaying: boolean): Promise<void> {
  mockPlayer.playing = isPlaying;

  return act(async () => {
    for (const listener of mockListeners.get('playingChange') ?? []) {
      listener({ isPlaying });
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
  mockSetupDone = false;
  jest.clearAllMocks();
  mockPlayer.status = 'loading';
  mockPlayer.playing = false;
});

describe('HeroFilm', () => {
  it('loops muted from the start and keeps the poster until ready', async () => {
    await render(<HeroFilm />);

    expect(mockPlayer.loop).toBe(true);
    expect(mockPlayer.muted).toBe(true);
    expect(mockPlayer.play).toHaveBeenCalled();
    expect(poster()).toBeTruthy();
  });

  it('removes the poster as soon as the player is ready', async () => {
    await render(<HeroFilm />);

    expect(poster()).toBeTruthy();

    await emitStatus('readyToPlay');

    expect(poster()).toBeNull();
  });

  it('removes the poster on the first rendered frame too', async () => {
    await render(<HeroFilm />);

    await emitFirstFrame();

    expect(poster()).toBeNull();
  });

  it('keeps the poster when playback errors', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await render(<HeroFilm />);
      await emitStatus('error');

      expect(warn).toHaveBeenCalledWith(
        '[HeroFilm] playback failed; keeping the poster.',
        null,
      );
      expect(poster()).toBeTruthy();
    } finally {
      warn.mockRestore();
    }
  });

  it('stops and starts playback from the glass control', async () => {
    await render(<HeroFilm />);
    await emitPlaying(true);

    await fireEvent.press(screen.getByTestId('hero-film-toggle'));

    expect(mockPlayer.pause).toHaveBeenCalledTimes(1);

    await emitPlaying(false);
    await fireEvent.press(screen.getByTestId('hero-film-toggle'));

    // One call from the setup, one from the control.
    expect(mockPlayer.play).toHaveBeenCalledTimes(2);
  });
});
