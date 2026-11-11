import { Icon } from '@/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { TextClassContext } from '@/components/ui/text';
import { useDirection } from '@/i18n';
import { cn } from '@/lib/utils';
import { GlassFill } from '@/ui/glass';
import * as SelectPrimitive from '@rn-primitives/select';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import * as React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

type Option = SelectPrimitive.Option;

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

function SelectValue({
  ref,
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value> & {
  className?: string;
}) {
  const { value } = SelectPrimitive.useRootContext();
  return (
    <SelectPrimitive.Value
      ref={ref}
      className={cn(
        'line-clamp-1 flex flex-row items-center gap-2 text-sm text-foreground',
        !value && 'text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

function SelectTrigger({
  ref,
  className,
  children,
  size = 'default',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  children?: React.ReactNode;
  size?: 'default' | 'sm';
}) {
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex h-10 flex-row items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 shadow-sm shadow-black/5 sm:h-9 dark:bg-input/30 dark:active:bg-input/50',
        Platform.select({
          web: 'w-fit text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:hover:bg-input/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0',
        }),
        props.disabled && 'opacity-50',
        size === 'sm' && 'h-8 py-2 sm:py-1.5',
        className,
      )}
      {...props}
    >
      <>{children}</>
      <Icon
        as={ChevronDown}
        aria-hidden={true}
        className="size-4 text-muted-foreground"
      />
    </SelectPrimitive.Trigger>
  );
}

const FullWindowOverlay =
  Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

/**
 * The listbox panel.
 *
 * It uses the app's `overlay` glass weight: a wash heavy enough to keep text
 * at contrast on any backdrop, with the page still legible through it. Three
 * things are load-bearing here.
 *
 *  - **`sideOffset` is 4 px and it is part of the collision maths.** A visual
 *    `translate-y` would sit outside the flip/shift calculation, so the gap has
 *    to come from the offset plugin.
 *  - **`align` is physical.** floating-ui has no RTL handling (and Radix's
 *    `shift` only moves on the main axis), so `start` is the physical left.
 *    Passing the logical start means mirroring it for Arabic, or the menu hangs
 *    off the wrong end of its trigger.
 *  - **The glass layers sit outside the scroll container.** The panel clips, and
 *    Radix's viewport (which is `overflow: hidden auto`) does the scrolling.
 *    An absolutely positioned blur *inside* a scrolling box scrolls away with
 *    the items.
 */

function SelectContent({
  className,
  children,
  position = 'popper',
  side = 'bottom',
  align = 'start',
  sideOffset = 4,
  alignOffset = 0,
  avoidCollisions = true,
  portalHost,
  style,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content> & {
  className?: string;
  portalHost?: string;
}) {
  const { isRTL } = useDirection();
  return (
    <SelectPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <SelectPrimitive.Overlay
          style={Platform.select({ native: StyleSheet.absoluteFill })}
          asChild={Platform.OS !== 'web'}
        >
          <NativeOnlyAnimatedView
            className="z-50"
            entering={FadeIn.reduceMotion(ReduceMotion.System)}
            exiting={FadeOut.reduceMotion(ReduceMotion.System)}
            as="Pressable"
          >
            <TextClassContext.Provider value="text-foreground">
              <SelectPrimitive.Content
                className={cn(
                  'relative z-50 min-w-32 overflow-hidden rounded-panel border border-glass-edge shadow-xl shadow-black/10',
                  Platform.select({
                    // The panel is capped by the room Radix measured for it,
                    // not by a fixed 208 px that ignores the viewport. Clipping
                    // lives here; Radix's viewport does the scrolling.
                    web: 'max-h-(--radix-select-content-available-height)',
                    native: 'p-1',
                  }),
                  className,
                )}
                /*
                 * Radix stamps `dir="ltr"` on its own content element (it reads
                 * a DirectionProvider the app never installs), which would lay
                 * the Arabic labels and the check mark out left-to-right inside
                 * an RTL page. The wrapper view carries the real direction.
                 */
                style={
                  StyleSheet.flatten([
                    { direction: isRTL ? 'rtl' : 'ltr' } as const,
                    style,
                  ]) ?? undefined
                }
                position={position}
                side={side}
                align={align}
                sideOffset={sideOffset}
                alignOffset={alignOffset}
                avoidCollisions={avoidCollisions}
                {...props}
              >
                {/* The material, then the scrolling viewport above it. */}
                <GlassFill weight="overlay" radius="panel" />

                <SelectScrollUpButton />
                <SelectPrimitive.Viewport
                  className={cn(
                    'p-1',
                    position === 'popper' &&
                      Platform.select({
                        // Match the trigger's width, never its height: the old
                        // `h-[--radix-select-trigger-height]` pinned the list to
                        // the row's 56 px, so a three-option menu scrolled
                        // inside a 64 px box.
                        web: 'w-full min-w-[var(--radix-select-trigger-width)]',
                      }),
                  )}
                >
                  {children}
                </SelectPrimitive.Viewport>
                <SelectScrollDownButton />
              </SelectPrimitive.Content>
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </SelectPrimitive.Overlay>
      </FullWindowOverlay>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn(
        'px-2 py-2 text-xs text-muted-foreground sm:py-1.5',
        className,
      )}
      {...props}
    />
  );
}

function SelectItem({
  className,
  ...props
}: Omit<React.ComponentProps<typeof SelectPrimitive.Item>, 'children'>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'group relative flex w-full flex-row items-center gap-2 rounded-sm py-2 pr-8 pl-2 active:bg-accent sm:py-1.5',
        Platform.select({
          web: 'cursor-default outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none [&_svg]:pointer-events-none *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2',
        }),
        props.disabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      <View className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Icon as={Check} className="size-4 shrink-0 text-muted-foreground" />
        </SelectPrimitive.ItemIndicator>
      </View>
      <SelectPrimitive.ItemText className="text-sm text-foreground select-none group-active:text-accent-foreground" />
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      className={cn(
        '-mx-1 my-1 h-px bg-border',
        Platform.select({ web: 'pointer-events-none' }),
        className,
      )}
      {...props}
    />
  );
}

/**
 * @platform Web only
 * Returns null on native platforms
 */
function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  if (Platform.OS !== 'web') {
    return null;
  }
  return (
    <SelectPrimitive.ScrollUpButton
      className={cn(
        'flex cursor-default items-center justify-center py-1',
        className,
      )}
      {...props}
    >
      <Icon as={ChevronUp} className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

/**
 * @platform Web only
 * Returns null on native platforms
 */
function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  if (Platform.OS !== 'web') {
    return null;
  }
  return (
    <SelectPrimitive.ScrollDownButton
      className={cn(
        'flex cursor-default items-center justify-center py-1',
        className,
      )}
      {...props}
    >
      <Icon as={ChevronDown} className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  type Option,
};
