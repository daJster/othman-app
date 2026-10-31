import { fireEvent, render, screen } from '@testing-library/react-native';
import type { AudioStatus } from 'expo-audio';
import { Pressable, Text } from 'react-native';
import type { UseAyahAudioOptions } from '../use-ayah-audio';
import { useAyahAudio } from '../use-ayah-audio';

/**
 * The playback owner's lifecycle.
 *
 * `expo-audio` is replaced by one fake player so these cases can assert the
 * contract the UI depends on: a source change replaces rather than duplicates
 * the player, a repeated completion advances once, and a late completion from
 * the previous source cannot move the reader.
 *
 * A probe component drives the hook instead of `renderHook`: this testing
 * library publishes `result.current` from a passive effect, so it can lag one
 * frame behind a rerender. Rendering the controller reads the current frame.
 */

const mockPlayer = {
  replace: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn(() => Promise.resolve()),
};

let mockStatus: AudioStatus;

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => mockPlayer,
  useAudioPlayerStatus: () => mockStatus,
}));

jest.mock('@/platform/audio', () => ({
  ensureAudioMode: jest.fn(() => Promise.resolve()),
}));

function status(overrides: Partial<AudioStatus> = {}): AudioStatus {
  return {
    id: 'player',
    currentTime: 0,
    playbackState: 'readyToPlay',
    timeControlStatus: 'paused',
    reasonForWaitingToPlay: '',
    mute: false,
    duration: 0,
    playing: false,
    loop: false,
    didJustFinish: false,
    isBuffering: false,
    isLoaded: false,
    playbackRate: 1,
    shouldCorrectPitch: true,
    isLive: false,
    currentOffsetFromLive: null,
    error: null,
    ...overrides,
  };
}

const options: UseAyahAudioOptions = {
  source: 'https://cdn.test/1.mp3',
  autoRead: false,
  onFinished: jest.fn(),
};

function Probe(props: UseAyahAudioOptions) {
  const audio = useAyahAudio(props);

  return (
    <>
      <Text testID="playing">{String(audio.playing)}</Text>
      <Text testID="error">{audio.error ?? ''}</Text>
      <Pressable testID="toggle" onPress={audio.toggle} />
      <Pressable testID="retry" onPress={audio.retry} />
      <Pressable testID="seek" onPress={() => audio.seekTo(150)} />
      <Pressable testID="seek-back" onPress={() => audio.seekTo(-5)} />
    </>
  );
}

beforeEach(() => {
  mockPlayer.replace.mockReset();
  mockPlayer.play.mockReset();
  mockPlayer.pause.mockReset();
  mockPlayer.seekTo.mockReset().mockResolvedValue(undefined);
  (options.onFinished as jest.Mock).mockReset();
  mockStatus = status();
});

describe('useAyahAudio', () => {
  it('replaces the one player’s source instead of creating a second player', async () => {
    const view = await render(<Probe {...options} />);

    expect(mockPlayer.replace).toHaveBeenCalledWith({
      uri: 'https://cdn.test/1.mp3',
    });

    mockStatus = status({ isLoaded: true, duration: 10 });
    await view.rerender(<Probe {...options} source="https://cdn.test/2.mp3" />);

    expect(mockPlayer.replace).toHaveBeenLastCalledWith({
      uri: 'https://cdn.test/2.mp3',
    });
    expect(mockPlayer.replace).toHaveBeenCalledTimes(2);
  });

  it('does not load anything without a selection', async () => {
    await render(<Probe {...options} source={null} />);

    expect(mockPlayer.replace).not.toHaveBeenCalled();
  });

  it('starts a newly loaded source when auto-read is on, but not after a pause', async () => {
    const view = await render(<Probe {...options} autoRead />);

    mockStatus = status({ isLoaded: true, playing: true });
    await view.rerender(<Probe {...options} autoRead />);

    expect(mockPlayer.play).toHaveBeenCalledTimes(1);

    // The user pauses: the same loaded source must not be forced back on.
    mockStatus = status({ isLoaded: true, playing: false });
    await view.rerender(<Probe {...options} autoRead />);

    expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  });

  it('advances once for repeated completion frames', async () => {
    const view = await render(<Probe {...options} />);

    mockStatus = status({ isLoaded: true, duration: 10 });
    await view.rerender(<Probe {...options} />);

    mockStatus = status({
      isLoaded: true,
      duration: 10,
      didJustFinish: true,
    });
    await view.rerender(<Probe {...options} />);
    await view.rerender(<Probe {...options} />);

    expect(options.onFinished as jest.Mock).not.toHaveBeenCalled();

    // Auto-read is what turns completion into advancement.
    mockStatus = status();
    const auto = await render(<Probe {...options} autoRead />);

    mockStatus = status({ isLoaded: true, duration: 10 });
    await auto.rerender(<Probe {...options} autoRead />);

    mockStatus = status({
      isLoaded: true,
      duration: 10,
      didJustFinish: true,
    });
    await auto.rerender(<Probe {...options} autoRead />);
    await auto.rerender(<Probe {...options} autoRead />);

    expect(options.onFinished as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('ignores a late completion from the source it just replaced', async () => {
    const view = await render(<Probe {...options} autoRead />);

    mockStatus = status({ isLoaded: true, duration: 10 });
    await view.rerender(<Probe {...options} autoRead />);

    // Switch reciter/ayah while the old source is finishing.
    mockStatus = status({
      isLoaded: true,
      duration: 10,
      didJustFinish: true,
    });
    await view.rerender(
      <Probe {...options} autoRead source="https://cdn.test/2.mp3" />,
    );

    expect(options.onFinished as jest.Mock).not.toHaveBeenCalled();

    // The new source loads and then genuinely finishes.
    mockStatus = status({ isLoaded: true, duration: 8 });
    await view.rerender(
      <Probe {...options} autoRead source="https://cdn.test/2.mp3" />,
    );

    mockStatus = status({
      isLoaded: true,
      duration: 8,
      didJustFinish: true,
    });
    await view.rerender(
      <Probe {...options} autoRead source="https://cdn.test/2.mp3" />,
    );

    expect(options.onFinished as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('pauses, resumes and seeks through the player', async () => {
    const view = await render(<Probe {...options} />);

    mockStatus = status({ isLoaded: true, duration: 100, playing: true });
    await view.rerender(<Probe {...options} />);

    expect(screen.getByTestId('playing').props.children).toBe('true');

    await fireEvent.press(screen.getByTestId('toggle'));
    expect(mockPlayer.pause).toHaveBeenCalledTimes(1);

    mockStatus = status({ isLoaded: true, duration: 100, playing: false });
    await view.rerender(<Probe {...options} />);

    await fireEvent.press(screen.getByTestId('toggle'));
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('seek'));
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(100);

    await fireEvent.press(screen.getByTestId('seek-back'));
    expect(mockPlayer.seekTo).toHaveBeenLastCalledWith(0);
  });

  it('replaces the source again on retry and exposes transport errors', async () => {
    const view = await render(<Probe {...options} />);

    mockStatus = status({ isLoaded: false, error: 'offline' });
    await view.rerender(<Probe {...options} />);

    expect(screen.getByTestId('error').props.children).toBe('offline');

    await fireEvent.press(screen.getByTestId('retry'));

    expect(mockPlayer.replace).toHaveBeenCalledTimes(2);
  });
});
