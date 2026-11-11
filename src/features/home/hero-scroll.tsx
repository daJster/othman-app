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
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import type { AppHref } from '@/features/navigation/route-registry';
import { Hero } from './hero';
import type { HeroCardCopy } from './hero-card';
import {
  HeroMorphCard,
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
  const frameRef = useRef<ComponentRef<typeof View>>(null);
  const frameOrigin = useRef<{ x: number; y: number } | null>(null);
  const cardWindow = useRef<WindowRect | null>(null);
  const [rect, setRect] = useState<HeroMorphRect | null>(null);
  const [ghostHidden, setGhostHidden] = useState(false);
  const [frameWidth, setFrameWidth] = useState(0);
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

  const onScroll = useAnimatedScrollHandler((event) => {
    // Shared values are mutable by design; the React Compiler's immutability
    // rule cannot see into a Reanimated worklet.
    // eslint-disable-next-line react-hooks/immutability
    scrollY.value = event.contentOffset.y;
  });

  const available = (frameWidth || window.width) - PILL_GUTTER * 2;
  const pillWidth = Math.min(PILL_MAX_WIDTH, Math.max(0, available));

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
    <View className="flex-1 bg-background pt-safe">
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
          />
        ) : null}

        <Animated.ScrollView
          testID="home-scroll"
          className="flex-1"
          contentContainerClassName="grow"
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={16}
          {...regionProps}
        >
          <Hero
            {...hero}
            ghostHidden={ghostHidden}
            onCardRect={handleCardRect}
          />
          {children}
        </Animated.ScrollView>
      </View>
    </View>
  );
}
