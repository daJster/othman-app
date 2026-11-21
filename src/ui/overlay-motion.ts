import { Platform } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { cn } from './cn';

/**
 * Entrance motion for overlays that Radix mounts and unmounts.
 *
 * The web cannot use a Reanimated `entering` preset here: Radix keeps a
 * closing surface on screen until a CSS animation reports completion, so the
 * animation has to live in the stylesheet and be selected by `data-state`. The
 * keyframes and their durations are in `src/global.css` (`--motion-pop`,
 * `--motion-pop-out`), which keeps the timing on the same scale as the rest of
 * the interface instead of hard-coded inside a component.
 *
 * Native takes the same three names and maps them onto Reanimated, so a caller
 * picks a *behaviour* and never a platform.
 *
 *  - `pop`  — a slight lift and scale. The default for menus, which appear
 *             from a control and should read as leaving it.
 *  - `fade` — opacity only, for surfaces that do not originate anywhere.
 *  - `none` — no entrance at all, when the surface is already where the eye is.
 */
export type OverlayAnimation = 'pop' | 'fade' | 'none';

const CLASS: Record<Exclude<OverlayAnimation, 'none'>, string> = {
  pop: 'overlay-pop',
  fade: 'overlay-fade',
};

/** The web class for an overlay animation; `undefined` on native and for `none`. */
export function overlayAnimationClass(
  animation: OverlayAnimation = 'pop',
): string | undefined {
  if (Platform.OS !== 'web' || animation === 'none') {
    return undefined;
  }

  return CLASS[animation];
}

/** `overlayAnimationClass` merged with a caller's own classes. */
export function withOverlayAnimation(
  animation: OverlayAnimation | undefined,
  className?: string,
) {
  return cn(overlayAnimationClass(animation), className);
}

/**
 * Blur the popover's own backdrop.
 *
 * A menu cannot blur from inside the popper: Radix positions the content by
 * putting `transform: translate(x, y)` on
 * `[data-radix-popper-content-wrapper]`, and a `backdrop-filter` inside a
 * transformed ancestor samples that ancestor's layer — which is empty — instead
 * of the page. The surface then paints its scrim over a sharp backdrop and
 * reads as a flat panel.
 *
 * A stylesheet rule on the wrapper is the obvious fix and it does not survive
 * this build: the declaration is dropped on the way through the CSS pipeline
 * (verified — `border-radius` from the same rule lands, `backdrop-filter` does
 * not, while the same property set inline applies). So it is applied from here,
 * on the layer that actually has the page behind it.
 *
 * Call it from any element inside the popper; it walks up to the wrapper once
 * and cleans the value on unmount.
 */
export function usePopperBackdropBlur(blurPx: number) {
  const [node, setNode] = useState<HTMLElement | null>(null);

  // A callback ref, not an object ref: the hook is spread onto a React Native
  // `View` on both platforms, and only the web branch has a DOM node to read.
  const ref = useCallback((element: unknown) => {
    setNode((element as HTMLElement | null) ?? null);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !node) {
      return;
    }

    const wrapper = node.closest<HTMLElement>(
      '[data-radix-popper-content-wrapper]',
    );

    if (!wrapper) {
      return;
    }

    const filter = `saturate(1.6) blur(${blurPx}px)`;
    const previous = wrapper.style.backdropFilter;

    wrapper.style.setProperty('backdrop-filter', filter);
    wrapper.style.setProperty('-webkit-backdrop-filter', filter);

    return () => {
      wrapper.style.setProperty('backdrop-filter', previous);
      wrapper.style.removeProperty('-webkit-backdrop-filter');
    };
  }, [blurPx, node]);

  return ref;
}

/**
 * Keeps the page clickable while a Radix overlay is mounted.
 *
 * The primitives are modal by construction and never expose `modal`, so Radix
 * marks `<body>` with `pointer-events: none` for as long as an overlay is
 * mounted. Every other control in the bar then ignores the pointer, which is
 * why moving from one menu to another took two clicks: the first dismissed,
 * the second opened. These are short surfaces beside the control that owns
 * them, not dialogs, so the body rule is undone here.
 *
 * Radix still dismisses on its own — `DismissableLayer` listens for the outside
 * pointerdown on the document, not through the covered surface. Restoring the
 * previous value on unmount leaves the page exactly as it was found.
 */
export function usePageStaysClickable() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const { body } = document;
    const previous = body.style.pointerEvents;
    const enforce = () => {
      if (body.style.pointerEvents !== 'auto') {
        body.style.pointerEvents = 'auto';
      }
    };

    // Radix writes the rule on open *and* re-asserts it on later commits, so a
    // single write loses the race; watching the attribute is what makes the
    // correction stick for the whole life of the overlay.
    enforce();
    const observer = new MutationObserver(enforce);
    observer.observe(body, { attributes: true, attributeFilter: ['style'] });

    return () => {
      observer.disconnect();
      body.style.pointerEvents = previous;
    };
  }, []);
}
