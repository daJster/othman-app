import { Icon } from '@/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { GlassFill } from '@/ui/glass';
import {
  usePageStaysClickable,
  usePopperBackdropBlur,
  withOverlayAnimation,
  type OverlayAnimation,
} from '@/ui/overlay-motion';
import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import * as React from 'react';
import {
  Platform,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  iconClassName,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  children?: React.ReactNode;
  iconClassName?: string;
  inset?: boolean;
}) {
  const { open } = DropdownMenuPrimitive.useSubContext();
  const icon =
    Platform.OS === 'web' ? ChevronRight : open ? ChevronUp : ChevronDown;
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm select-none group-active:text-accent-foreground',
        open && 'text-accent-foreground',
      )}
    >
      <DropdownMenuPrimitive.SubTrigger
        className={cn(
          'group flex flex-row items-center justify-between rounded-sm px-2 py-2 active:bg-foreground/10 sm:py-1.5',
          Platform.select({
            web: 'cursor-default outline-none focus:bg-foreground/10 [&_svg]:pointer-events-none',
          }),
          className,
          open && 'bg-foreground/10',
          inset && 'pl-8',
        )}
        {...props}
      >
        <>{children}</>
        <Icon
          as={icon}
          className={cn('size-4 shrink-0 text-foreground', iconClassName)}
        />
      </DropdownMenuPrimitive.SubTrigger>
    </TextClassContext.Provider>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <NativeOnlyAnimatedView entering={FadeIn.reduceMotion(ReduceMotion.System)}>
      <DropdownMenuPrimitive.SubContent
        className={cn(
          'relative min-w-32 overflow-hidden rounded-panel border border-glass-edge p-1 shadow-xl shadow-black/10',
          withOverlayAnimation('pop'),
          Platform.select({
            web: 'z-50 origin-(--radix-context-menu-content-transform-origin)',
          }),
          className,
        )}
        {...props}
      >
        <GlassFill weight="overlay" radius="panel" />
        {/*
          The primitive types `children` as nodes *or* a render function of the
          pressable state. Every caller in this app passes nodes, and a function
          child cannot be placed in the JSX tree directly; cast at the boundary
          rather than rejecting the primitive's wider type.
        */}
        {props.children as React.ReactNode}
      </DropdownMenuPrimitive.SubContent>
    </NativeOnlyAnimatedView>
  );
}

