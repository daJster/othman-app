import {
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioStatus,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureAudioMode } from '@/platform/audio';

/**
 * The reader's single playback owner.
 *
 * One player instance is created for the lifetime of the reader. Selecting a
 * different ayah or reciter *replaces its source* rather than creating another
 * player, so a closed sheet or a second render cannot produce two players
 * playing over each other.
 *
 * Completion is guarded twice:
 *
 *  - `armed` only becomes true after the *current* source reports a loaded,
 *    unfinished status. A late `didJustFinish` from the previous source is
 *    therefore ignored even though the player is reused.
 *  - `finishedFor` remembers which source already advanced, so repeated status
 *    frames with `didJustFinish` still advance at most once.
 *
 * `autoRead` starts a newly loaded source and advances it; it never forces
 * playback back on after the user paused. A manual play resets the completion
 * guard so replaying the same ayah can advance again.
 */
export type AyahAudioController = {
  playing: boolean;
  buffering: boolean;
  isLoaded: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  toggle: () => void;
  seekTo: (seconds: number) => void;
  /** Re-load the current source after a transport failure. */
  retry: () => void;
};

export type UseAyahAudioOptions = {
  /** Full URL of the selected ayah/reciter, or `null` without a selection. */
  source: string | null;
  autoRead: boolean;
  /** Called once when an auto-read source finishes; the caller decides where. */
  onFinished: () => void;
};

const PLAYER_OPTIONS = {
  updateInterval: 250,
  preferredForwardBufferDuration: 5,
} as const;

export function useAyahAudio({
  source,
  autoRead,
  onFinished,
}: UseAyahAudioOptions): AyahAudioController {
  const player = useAudioPlayer(null, PLAYER_OPTIONS);
  const status: AudioStatus = useAudioPlayerStatus(player);

  const [reloadToken, setReloadToken] = useState(0);
  const armed = useRef(false);
  const autoPlayedFor = useRef<string | null>(null);
  const finishedFor = useRef<string | null>(null);

  useEffect(() => {
    // The session is global; a failure here is not a playback error and is
    // retried the next time the reader mounts.
    void ensureAudioMode().catch(() => undefined);
  }, []);

  useEffect(() => {
    armed.current = false;
    finishedFor.current = null;

    if (!source) return;

    player.replace({ uri: source });
  }, [player, reloadToken, source]);

  useEffect(() => {
    if (!source) {
      armed.current = false;

      return;
    }

    if (status.isLoaded && !status.didJustFinish) armed.current = true;
  }, [source, status.didJustFinish, status.isLoaded]);

  useEffect(() => {
    if (!autoRead) {
      autoPlayedFor.current = null;

      return;
    }

    if (!source || !status.isLoaded || autoPlayedFor.current === source) return;

    autoPlayedFor.current = source;
    player.play();
  }, [autoRead, player, source, status.isLoaded]);

  useEffect(() => {
    if (!status.didJustFinish || !armed.current) return;
    if (source === null || finishedFor.current === source) return;

    finishedFor.current = source;
    armed.current = false;

    if (!autoRead) return;

    onFinished();
  }, [autoRead, onFinished, source, status.didJustFinish]);

  const toggle = useCallback(() => {
    if (!source) return;

    if (status.playing) {
      player.pause();

      return;
    }

    // A manual replay is a new playback instance for the same source.
    finishedFor.current = null;
    armed.current = status.isLoaded;
    autoPlayedFor.current = source;
    player.play();
  }, [player, source, status.isLoaded, status.playing]);

  const seekTo = useCallback(
    (seconds: number) => {
      if (!Number.isFinite(seconds)) return;

      const target = Math.max(0, Math.min(seconds, status.duration || seconds));

      finishedFor.current = null;
      void player.seekTo(target);
    },
    [player, status.duration],
  );

  const retry = useCallback(() => {
    finishedFor.current = null;
    setReloadToken((token) => token + 1);
  }, []);

  return {
    playing: status.playing,
    buffering: status.isBuffering,
    isLoaded: status.isLoaded,
    currentTime: status.currentTime,
    duration: status.duration,
    error: status.error,
    toggle,
    seekTo,
    retry,
  };
}
