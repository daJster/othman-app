import type { TextProps as RNTextProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { Text as RNRText } from '@/components/ui/text';
import { useDirection } from '@/i18n';
import { cn } from './cn';
import { useUiFontClass } from './font';

/**
 * Typography primitive.
 *
 * The rendered component is the react-native-reusables `Text`, so it joins the
 * same `TextClassContext` its `Button`, `Badge` and form primitives use: a
 * label placed inside a filled button inherits the button's text colour.
 *
 * `variant` owns size/weight, `tone` owns colour, `family` owns the typeface,
 * `align` owns alignment, and all four are composed through `tv()` so a caller
 * can override any of them with `className` and still get tailwind-merge
 * semantics (`<Text variant="title" className="text-primary">`).
 *
 * `family` defaults to `auto`, which follows the *language* rather than the
 * device: Arabic UI asks for `--font-arabic`, everything else `--font-ui`.
 * Both are IBM Plex Sans Arabic today, so the choice is invisible — but React
 * Native has no font fallback list, so exactly one family must be named, and
 * the language is what decides which token that is.
 *
 * **Direction lives here, and only here.** The app has one physical layout for
 * both languages — nothing mirrors — so the language may not reach the layout
 * through `dir`, `I18nManager` or a logical utility. What it does reach is the
 * text run: writing direction (so punctuation and bidi sit at the right edge)
 * and alignment within the element's own box. Both are resolved once, in this
 * primitive, so a screen cannot opt out by accident.
 *
 * `align` defaults to `start`, which is the *language's* start: right in
 * Arabic, left in English. It is applied as a `text-*` class rather than an
 * inline style so a caller's `className="text-center"` still wins through
 * tailwind-merge.
 */
const FAMILY_CLASS = {
  /** Latin UI face — IBM Plex Sans Arabic's Latin cut. */
  ui: 'font-ui',
  /** Arabic UI face — the same family's Arabic cut. */
  arabic: 'font-arabic',
  /** The mushaf (Amiri Quran) — reader pages only. */
  quran: 'font-quran',
} as const;

const text = tv({
  base: 'text-foreground',
  variants: {
    variant: {
      /* Large type gets tighter leading; body stays loose for Arabic. */
      title: 'text-2xl leading-tight font-bold',
      heading: 'text-xl leading-snug font-semibold',
      subtitle: 'text-lg leading-snug font-semibold',
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
/** `start` / `end` follow the language, never the physical side. */
export type TextAlign = 'start' | 'end' | 'center';

export type TextProps = RNTextProps &
  VariantProps<typeof text> & {
    family?: TextFamily;
    align?: TextAlign;
  };

export function Text({
  variant,
  tone,
  family = 'auto',
  align = 'start',
  className,
  style,
  ...props
}: TextProps) {
  const uiFontClass = useUiFontClass();
  const direction = useTextDirectionStyle();

  const familyClass = family === 'auto' ? uiFontClass : FAMILY_CLASS[family];
  const alignment = alignClass(align);

  return (
    <RNRText
      className={cn(text({ variant, tone }), familyClass, alignment, className)}
      style={[direction, style]}
      {...props}
    />
  );
}

/**
 * The writing direction of the current language, as a style object.
 *
 * Exported for the few primitives that render their own `RNRText` instead of
 * going through `Text` — button and badge labels. Every string in the app must
 * carry its direction, and this is the one place it is computed.
 *
 * Both keys are set deliberately: `direction` drives the paragraph on native
 * (Android Fabric ignores `writingDirection`, the web mapping reads it), and
 * each platform takes what it understands.
 */
export function useTextDirectionStyle(): {
  direction: 'rtl' | 'ltr';
  writingDirection: 'rtl' | 'ltr';
} {
  const { isRTL } = useDirection();
  const direction = isRTL ? 'rtl' : 'ltr';

  return { direction, writingDirection: direction };
}

/**
 * `start` / `end` are **native** text alignments: they resolve against the
 * paragraph direction, so `start` is right in Arabic and left in English on
 * every platform. Physical `text-right` would invert on iOS and Android, which
 * resolve it relative to the paragraph (an RTL paragraph turns `right` into
 * left) while the web keeps it physical — the same component would disagree
 * with itself across platforms.
 */
function alignClass(align: TextAlign): string {
  if (align === 'center') return 'text-center';

  return align === 'end' ? 'text-end' : 'text-start';
}
