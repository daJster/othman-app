import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Platform,
  StyleSheet,
  View,
  useColorScheme,
  type ViewProps,
} from 'react-native';
import type { ComponentRef, RefObject } from 'react';
import { cn } from './cn';
import { useReducedTransparency } from './motion';

/**
 * The material layer.
 *
 * One vocabulary for every translucent surface in the app, so a menu, a card
 * and the chrome cannot drift into three different glasses. The weight names
 * are the hierarchy, not decoration:
 *
 *  - `chrome`  — the bar that frames the app: thinnest wash, most film shows
 *                through.
 *  - `panel`   — a content surface over atmosphere (the hero card, a meeting
 *                card with an image behind it).
 *  - `overlay` — a surface that must hold text over arbitrary content: menus,
 *                dialogs, sheets. The heaviest wash, so contrast never depends
 *                on what happens to be behind it.
 *  - `chip`    — a control-sized accent (active tab, filter pill).
 *
 * **Platform materials, not one fake blur.** The web gets real
 * `backdrop-filter`; iOS gets the system material through `expo-blur`; Android
 * uses `expo-blur` when a surface is given the exact `BlurTargetView` behind it,
 * and keeps the tonal wash + sheen when no target is available.
 *
 * `prefers-reduced-transparency` is a separate preference from reduced motion:
 * the material becomes opaque but keeps its shape, its hairline and its ink.
 */
export type GlassWeight = 'chrome' | 'panel' | 'overlay' | 'chip';

export type GlassRadius = 'chip' | 'panel' | 'card';

/** Radius in points. Kept next to the class so the two can never diverge. */
export const GLASS_RADIUS_PX: Record<GlassRadius, number> = {
  chip: 12,
  panel: 16,
  card: 24,
};

const RADIUS_CLASS: Record<GlassRadius, string> = {
  chip: 'rounded-chip',
  panel: 'rounded-panel',
  card: 'rounded-card',
};

const WASH_CLASS: Record<GlassWeight, string> = {
  chrome: 'bg-glass-dim',
  panel: 'bg-glass',
  overlay: 'bg-glass-strong',
  chip: 'bg-glass',
};

/**
 * Height of the lighting bands, in points: a 2px offset with a 4px blur reads
 * as roughly this much falloff on a surface edge.
 */
const EDGE_BAND = 6;

/**
 * Blur intensity is a ratio of the surface's weight: thin chrome keeps the
 * page legible, an overlay erases it. iOS maps these onto system material
 * tints; the numbers are calibrated against the hero film, the busiest
 * backdrop in the product.
 */
const BLUR_INTENSITY: Record<GlassWeight, number> = {
  chrome: 14,
  panel: 14,
  overlay: 24,
  chip: 14,
};

export type GlassFillProps = {
  weight?: GlassWeight;
  radius?: GlassRadius;
  /** Extra classes for the wash layer (e.g. a tint or an opacity step). */
  className?: string;
  /**
   * A calmer card material: stronger frost, weaker rim and edge light.
   *
   * For content that sits *on* another glass surface, where the standard rim
   * would double against the parent's own edge and read as glare.
   */
  quiet?: boolean;
  /**
   * Keep the surface see-through when no exact blur target exists: the fallback
   * becomes the page's own ground at partial opacity instead of an opaque card.
   */
  translucent?: boolean;
  /** Exact background to blur on Android; omitted surfaces keep the tonal fallback. */
  blurTarget?: RefObject<ComponentRef<typeof View> | null>;
};

/**
 * The layers under a surface's content. Render inside an element that clips
 * (`overflow-hidden`) and give that element the same radius class.
 */
