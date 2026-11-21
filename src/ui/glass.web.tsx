import type { ComponentRef, RefObject } from 'react';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { cn } from './cn';
import { useReducedTransparency } from './motion';

/**
 * The material layer — web.
 *
 * Same API as the native module; Metro picks this file by platform. The web
 * can do the real thing, so it does: `backdrop-filter` with a saturation lift
 * (the trick that stops a blur looking grey) and a per-weight radius applied to
 * the filtered layer itself. Chromium will not clip a backdrop filter to an
 * ancestor's `border-radius`, so every layer carries its own curve.
 *
 * Firefox and Chromium only recently shipped `prefers-reduced-transparency`;
 * where it is unsupported the media query simply never matches and the glass
 * stays. The component still honours it when it is available.
 */
export type GlassWeight = 'chrome' | 'panel' | 'overlay' | 'chip';

export type GlassRadius = 'chip' | 'panel' | 'card';

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

const BLUR: Record<GlassWeight, string> = {
  // Enough softening to read as a material, not enough to erase what is behind
  // it. The bar, the hero card and a control share one value; menus take a
  // little more because they carry text.
  chrome: 'saturate(1.5) blur(14px)',
  panel: 'saturate(1.5) blur(14px)',
  overlay: 'saturate(1.6) blur(22px)',
  chip: 'saturate(1.5) blur(14px)',
};

/**
 * The quiet card sits on another glass surface, so it gets a deeper frost and
 * one fewer bright edge. The blur is the material here; the rim is not.
 */
const QUIET_BLUR: Record<GlassWeight, string> = {
  chrome: 'saturate(1.4) blur(24px)',
  panel: 'saturate(1.4) blur(24px)',
  overlay: 'saturate(1.5) blur(32px)',
  chip: 'saturate(1.4) blur(24px)',
};

function glass(
  weight: GlassWeight,
  radiusPx: number,
  quiet: boolean,
): ViewStyle {
  const filter = quiet ? QUIET_BLUR[weight] : BLUR[weight];

  return {
    backdropFilter: filter,
    WebkitBackdropFilter: filter,
    borderRadius: radiusPx,
  } as unknown as ViewStyle;
}

/**
 * The lighting pass, per the glass spec.
 *
 * Two inset shadows rather than drawn lines: the top edge catches the light
 * (white 40%, 2px down, 4px blur) and the bottom edge falls into shade (black
 * 25%, 2px up, 4px blur). Both follow the surface's own curve, which a 1px
 * `<View>` never did — it ended square at every rounded corner.
 *
 * `inset` is CSS-only, so this layer exists on web; the native module builds
 * the same two bands from gradients.
 */
const LIGHTING = {
  boxShadow:
    'inset 0 2px 4px rgba(255, 255, 255, 0.08), inset 0 -2px 4px rgba(0, 0, 0, 0.1)',
} as const;

/**
 * The stroke: a 45° gradient at 5% → 100% → 5%, so the rim is dim on two
 * opposite corners and fully lit along the other diagonal — the top-left →
 * bottom-right axis.
 *
 * It is painted edge to edge and the material is then laid one pixel inside
 * it, which leaves exactly the 1px rim. A masked gradient would be the
 * textbook way to draw this, but rn-web normalises `mask` and drops
 * `mask-composite` (`xor` came back as `add`), so the mask leaked and flooded
 * the surface. Layering needs no CSS feature the DOM does not already have.
 */
const STROKE_GRADIENT =
  'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.16) 50%, rgba(255, 255, 255, 0.03) 100%)';

/** The same rim, dimmed: a card inside another glass surface. */
const QUIET_STROKE_GRADIENT =
  'linear-gradient(135deg, rgba(255, 255, 255, 0.015) 0%, rgba(255, 255, 255, 0.07) 50%, rgba(255, 255, 255, 0.015) 100%)';

/** One pixel, the stroke's width. */
const STROKE_PX = 1;

function stroke(quiet: boolean): ViewStyle {
  return {
    backgroundImage: quiet ? QUIET_STROKE_GRADIENT : STROKE_GRADIENT,
  } as unknown as ViewStyle;
}

const LIGHTING_QUIET = {
  boxShadow:
    'inset 0 2px 4px rgba(255, 255, 255, 0.04), inset 0 -2px 4px rgba(0, 0, 0, 0.06)',
} as const;

export type GlassFillProps = {
  weight?: GlassWeight;
  radius?: GlassRadius;
  className?: string;
  /**
   * A calmer card material: stronger frost, weaker rim and edge light.
   *
   * For content that sits *on* another glass surface, where the standard rim
   * would double against the parent's own edge and read as glare.
   */
  quiet?: boolean;
  /** Present in the shared native API; CSS backdrop-filter owns the web blur. */
  blurTarget?: RefObject<ComponentRef<typeof View> | null>;
};

export function GlassFill({
  weight = 'panel',
  radius = 'card',
  className,
  quiet = false,
}: GlassFillProps) {
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
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    );
  }

  return (
    <>
      {/* The rim, painted edge to edge — the material below covers all but it. */}
      <View
        className={cn('absolute inset-0', RADIUS_CLASS[radius], className)}
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radiusPx },
          stroke(quiet),
        ]}
        pointerEvents="none"
      />

      <View
        className={cn(WASH_CLASS[weight], RADIUS_CLASS[radius])}
        style={[
          StyleSheet.absoluteFill,
          {
            inset: STROKE_PX,
            borderRadius: radiusPx - STROKE_PX,
          },
          glass(weight, radiusPx - STROKE_PX, quiet),
        ]}
        pointerEvents="none"
      />

      {/*
       * The lighting, above the material: the top edge catches the light and
       * the bottom edge falls into shade. Drawn as inset shadows so both bands
       * follow the surface's own curve — the 1px `<View>` this replaced ended
       * square at every rounded corner.
       */}
      <View
        pointerEvents="none"
        className="absolute inset-0"
        style={[{ borderRadius: radiusPx }, quiet ? LIGHTING_QUIET : LIGHTING]}
      />
    </>
  );
}

export type GlassPanelProps = ViewProps & {
  weight?: GlassWeight;
  radius?: GlassRadius;
  className?: string;
  hairline?: boolean;
};

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
