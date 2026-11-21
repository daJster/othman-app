import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, Pressable } from 'react-native';

const buttonVariants = cva(
  cn(
    'group shrink-0 flex-row items-center justify-center gap-2 rounded-chip shadow-none',
    Platform.select({
      // Colour only, at 100 ms: a hover is an acknowledgement, not a transition
      // the eye should watch. `transition-all` also animated size and position,
      // which is why the bar felt slower than it looked.
      web: "whitespace-nowrap transition-colors duration-100 ease-out outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    }),
  ),
  {
    variants: {
      variant: {
        default: cn(
          'bg-primary shadow-sm shadow-black/5 active:opacity-90',
          Platform.select({ web: 'hover:opacity-90' }),
        ),
        destructive: cn(
          'bg-destructive shadow-sm shadow-black/5 active:opacity-90 dark:bg-destructive/60',
          Platform.select({
            web: 'hover:opacity-90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
          }),
        ),
        /*
         * A hover is a tint of the theme's own ink, never a surface swap: the
         * old `hover:bg-accent` dropped a solid grey plate under the control,
         * which reads as a selection state on a bar where nothing is selected.
         * 5% ink at rest, 10% while pressed — enough to feel, not enough to
         * look like another element.
         */
        outline: cn(
          'border border-glass-edge bg-glass shadow-sm shadow-black/5 active:bg-foreground/10',
          Platform.select({
            web: 'hover:bg-foreground/5',
          }),
        ),
        secondary: cn(
          'bg-secondary shadow-sm shadow-black/5 active:opacity-90',
          Platform.select({ web: 'hover:opacity-90' }),
        ),
        ghost: cn(
          'active:bg-foreground/10',
          Platform.select({ web: 'hover:bg-foreground/5' }),
        ),
        link: '',
      },
      size: {
        default: cn(
          'h-10 px-4 py-2 sm:h-9',
          Platform.select({ web: 'has-[>svg]:px-3' }),
        ),
        sm: cn(
          'h-9 gap-1.5 rounded-md px-3 sm:h-8',
          Platform.select({ web: 'has-[>svg]:px-2.5' }),
        ),
        lg: cn(
          'h-11 rounded-md px-6 sm:h-10',
          Platform.select({ web: 'has-[>svg]:px-4' }),
        ),
        icon: 'h-10 w-10 sm:h-9 sm:w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const buttonTextVariants = cva(
  cn(
    'text-sm font-medium text-foreground',
    Platform.select({ web: 'pointer-events-none transition-colors' }),
  ),
  {
    variants: {
      variant: {
        default: 'text-primary-foreground',
        destructive: 'text-white',
        outline: cn(
          'group-active:text-accent-foreground',
          Platform.select({ web: 'group-hover:text-accent-foreground' }),
        ),
        secondary: 'text-secondary-foreground',
        ghost: 'group-active:text-accent-foreground',
        link: cn(
          'text-primary group-active:underline',
          Platform.select({
            web: 'underline-offset-4 group-hover:underline hover:underline',
          }),
        ),
      },
      size: {
        default: '',
        sm: '',
        lg: '',
        icon: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ButtonProps = React.ComponentProps<typeof Pressable> &
  React.RefAttributes<typeof Pressable> &
  VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(
          props.disabled && 'opacity-50',
          buttonVariants({ variant, size }),
          className,
        )}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
