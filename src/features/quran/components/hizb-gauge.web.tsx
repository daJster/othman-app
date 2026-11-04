'use client';

import { useEffect, useState } from 'react';
import {
  Gauge,
  GaugeIndicator,
  GaugeRange,
  GaugeTrack,
  GaugeValueText,
} from '@/components/catalogs/gauge.web';
import { useReducedMotion } from '@/ui/motion';

/**
 * Today's goal, composed from the web catalog gauge.
 *
 * The vendored compound owns the arc geometry and the value plumbing; this
 * adapter only gives it the page's palette (`border` for the track, `brass`
 * for the range, `success` for the check) and the motion the band asks for.
 * The range already carries a CSS transition on `stroke-dashoffset`; the
 * adapter makes it explicit at 600ms and disables it under reduced motion.
 *
 * Mounting is the one thing a dashboard cannot get for free: the gauge is
 * always drawn from an empty ring, and an effect moves it to the real value on
 * the next frame, so the first paint transitions instead of appearing full.
 * Every later value change reuses the same transition. Under reduced motion
 * the value is read directly and the transition is switched off, which snaps.
 *
 * The centre is silent until the goal is complete, then shows the same check
 * as the native port. The fraction beside the gauge is the metric; the ring is
 * hidden from assistive technology so progress is not announced twice.
 */
export type HizbGaugeProps = {
  /** Pages read today, in the same unit as `max`. */
  value: number;
  /** Pages the day's goal asks for. */
  max: number;
  /** Outer diameter in points. */
  size?: number;
  /** Arc thickness in points. */
  strokeWidth?: number;
};

const CHECK_PATH = 'M20 6 9 17l-5-5';
const DEFAULT_SIZE = 136;
const DEFAULT_STROKE_WIDTH = 10;
const ARC_DURATION = 600;

/** The root's `aria-valuetext`, kept in the same shape the catalog expects. */
function valueText(value: number, min: number, max: number): string {
  const ratio = max === min ? 1 : (value - min) / (max - min);
  return `${Math.round(ratio * 100)}%`;
}

export function HizbGauge({
  value,
  max,
  size = DEFAULT_SIZE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}: HizbGaugeProps) {
  const reducedMotion = useReducedMotion();
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const target = Number.isFinite(value)
    ? Math.min(safeMax, Math.max(0, value))
    : 0;
  const complete = target >= safeMax;

  // Empty on the first paint, filled one frame later, so the CSS transition
  // has a painted starting value to move from.
  const [drawn, setDrawn] = useState(0);

  useEffect(() => {
    // The frame keeps the initial empty ring on screen for one paint; without
    // it the browser can coalesce the mount and the fill into a single style
    // pass, which would skip the transition.
    const frame = requestAnimationFrame(() => setDrawn(target));

    return () => cancelAnimationFrame(frame);
  }, [target]);

  const shown = reducedMotion ? target : drawn;

  return (
    <Gauge
      aria-hidden="true"
      className="text-foreground"
      getValueText={valueText}
      max={safeMax}
      size={size}
      thickness={strokeWidth}
      value={shown}
    >
      <GaugeIndicator>
        <GaugeTrack className="text-border" />
        <GaugeRange
          className="text-brass"
          style={{
            transition: reducedMotion
              ? 'none'
              : `stroke-dashoffset ${ARC_DURATION}ms ease-out`,
          }}
        />
      </GaugeIndicator>

      {complete ? (
        <GaugeValueText>
          <svg
            aria-hidden="true"
            className="text-success"
            fill="none"
            height={size * 0.3}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
            width={size * 0.3}
          >
            <path d={CHECK_PATH} />
          </svg>
        </GaugeValueText>
      ) : null}
    </Gauge>
  );
}
