import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { Image } from '@/ui/image';
import { getHeroFilm } from './hero-media';

/**
 * The hero film, and everything that has to be true before it is allowed to
 * play.
 *
 * Three rules, in order of importance:
 *
 * 1. **A still frame is always a valid hero.** The poster is rendered
 *    underneath and removed on the first rendered frame, so a blocked
 *    autoplay, a slow network or a decoder that never starts leaves a
 *    designed image rather than a black rectangle. The film plays for
 *    every visitor, reduced motion included: it is muted, looped and
 *    decorative, and the poster is the fallback, not a preference gate.
 * 2. **Nothing decodes off screen.** The film scrolls away with the page, so it
 *    is paused when it leaves the viewport (web, `IntersectionObserver`) and
 *    when the app goes to the background (native, `AppState`).
 * 3. **It is never content.** The film is decorative: no controls, no audio, no
 *    fullscreen, no picture-in-picture, no pointer events, and it is hidden
 *    from assistive technology. The visible copy carries the meaning.
 *
 * On Android the view uses `textureView`: a `SurfaceView` punches through the
 * window and would cover the glass panel and the dust drawn above it.
 */
export function HeroFilm() {
  const [playing, setPlaying] = useState(false);
  const film = getHeroFilm();

  if (!film) {
    return null;
  }

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <FilmPlayback source={film.video} onFirstFrame={() => setPlaying(true)} />

      {playing ? null : (
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
  );
}

function FilmPlayback({
  source,
  onFirstFrame,
}: {
  source: number;
  onFirstFrame: () => void;
}) {
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = true;
    instance.muted = true;
    // Even muted, a video player claims an audio session on iOS and would
    // pause the visitor's recitation or podcast. This asks not to.
    instance.audioMixingMode = 'mixWithOthers';
    // Play from the beginning at once; the loop carries on from there.
    instance.play();
  });

  // A player that errors never lifts the poster — report it in dev and leave
  // the still frame as the hero.
  useEffect(() => {
    const subscription = player.addListener('statusChange', (event) => {
      if (event.status === 'error' && __DEV__) {
        console.warn(
          '[HeroFilm] playback failed; keeping the poster.',
          event.error ?? null,
        );
      }
    });

    return () => subscription.remove();
  }, [player]);

  const frame = useRef<ComponentRef<typeof View>>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          player.play();
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
          player.play();
        } else {
          player.pause();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [player]);

  return (
    <View ref={frame} style={StyleSheet.absoluteFill}>
      <VideoView
        player={player}
        // `absoluteFill` alone is not enough on the web: the library renders a
        // bare `<video>`, and a replaced element with `left/right: 0` and no
        // width falls back to the film's intrinsic size instead of filling the
        // container. The explicit 100% is what makes it cover the hero.
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
        contentFit="cover"
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
        allowsPictureInPicture={false}
        allowsVideoFrameAnalysis={false}
        surfaceType="textureView"
        playsInline
        onFirstFrameRender={onFirstFrame}
      />
    </View>
  );
}
