import type { Bbox } from '@/core/types';

/**
 * Geometry for the ayah overlay.
 *
 * The payload stores boxes as fractions of the page (0–1), which is the right
 * unit for a scan drawn at whatever size the screen offers. This module turns
 * those fractions into percentage styles and computes the on-screen size of the
 * page itself — no colours, no theme, no React, so both rules are unit-tested
 * without a renderer.
 *
 * Why the page size is computed instead of using `aspect-[412/600]` alone: the
 * overlay must land on the *image*, and an `expo-image` with
 * `contentFit="contain"` letterboxes inside its view. If the view is not the
 * scan's aspect ratio, the boxes drift. Fitting the box to the container first
 * makes the view and the image the same rectangle, so a fraction of the page is
 * a fraction of the view.
 */

/** A percentage string, the unit React Native accepts for `left`/`width`. */
export type Percent = `${number}%`;

export type Rect = {
  readonly left: Percent;
  readonly top: Percent;
  readonly width: Percent;
  readonly height: Percent;
};

export type Size = {
  readonly width: number;
  readonly height: number;
};

/** Percentages are rounded so equal boxes produce equal strings in tests. */
function percent(fraction: number): Percent {
  return `${Math.round(fraction * 1e4) / 100}%`;
}

function clampFraction(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.min(1, Math.max(0, value));
}

/**
 * One box, as a percentage rectangle.
 *
 * Clamping and the `Math.max(0, …)` are not defensive noise: a corrupt payload
 * with a negative width would otherwise draw a view with a negative size, which
 * React Native rejects on Android. A degenerate box is invisible, which is the
 * honest rendering of "this ayah has no area".
 */
export function bboxToRect(bbox: Bbox): Rect {
  const left = clampFraction(bbox.left);
  const top = clampFraction(bbox.top);
  const right = clampFraction(bbox.right);
  const bottom = clampFraction(bbox.bottom);

  return {
    left: percent(left),
    top: percent(top),
    width: percent(Math.max(0, right - left)),
    height: percent(Math.max(0, bottom - top)),
  };
}

/**
 * The largest rectangle with `page`'s aspect ratio that fits in `container`.
 *
 * `Math.floor` keeps the result inside the container on devices that report
 * fractional points; half a point of overflow would clip the last line of the
 * page.
 */
export function fitBox(page: Size, container: Size): Size {
  if (
    page.width <= 0 ||
    page.height <= 0 ||
    container.width <= 0 ||
    container.height <= 0
  ) {
    return { width: 0, height: 0 };
  }

  const scale = Math.min(
    container.width / page.width,
    container.height / page.height,
  );

  return {
    width: Math.floor(page.width * scale),
    height: Math.floor(page.height * scale),
  };
}
