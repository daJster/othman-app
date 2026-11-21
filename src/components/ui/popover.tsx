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
import * as PopoverPrimitive from '@rn-primitives/popover';
import * as React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const FullWindowOverlay =
  Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function PopoverContent({
  className,
  children,
  align = 'center',
  sideOffset = 4,
  portalHost,
  animation = 'pop',
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  portalHost?: string;
  /** How the surface arrives. See `ui/overlay-motion`. */
  animation?: OverlayAnimation;
}) {
  usePageStaysClickable();
  const backdropRef = usePopperBackdropBlur(24);

  return (
    <PopoverPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <PopoverPrimitive.Overlay
          style={Platform.select({ native: StyleSheet.absoluteFill })}
          asChild={Platform.OS !== 'web'}
          // Transparent to the pointer on web: the overlay has no job there and
          // otherwise swallows the press meant for another control.
          className={Platform.OS === 'web' ? 'pointer-events-none' : undefined}
        >
          <NativeOnlyAnimatedView
            entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
            exiting={FadeOut.reduceMotion(ReduceMotion.System)}
            as="Pressable"
          >
            <TextClassContext.Provider value="text-popover-foreground">
              <PopoverPrimitive.Content
                align={align}
                sideOffset={sideOffset}
                className={cn(
                  'relative z-50 w-72 overflow-hidden rounded-panel border border-glass-edge p-panel shadow-xl shadow-black/10 outline-hidden',
                  withOverlayAnimation(animation),
                  Platform.select({
                    web: 'origin-(--radix-popover-content-transform-origin) cursor-auto',
                  }),
                  className,
                )}
                /*
                 * The overlay is `pointer-events-none` so the page stays
                 * clickable, but the value inherits: without an opt-in the whole
                 * surface, every row in it, ignores the pointer — and the wheel
                 * never reaches the scroller. The content is polymorphic and
                 * its `style` prop is not a plain `ViewStyle`, so the opt-in is
                 * an inner view instead of a style on this element.
                 */
                {...props}
              >
                <GlassFill weight="overlay" radius="panel" />
                {/* Probe: walks up to the popper wrapper and blurs it. */}
                <View ref={backdropRef} style={{ width: 0, height: 0 }} />
                {Platform.OS === 'web' ? (
                  <View style={{ pointerEvents: 'auto' }}>{children}</View>
                ) : (
                  children
                )}
              </PopoverPrimitive.Content>
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </PopoverPrimitive.Overlay>
      </FullWindowOverlay>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