const FullWindowOverlay =
  Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function DropdownMenuContent({
  className,
  overlayClassName,
  overlayStyle,
  portalHost,
  animation = 'pop',
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content> & {
  overlayStyle?: StyleProp<ViewStyle>;
  overlayClassName?: string;
  portalHost?: string;
  /**
   * How the surface arrives. `pop` is the menu default; `fade` for surfaces
   * that do not originate from a control; `none` when the content is already
   * where the eye is and any travel would be noise.
   */
  animation?: OverlayAnimation;
}) {
  usePageStaysClickable();
  const backdropRef = usePopperBackdropBlur(24);

  return (
    <DropdownMenuPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <DropdownMenuPrimitive.Overlay
          style={Platform.select({
            web: overlayStyle ?? undefined,
            native: overlayStyle
              ? StyleSheet.flatten([
                  StyleSheet.absoluteFill,
                  overlayStyle as typeof StyleSheet.absoluteFill,
                ])
              : StyleSheet.absoluteFill,
          })}
          /*
           * The overlay exists to give native taps something to land on. On
           * the web it only steals them: it covers the whole viewport, so the
           * first click on a *different* trigger dismissed the open menu and
           * was consumed — switching menus took two clicks. Radix's own
           * `DismissableLayer` listens on the document for the outside
           * pointerdown, so the overlay can stay transparent to the pointer
           * here and a single click both closes this menu and opens the next.
           */
          className={cn(
            Platform.OS === 'web' && 'pointer-events-none',
            overlayClassName,
          )}
          asChild={Platform.OS !== 'web'}
        >
          <NativeOnlyAnimatedView
            entering={
              animation === 'none'
                ? undefined
                : FadeIn.reduceMotion(ReduceMotion.System)
            }
            as="Pressable"
          >
            <TextClassContext.Provider value="text-popover-foreground">
              <DropdownMenuPrimitive.Content
                className={cn(
                  'relative min-w-32 overflow-hidden rounded-panel border border-glass-edge p-1 shadow-xl shadow-black/10',
                  withOverlayAnimation(animation),
                  Platform.select({
                    web: 'z-50 max-h-(--radix-context-menu-content-available-height) origin-(--radix-context-menu-content-transform-origin) cursor-default',
                  }),
                  className,
                )}
                /* Inherited `pointer-events: none` would make every item
                 * unclickable; the sheet has no `pointer-events-auto` utility,
                 * so the opt-in is an inner view. */
                {...props}
              >
                <GlassFill weight="overlay" radius="panel" />
                {/* Probe: walks up to the popper wrapper and blurs it. */}
                <View ref={backdropRef} style={{ width: 0, height: 0 }} />
                {Platform.OS === 'web' ? (
                  <View style={{ pointerEvents: 'auto' }}>
                    {children as React.ReactNode}
                  </View>
                ) : (
                  (children as React.ReactNode)
                )}
              </DropdownMenuPrimitive.Content>
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </DropdownMenuPrimitive.Overlay>
      </FullWindowOverlay>
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  className?: string;
  inset?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <TextClassContext.Provider
      value={cn(
        'text-popover-foreground group-active:text-popover-foreground text-sm select-none',
        variant === 'destructive' &&
          'text-destructive group-active:text-destructive',
      )}
    >
      <DropdownMenuPrimitive.Item
        className={cn(
          'group relative flex flex-row items-center gap-2 rounded-sm px-2 py-2 active:bg-foreground/10 sm:py-1.5',
          Platform.select({
            web: cn(
              'cursor-default outline-none focus:bg-foreground/10 data-[disabled]:pointer-events-none',
              variant === 'destructive' &&
                'focus:bg-destructive/10 dark:focus:bg-destructive/20',
            ),
          }),
          variant === 'destructive' &&
            'active:bg-destructive/10 dark:active:bg-destructive/20',
          props.disabled && 'opacity-50',
          inset && 'pl-8',
          className,
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem> & {
  children?: React.ReactNode;
}) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <DropdownMenuPrimitive.CheckboxItem
        className={cn(
          'group relative flex flex-row items-center gap-2 rounded-sm py-2 pr-2 pl-8 active:bg-foreground/10 sm:py-1.5',
          Platform.select({
            web: 'cursor-default outline-none focus:bg-foreground/10 data-[disabled]:pointer-events-none',
          }),
          props.disabled && 'opacity-50',
          className,
        )}
        {...props}
      >
        <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <DropdownMenuPrimitive.ItemIndicator>
            <Icon
              as={Check}
              className={cn(
                'size-4 text-foreground',
                Platform.select({ web: 'pointer-events-none' }),
              )}
            />
          </DropdownMenuPrimitive.ItemIndicator>
        </View>
        <>{children}</>
      </DropdownMenuPrimitive.CheckboxItem>
    </TextClassContext.Provider>
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem> & {
  children?: React.ReactNode;
}) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <DropdownMenuPrimitive.RadioItem
        className={cn(
          'group relative flex flex-row items-center gap-2 rounded-sm py-2 pr-2 pl-8 active:bg-foreground/10 sm:py-1.5',
          Platform.select({
            web: 'cursor-default outline-none focus:bg-foreground/10 data-[disabled]:pointer-events-none',
          }),
          props.disabled && 'opacity-50',
          className,
        )}
        {...props}
      >
        <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <DropdownMenuPrimitive.ItemIndicator>
            <View className="h-2 w-2 rounded-full bg-foreground" />
          </DropdownMenuPrimitive.ItemIndicator>
        </View>
        <>{children}</>
      </DropdownMenuPrimitive.RadioItem>
    </TextClassContext.Provider>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  className?: string;
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        'px-2 py-2 text-sm font-medium text-foreground sm:py-1.5',
        inset && 'pl-8',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      className={cn(
        'ml-auto text-xs tracking-widest text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
