import { useVideoPlayer, VideoView } from 'expo-video';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Platform, Pressable, StyleSheet, View } from 'react-native';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { getHeroFilm } from './hero-media';

/**
 * The hero film, and everything that has to be true before it is allowed to
 * play.
 *
 * Four rules, in order of importance:
 *
 * 1. **The poster is a loading placeholder, nothing more.** It covers the film
 *    until the player reports `readyToPlay` (or paints its first frame,
 *    whichever lands first); after that it is removed, so a playing or paused
 *    film is never hidden behind a still. A player that errors goes back to the
 *    poster, because the still is the only honest frame it has.
 * 2. **Nothing decodes off screen.** The film scrolls away with the page, so it
 *    is paused when it leaves the viewport (web, `IntersectionObserver`) and
 *    when the app goes to the background (native, `AppState`) — unless the
 *    visitor stopped it on purpose, in which case coming back never restarts
 *    it behind their back.
 * 3. **It is never content.** The film is decorative: no audio, no fullscreen,
 *    no picture-in-picture, and the film itself is hidden from assistive
 *    technology. One icon control starts and stops the motion; the visible copy
 *    carries the meaning.
 * 4. **The control is a real control.** A 44 px glass circle with the play or
 *    pause glyph, labelled for screen readers, and its state follows the
 *    player, so an automatic pause and a manual one look the same.
 *
 * On Android the view uses `textureView`: a `SurfaceView` punches through the
 * window and would cover the glass panel and the dust drawn above it.
 */
export function HeroFilm() {
  const film = getHeroFilm();

  if (!film) {
    return null;
  }

  return <HeroFilmLayer film={film} />;
}

function HeroFilmLayer({ film }: { film: { video: number; poster: number } }) {
  const { t } = useTranslation();
  /** Set only by the control; auto-pause/resume must respect it. */
  const userPaused = useRef(false);

  const player = useVideoPlayer(film.video, (instance) => {
    instance.loop = true;
    instance.muted = true;
    // Even muted, a video player claims an audio session on iOS and would
    // pause the visitor's recitation or podcast. This asks not to.
    instance.audioMixingMode = 'mixWithOthers';
    // Play from the beginning at once; the loop carries on from there.
    instance.play();
  });

  // Seeded from the player, not synced in an effect: a fast local file can be
  // ready before the listeners attach, and a synchronous setState in an effect
  // would cascade a second render on every mount.
  const [ready, setReady] = useState(() => player.status === 'readyToPlay');
  const [playing, setPlaying] = useState(() => player.playing);

  useEffect(() => {
    const status = player.addListener('statusChange', (event) => {
      if (event.status === 'readyToPlay') {
        setReady(true);
      } else if (event.status === 'error') {
        // The poster is the only frame left to trust.
        setReady(false);

        if (__DEV__) {
          console.warn(
            '[HeroFilm] playback failed; keeping the poster.',
            event.error ?? null,
          );
        }
      }
    });

    const playback = player.addListener('playingChange', (event) => {
      setPlaying(event.isPlaying);
    });

    return () => {
      status.remove();
      playback.remove();
    };
  }, [player]);

  const frame = useRef<ComponentRef<typeof View>>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          if (!userPaused.current) player.play();
        } else {
          player.pause();
        }
      });

      return () => subscription.remove();
    }

    const node = frame.current as unknown as Element | null;

    if (!node || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (!entry) {
          return;
        }

        if (entry.isIntersecting) {
          if (!userPaused.current) player.play();
        } else {
          player.pause();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [player]);

  const toggle = useCallback(() => {
    if (player.playing) {
      userPaused.current = true;
      player.pause();
    } else {
      userPaused.current = false;
      player.play();
    }
  }, [player]);

  return (
    <>
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View ref={frame} style={StyleSheet.absoluteFill}>
          <VideoView
            player={player}
            // `absoluteFill` alone is not enough on the web: the library
            // renders a bare `<video>`, and a replaced element with
            // `left/right: 0` and no width falls back to the film's intrinsic
            // size instead of filling the container. The explicit 100% is what
            // makes it cover the hero.
            style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
            contentFit="cover"
            nativeControls={false}
            fullscreenOptions={{ enable: false }}
            allowsPictureInPicture={false}
            allowsVideoFrameAnalysis={false}
            surfaceType="textureView"
            playsInline
            onFirstFrameRender={() => setReady(true)}
          />
        </View>

        {ready ? null : (
          <View testID="hero-poster" style={StyleSheet.absoluteFill}>
            <Image
              source={film.poster}
              contentFit="cover"
              style={StyleSheet.absoluteFill}
              transition={240}
            />
          </View>
        )}
      </View>

      {/*
       * Above the scrim (z-10): the button is the only interactive thing on the
       * film, and the scrim sits over the footage. Dark canopy glass keeps it
       * legible over the bright sky and the dark dome alike.
       */}
      <Pressable
        testID="hero-film-toggle"
        accessibilityRole="button"
        accessibilityLabel={t(
          playing ? 'home.hero.pauseFilm' : 'home.hero.playFilm',
        )}
        onPress={toggle}
        className={cn(
          'absolute top-4 right-4 z-10 h-11 w-11 items-center justify-center rounded-full',
          'border border-parchment/25 bg-canopy/80 shadow-lg shadow-black/25',
          'active:opacity-80',
          FOCUS_RING,
        )}
      >
        <Icon name={playing ? 'pause' : 'play'} size={18} tone="parchment" />
      </Pressable>
    </>
  );
}