export function GlassFill({
  weight = 'panel',
  radius = 'card',
  className,
  quiet = false,
  translucent = false,
  blurTarget,
}: GlassFillProps) {
  const scheme = useColorScheme();
  const reducedTransparency = useReducedTransparency();
  const radiusPx = GLASS_RADIUS_PX[radius];
  const dark = scheme === 'dark';
  const groundClass = translucent ? 'bg-background/70' : 'bg-card';
  const hasAndroidBlurTarget = Platform.OS === 'android' && blurTarget != null;
  const intensity = quiet
    ? Math.min(100, BLUR_INTENSITY[weight] + 30)
    : BLUR_INTENSITY[weight];

  if (reducedTransparency) {
    return (
      <View
        className={cn(
          'absolute inset-0',
          translucent ? 'bg-background' : 'bg-card',
          RADIUS_CLASS[radius],
          className,
        )}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
    );
  }

  return (
    <>
      {/*
       * Android has no reliable backdrop blur (BlurView degrades to `none`
       * without a blurTarget), so an adapted solid ground goes underneath the
       * wash. Without it the translucent glass lets the page show through the
       * copy and the text loses its surface.
       */}
      {Platform.OS !== 'ios' && !hasAndroidBlurTarget ? (
        <View
          className={cn('absolute inset-0', groundClass, RADIUS_CLASS[radius])}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}

      {/*
       * iOS can sample the content behind it directly. Android needs the
       * explicit target from the surface's owning scroller; without that target
       * the branch above paints the dependable tonal ground instead.
       */}
      {Platform.OS === 'ios' || hasAndroidBlurTarget ? (
        <BlurView
          blurTarget={hasAndroidBlurTarget ? blurTarget : undefined}
          blurMethod={
            hasAndroidBlurTarget ? 'dimezisBlurViewSdk31Plus' : undefined
          }
          blurReductionFactor={4}
          intensity={
            Platform.OS === 'android' ? Math.min(100, intensity * 4) : intensity
          }
          tint={
            dark
              ? Platform.OS === 'android'
                ? 'systemUltraThinMaterialDark'
                : 'systemThinMaterialDark'
              : Platform.OS === 'android'
                ? 'systemUltraThinMaterialLight'
                : 'systemThinMaterial'
          }
          style={[StyleSheet.absoluteFill, { borderRadius: radiusPx }]}
          pointerEvents="none"
        />
      ) : null}

      <View
        className={cn(
          'absolute inset-0',
          WASH_CLASS[weight],
          RADIUS_CLASS[radius],
          className,
        )}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/*
       * The lighting pass, per the glass spec: a white inner highlight on the
       * top edge (40% white, offset 2, blur 4) and a black inner shadow on the
       * bottom edge (25% black, mirrored). Web draws these as `inset`
       * box-shadows; native has no such thing, so each is a fixed six-pixel
       * band with a gradient — fixed, not a percentage, because a percentage
       * band would grow with the surface and stop reading as an edge.
       */}
      <LinearGradient
        colors={
          scheme === 'dark'
            ? [
                `rgba(255, 255, 255, ${quiet ? 0.025 : 0.05})`,
                'rgba(255, 255, 255, 0)',
              ]
            : [
                `rgba(255, 255, 255, ${quiet ? 0.04 : 0.08})`,
                'rgba(255, 255, 255, 0)',
              ]
        }
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radiusPx, height: EDGE_BAND },
        ]}
        pointerEvents="none"
      />

      <LinearGradient
        colors={['rgba(0, 0, 0, 0)', `rgba(0, 0, 0, ${quiet ? 0.05 : 0.1})`]}
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radiusPx,
            height: EDGE_BAND,
            top: undefined,
            bottom: 0,
          },
        ]}
        pointerEvents="none"
      />
    </>
  );
}

export type GlassPanelProps = ViewProps & {
  weight?: GlassWeight;
  radius?: GlassRadius;
  /** Merge into the panel's own classes (padding, gap, size). */
  className?: string;
  /** Turns off the hairline for surfaces that sit inside another panel. */
  hairline?: boolean;
};

/**
 * A glass surface with content. The default is a card-weighted material with
 * a hairline — the shape every grouped surface in the app uses.
 */
export function GlassPanel({
  weight = 'panel',
  radius = 'card',
  hairline = true,
  className,
  children,
  ...props
}: GlassPanelProps) {
  return (
    <View
      className={cn(
        'relative overflow-hidden',
        RADIUS_CLASS[radius],
        hairline && 'border border-glass-edge',
        className,
      )}
      {...props}
    >
      <GlassFill weight={weight} radius={radius} />
      {children}
    </View>
  );
}
