import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from 'react';
import {
  Platform,
  View,
  useWindowDimensions,
  type ScrollViewProps,
} from 'react-native';
import { BlurTargetView } from 'expo-blur';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import type { AppHref } from '@/features/navigation/route-registry';
import { NAV_INSET } from '@/ui/ratio';
import { GlassFill } from '@/ui/glass';
import { setPageScrolled } from '@/ui/scroll-state';
import { Hero } from './hero';
import { NoticesBell } from './notices-bell';
import type { HeroCardCopy } from './hero-card';
import {
  HeroMorphCard,
  PIN_GAP,
  PILL_GUTTER,
  PILL_MAX_WIDTH,
  type HeroMorphRect,
} from './hero-morph';

/**
 * The home scroll container and the card that pins itself.
 *
 * The card is measured once, then the morph overlay is the visible card: the
 * hero keeps an invisible copy only to reserve the composition and to keep
 * reporting its rect when the viewport changes. The overlay lives outside the
 * ScrollView, so it can stay pinned past the hero's clipped edge, and it is a
 * sibling of the scroll view rather than a sticky header — no platform's
 * sticky implementation gets a vote in how this feels.
 *
 * **Web scrolls in a region, not the document.** The app shell is a fixed
 * viewport with a fixed bar, so the page's scroller is this element. That is
 * fine for the wheel and for touch, but it left keyboard users stranded: the
 * document never moves, so PageDown and Space did nothing until the scroller
 * itself held focus. It is a labelled, focusable scroll region now, which is
 * the standard pattern for exactly this situation — and the one fix that does
 * not restructure the shell every other screen depends on.
 */

type WindowRect = { x: number; y: number; width: number; height: number };

export type HeroScrollProps = {
  hero: HeroCardCopy & { title: string };
  /** The pinned pill's line: the next thing, or the page to resume. */
  pill: { label: string; href: AppHref };
  /** Accessible name for the web scroll region. */
  scrollLabel: string;
  children: ReactNode;
};

