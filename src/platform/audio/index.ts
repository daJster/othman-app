import { setAudioModeAsync, type AudioMode } from 'expo-audio';

/**
 * The app's audio session policy.
 *
 * The installer's prose suggested `staysActiveInBackground`, which is not a
 * field of the installed `AudioMode` type. The real field is
 * `shouldPlayInBackground`, and `interruptionMode: 'doNotMix'` is what makes a
 * phone call or another player take audio focus instead of mixing.
 *
 * The mode is process-global, so it is applied once and shared. A rejected
 * attempt is forgotten so a later mount can retry; callers are not forced to
 * surface a session error when the first play is what matters.
 */
export const AUDIO_MODE: Partial<AudioMode> = {
  playsInSilentMode: true,
  shouldPlayInBackground: true,
  interruptionMode: 'doNotMix',
};

let pending: Promise<void> | null = null;

export function ensureAudioMode(): Promise<void> {
  if (!pending) {
    pending = setAudioModeAsync(AUDIO_MODE).catch((error: unknown) => {
      pending = null;

      throw error;
    });
  }

  return pending;
}
