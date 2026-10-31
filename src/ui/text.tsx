import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from './cn';
import { useUiFontClass } from './font';

/**
 * Typography primitive.
 *
 * `variant` owns size/weight, `tone` owns colour, `family` owns the typeface,
 * and all three are composed through `tv()` so a caller can override any of
 * them with `className` and still get tailwind-merge semantics
 * (`<Text variant="title" className="text-primary">`).
 *
 * `allowFontScaling` is left at React Native's default (`true`): the app must
 * follow the OS text-size setting, and Arabic text is especially unreadable
 * when a user has enlarged it and we ignore that.
 *
 * `family` defaults to `auto`, which follows the *language* rather than the
 * device: Arabic UI gets Noto Naskh, everything else Inter. React Native has no
 * font fallback list, so this decision cannot be left to the platform — a
 * single font must be named, and naming the wrong one renders tofu. The
 * classNames are complete literals in a static map because Tailwind only sees
 * strings that exist in the source.
 */

const FAMILY_CLASS = {
  /** Latin UI face (Inter). */
  ui: 'font-ui',
  /** Arabic UI face (Noto Naskh). */
  arabic: 'font-arabic',
  /** The mushaf (Amiri Quran) — reader pages only. */
  quran: 'font-quran',
} as const;

const text = tv({
  base: 'text-foreground',
  variants: {
    variant: {
      title: 'text-2xl font-bold',
      heading: 'text-xl font-semibold',
      subtitle: 'text-lg font-semibold',
      body: 'text-base',
      label: 'text-sm font-medium',
      caption: 'text-xs',
      overline: 'text-2xs font-semibold tracking-wide uppercase',
    },
    tone: {
      default: '',
      muted: 'text-muted-foreground',
      primary: 'text-primary',
      destructive: 'text-destructive',
    },
  },
  defaultVariants: {
    variant: 'body',
    tone: 'default',
  },
});

export type TextVariant = NonNullable<VariantProps<typeof text>['variant']>;
export type TextTone = NonNullable<VariantProps<typeof text>['tone']>;
export type TextFamily = 'auto' | keyof typeof FAMILY_CLASS;

export type TextProps = RNTextProps &
  VariantProps<typeof text> & {
    family?: TextFamily;
  };

export function Text({
  variant,
  tone,
  family = 'auto',
  className,
  ...props
}: TextProps) {
  const uiFontClass = useUiFontClass();

  const familyClass = family === 'auto' ? uiFontClass : FAMILY_CLASS[family];

  return (
    <RNText
      className={cn(text({ variant, tone }), familyClass, className)}
      {...props}
    />
  );
}