export function HeroScroll({
  hero,
  pill,
  scrollLabel,
  children,
}: HeroScrollProps) {
  const scrollY = useSharedValue(0);
  /** Mirrors the card's own spring so the floating bell fades on its clock. */
  const pillMorph = useSharedValue(0);
  const frameRef = useRef<ComponentRef<typeof View>>(null);
  const blurTargetRef = useRef<ComponentRef<typeof View>>(null);
  const frameOrigin = useRef<{ x: number; y: number } | null>(null);
  const cardWindow = useRef<WindowRect | null>(null);
  const [rect, setRect] = useState<HeroMorphRect | null>(null);
  const [ghostHidden, setGhostHidden] = useState(false);
  const [frameWidth, setFrameWidth] = useState(0);
  /** The pinned pill owns the inbox control once the card has morphed. */
  const [pillCompact, setPillCompact] = useState(false);
  const window = useWindowDimensions();

  /**
   * The card's rect is reported in window coordinates; the overlay lives in
   * the frame below the safe area. Subtract the frame origin, then add the
   * current scroll offset so the stored rect is in scroll-content space.
   */
  const commit = useCallback(() => {
    const card = cardWindow.current;
    const origin = frameOrigin.current;

    if (!card || !origin || card.width <= 0 || card.height <= 0) {
      return;
    }

    setRect({
      top: card.y - origin.y + scrollY.value,
      left: card.x - origin.x,
      width: card.width,
      height: card.height,
    });
    setGhostHidden(true);
  }, [scrollY]);

  const measureFrame = useCallback(() => {
    frameRef.current?.measureInWindow?.((x, y, width) => {
      if (width <= 0) return;

      frameOrigin.current = { x, y };
      setFrameWidth(width);
      commit();
    });
  }, [commit]);

  const handleCardRect = useCallback(
    (windowRect: WindowRect) => {
      cardWindow.current = windowRect;
      commit();
    },
    [commit],
  );

  useEffect(() => {
    measureFrame();
  }, [measureFrame, window.width, window.height]);

  useEffect(() => {
    setPageScrolled(false);
  }, []);

  const pageAwayFromTop = useSharedValue(false);
  const onScroll = useAnimatedScrollHandler((event) => {
    // Shared values are mutable by design; the React Compiler's immutability
    // rule cannot see into a Reanimated worklet.
    // eslint-disable-next-line react-hooks/immutability
    scrollY.value = event.contentOffset.y;

    const next = event.contentOffset.y > 8;
    if (next !== pageAwayFromTop.value) {
      pageAwayFromTop.value = next;
      runOnJS(setPageScrolled)(next);
    }
  });

  const available = (frameWidth || window.width) - PILL_GUTTER * 2;
  const pillWidth = Math.min(PILL_MAX_WIDTH, Math.max(0, available));
  const pinTop = Platform.OS === 'web' ? NAV_INSET : PIN_GAP;

  const stickyBellStyle = useAnimatedStyle(() => {
    if (!rect) {
      return { opacity: 1, transform: [{ scale: 1 }] };
    }

    /*
     * Leave before the card starts morphing: the last 80 px of approach clear
     * the floating bell. The reverse is tied to the card's spring again, so it
     * returns only as the card expands back into place.
     */
    const start = rect.top - pinTop;
    const approached = interpolate(
      scrollY.value,
      [start - 96, start - 16],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const handoff = Math.max(approached, pillMorph.value);
    const t = 1 - handoff;

    return {
      opacity: t,
      transform: [{ scale: 0.86 + 0.14 * t }],
    };
  });

  /**
   * Keyboard scrolling on web.
   *
   * Chrome scrolls the focused element, and this scroller is not focusable by
   * default. `tabIndex` plus a region role and a name is the smallest change
   * that makes PageDown, Space and the arrow keys work — and it tells a screen
   * reader what the region is instead of dumping it into the page.
   */
  const regionProps: ScrollViewProps =
    Platform.OS === 'web'
      ? ({
          tabIndex: 0,
          role: 'region',
          'aria-label': scrollLabel,
        } as ScrollViewProps)
      : {};

  return (
    <View
      className="flex-1 bg-background pt-safe"
      /*
       * Home opts out of the bar's inset: the slot reserves the chrome row for
       * every other screen, and this pulls the film back up so it runs behind
       * the glass. Web only — on a phone the tabs are at the bottom.
       */
      style={Platform.OS === 'web' ? { marginTop: -NAV_INSET } : undefined}
    >
      <View ref={frameRef} className="flex-1" onLayout={measureFrame}>
        {/*
         * The overlay is rendered *before* the scroll view on purpose: the
         * pinned card is the first thing a keyboard reaches, and a floating
         * control that comes last in DOM order is a trap. It paints above the
         * page because of `z-10`, not because of where it sits in the tree.
         */}
        {rect ? (
          <HeroMorphCard
            copy={hero}
            pill={pill}
            rect={rect}
            scrollY={scrollY}
            frameWidth={frameWidth || window.width}
            pillWidth={pillWidth}
            blurTarget={blurTargetRef}
            onCompactChange={setPillCompact}
            morphProgress={pillMorph}
            /*
             * The web bar floats above this frame at `z-20`. Parking the pill
             * at the optical gap put it directly behind the glass, where it
             * vanished; the pin line is the bar's own inset, so the collapsed
             * card holds just below it.
             */
            pinTop={pinTop}
          />
        ) : null}

        {/*
         * Phones have no top bar, so the inbox needs a control of its own. It
         * sits outside the scroller: pinned to the film at the top-left, it
         * stays reachable as the page moves. Once the hero card becomes the
         * pinned pill, the bell moves inside that card instead. Web already has
         * the bar bell, so this never renders there.
         */}
        {Platform.OS !== 'web' ? (
          <Animated.View
            testID="home-notices-sticky"
            pointerEvents={pillCompact ? 'none' : 'box-none'}
            aria-hidden={pillCompact}
            style={[
              { position: 'absolute', top: 12, left: 16, zIndex: 25 },
              stickyBellStyle,
            ]}
          >
            <View className="relative h-11 w-11 overflow-hidden rounded-full">
              <GlassFill
                weight="chip"
                radius="chip"
                blurTarget={blurTargetRef}
              />
              <NoticesBell variant="panel" />
            </View>
          </Animated.View>
        ) : null}

        <Animated.ScrollView
          testID="home-scroll"
          className="scrollbar-stable flex-1 overscroll-contain"
          contentContainerClassName="grow"
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={16}
          {...regionProps}
        >
          <BlurTargetView ref={blurTargetRef} style={{ flexGrow: 1 }}>
            <Hero
              {...hero}
              ghostHidden={ghostHidden}
              onCardRect={handleCardRect}
            />
            {children}
          </BlurTargetView>
        </Animated.ScrollView>
      </View>
    </View>
  );
}
