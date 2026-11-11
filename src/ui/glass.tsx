import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Platform,
  StyleSheet,
  View,
  useColorScheme,
  type ViewProps,
} from 'react-native';
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
 * gets a tonal glass (wash + sheen) because the platform blur needs a
 * `blurTarget` view wired to the exact content behind it, and the current
 * `BlurView` silently falls back to no blur when that is missing. A tonal
 * surface is the honest Material 3 answer, and it keeps the frame budget on
 * low-end devices.
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
 * Blur intensity is a ratio of the surface's weight: thin chrome keeps the
 * page legible, an overlay erases it. iOS maps these onto system material
 * tints; the numbers are calibrated against the hero film, the busiest
 * backdrop in the product.
 */
const BLUR_INTENSITY: Record<GlassWeight, number> = {
  chrome: 18,
  panel: 22,
  overlay: 40,
  chip: 16,
};

export type GlassFillProps = {
  weight?: GlassWeight;
  radius?: GlassRadius;
  /** Extra classes for the wash layer (e.g. a tint or an opacity step). */
  className?: string;
};

/**
 * The layers under a surface's content. Render inside an element that clips
 * (`overflow-hidden`) and give that element the same radius class.
 */
export function GlassFill({
  weight = 'panel',
  radius = 'card',
  className,
}: GlassFillProps) {
  const scheme = useColorScheme();
  const reducedTransparency = useReducedTransparency();
  const radiusPx = GLASS_RADIUS_PX[radius];

  if (reducedTransparency) {
    return (
      <View
        className={cn(
          'absolute inset-0 bg-card',
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
       * iOS owns a real material. Android gets the tonal wash below instead:
       * `BlurView` without a `blurTarget` degrades to `none` (and warns), so
       * asking for it there would be a lie with a frame cost.
       */}
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={BLUR_INTENSITY[weight]}
          tint={
            scheme === 'dark' ? 'systemThinMaterialDark' : 'systemThinMaterial'
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

      {/* The light catches the top edge of a real material. */}
      <LinearGradient
        colors={
          scheme === 'dark'
            ? ['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0)']
            : ['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0)']
        }
        locations={[0, 0.24]}
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radiusPx, opacity: 0.9 },
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
