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
  chrome: 'saturate(1.7) blur(22px)',
  panel: 'saturate(1.6) blur(24px)',
  overlay: 'saturate(1.8) blur(30px)',
  chip: 'saturate(1.5) blur(16px)',
};

function glass(weight: GlassWeight, radiusPx: number): ViewStyle {
  const filter = BLUR[weight];

  return {
    backdropFilter: filter,
    WebkitBackdropFilter: filter,
    borderRadius: radiusPx,
  } as unknown as ViewStyle;
}

export type GlassFillProps = {
  weight?: GlassWeight;
  radius?: GlassRadius;
  className?: string;
};

export function GlassFill({
  weight = 'panel',
  radius = 'card',
  className,
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
      <View
        className={cn(
          'absolute inset-0',
          WASH_CLASS[weight],
          RADIUS_CLASS[radius],
          className,
        )}
        style={[StyleSheet.absoluteFill, glass(weight, radiusPx)]}
        pointerEvents="none"
      />
      {/* The top-edge highlight: glass is a material with a lit side. */}
      <View
        className="absolute inset-x-0 top-0 h-px bg-glass-line"
        pointerEvents="none"
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
