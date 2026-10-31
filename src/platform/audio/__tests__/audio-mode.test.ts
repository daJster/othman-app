const mockSetAudioModeAsync = jest.fn<Promise<void>, [unknown]>();

jest.mock('expo-audio', () => ({
  setAudioModeAsync: (mode: unknown) => mockSetAudioModeAsync(mode),
}));

/**
 * The installed audio-mode API, not the installer's prose.
 *
 * `staysActiveInBackground` does not exist in `expo-audio`; the supported field
 * is `shouldPlayInBackground`. The mode is process-global, so repeated mounts
 * must share one call while a failure must remain retryable.
 */

function load() {
  let module: typeof import('../index') | undefined;

  jest.isolateModules(() => {
    module = require('../index');
  });

  return module as typeof import('../index');
}

beforeEach(() => {
  mockSetAudioModeAsync.mockReset().mockResolvedValue(undefined);
});

describe('ensureAudioMode', () => {
  it('applies silent-mode and background playback with the installed field names', async () => {
    const { ensureAudioMode } = load();

    await ensureAudioMode();

    expect(mockSetAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
  });

  it('shares one call across mounts', async () => {
    const { ensureAudioMode } = load();

    await Promise.all([ensureAudioMode(), ensureAudioMode()]);
    await ensureAudioMode();

    expect(mockSetAudioModeAsync).toHaveBeenCalledTimes(1);
  });

  it('keeps a failure retryable', async () => {
    mockSetAudioModeAsync
      .mockRejectedValueOnce(new Error('session unavailable'))
      .mockResolvedValueOnce(undefined);

    const { ensureAudioMode } = load();

    await expect(ensureAudioMode()).rejects.toThrow('session unavailable');
    await expect(ensureAudioMode()).resolves.toBeUndefined();

    expect(mockSetAudioModeAsync).toHaveBeenCalledTimes(2);
  });
});
