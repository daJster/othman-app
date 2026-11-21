import type { ComponentProps } from 'react';
import type { SpinnerProps } from './spinner.types';

/**
 * Spinner — web.
 *
 * The classic ring: a faded track with one arc turning round it, drawn as SVG
 * in `currentColor` so it takes the colour of the text around it and needs no
 * theme plumbing. One look only, and the same idea the native ring draws.
 *
 * The keyframes live once in `src/global.css`, not in an inline `<style>` per
 * instance — a panel that opens and closes repeatedly would re-declare the same
 * animation on every mount. `data-slot="spinner"` is what the reduced-motion
 * rule keys on: it slows the pace to a third rather than stopping, because a
 * spinner that stands still reads as frozen.
 *
 * Native keeps the Reanimated ring in `spinner.tsx`; this file only ever ships
 * on the web.
 */
/** `sm` 14px, `md` 16px, `lg` 24px — the same three steps the native ring uses. */
const SIZE_PX = { sm: 14, md: 16, lg: 24 } as const;

/** How long one cycle takes at normal speed, stretched by the pace variable. */
const pace = (seconds: number) =>
  `calc(${seconds}s * var(--panelui-spinner-pace))`;

export function Spinner({
  size = 'md',
  label,
  color,
  className,
  testID,
  ...props
}: SpinnerProps & Omit<ComponentProps<'svg'>, 'color'>) {
  const px = SIZE_PX[size];

  return (
    <svg
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-slot="spinner"
      data-testid={testID}
      viewBox="0 0 24 24"
      width={px}
      height={px}
      fill="none"
      style={{ color, flexShrink: 0 }}
      className={className}
      {...props}
    >
      {/*
       * The classic ring: a faded track with one arc turning round it. It is
       * the shape a spinner is expected to be, and it matches what the native
       * build draws, so loading never changes character between platforms.
       */}
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.2"
      />
      <g
        style={{
          transformOrigin: '12px 12px',
          animation: `spinner-turn ${pace(0.7)} linear infinite`,
        }}
      >
        <path
          d="M12 3a9 9 0 0 1 9 9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

Spinner.displayName = 'Spinner';
