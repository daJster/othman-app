import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { useTranslation } from 'react-i18next';
import { View, type ViewStyle } from 'react-native';
import { TABS } from '@/features/navigation/route-registry';
import { WebNavControls } from '@/features/navigation/web/nav-controls';
import { WebTabLink } from '@/features/navigation/web/tab-link';
import { BrandMark } from '@/features/brand/brand-mark';
import { cn } from '@/ui/cn';
import { GlassFill } from '@/ui/glass';
import { MODULE, CARD_RADIUS, NAV_INSET, WIDE_CLASS } from '@/ui/ratio';
import { usePageScrolled } from '@/ui/scroll-state';

/**
 * Web shell (expo-router/ui).
 *
 * `NativeTabs` only exists on iOS/Android, so web gets the headless
 * `Tabs`/`TabList`/`TabTrigger`/`TabSlot` set and renders the bar itself. The
 * bar is a top row, not a bottom bar: a wide viewport has no thumb to reach for,
 * and a top row doubles as the app's header.
 *
 * **Navigator structure is load-bearing.** `expo-router`'s
 * `parseTriggersFromChildren` only recurses into an element whose type *is*
 * `TabList`, and only collects `TabTrigger` children inside it. So:
 *
 *  - `TabList` must stay a direct child of `Tabs`;
 *  - every `TabTrigger` must stay a direct child of `TabList`;
 *  - non-trigger children (brand, controls) are ignored by discovery and are
 *    safe to extract.
 *
 * Wrapping `TabList` or `TabTrigger` in a component registers zero routes and
 * produces an empty bar with no error. Leaves live in
 * `src/features/navigation/web/`.
 *
 * Every registry destination is rendered as a trigger, because a trigger is
 * what registers the route with the navigator. Destinations marked
 * `hiddenOnWeb` are rendered but not shown: Account lives in the avatar menu on
 * web, and the trigger only exists so the navigator knows the screen. Access is
 * gated where it belongs: `RequireAuth` on the screen and the root redirect for
 * private paths.
 *
 * The bar is a `navigation` landmark, not a tab widget: its children are real
 * `<a href>` links (`WebTabLink`), so `role="tablist"`/`aria-selected` would
 * promise arrow-key semantics that do not exist.
 */
export default function WebTabsLayout() {
  const { t } = useTranslation();
  const scrolled = usePageScrolled();

  /*
   * Top of the page: an opaque black bar, so the chrome sits on solid ground.
   * Once the page moves, the black fades out under the glass and the bar's
   * contents pull together (padding and the brand collapse), then reverse when
   * the page returns to the top.
   */
  const morph = {
    transitionProperty:
      'opacity, padding, width, margin, margin-inline-end, border-radius, border-color',
    transitionDuration: '240ms',
    transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
  } as unknown as ViewStyle;

  return (
    <Tabs className="relative flex-1 bg-transparent">
      {/*
       * One floating glass bar, not a full-bleed strip. It shares the page's
       * width and gutter, so the chrome and the content read as one grid, and
       * the material separates it from the page without a heavy divider.
       *
       * `justifyContent` travels in `style`, not a class: Expo Router applies
       * `styles.tabList` (`justifyContent: space-between`) after Uniwind's
       * className, so a `justify-start` class loses.
       */}
      <TabList
        role="navigation"
        className={cn(
          /*
           * Floating over the page, not stacked above it. The bar used to sit
           * in the flow, which left a 66px band of bare page ground above the
           * content — black in the dark theme, and nothing for the material to
           * blur. Absolutely positioned, the film and the page scroll *behind*
           * the glass, which is the only way a translucent bar reads as glass
           * rather than as a black strip with rounded corners.
           */
          'absolute inset-x-0 top-0 z-20 mx-auto my-2 w-full flex-row flex-nowrap items-center gap-1 overflow-hidden rounded-card border border-glass-edge shadow-lg shadow-black/5 sm:gap-2',
          WIDE_CLASS,
        )}
        style={{
          justifyContent: 'flex-start',
          /*
           * Padding has to travel here too, for the same reason `justifyContent`
           * does: Expo Router's own `tabList` style sets `padding: 0` inline,
           * and an inline value beats any `px-*`/`py-*` class. Without this the
           * brand mark sat flush on the bar's rounded corner and read as
           * clipped. Numbers come from the ratio module, not from literals.
           *
           * The horizontal value tightens with the scroll state: the bar's
           * contents pull inward as the glass arrives.
           */
          paddingHorizontal: scrolled ? MODULE * 3 : MODULE * 4,
          paddingVertical: MODULE * 0.5,
          /*
           * Shape is part of the morph: at the top the bar is a square, edgeless
           * strip on solid black; once it becomes glass it grows the full card
           * curve and its rim.
           */
          borderRadius: scrolled ? CARD_RADIUS : 0,
          borderColor: scrolled ? 'var(--color-glass-edge)' : 'transparent',
          ...morph,
        }}
      >
        {/* Solid ground at the top, fading away as the page moves. */}
        <View
          pointerEvents="none"
          className="absolute inset-0"
          style={{
            backgroundColor: '#000000',
            opacity: scrolled ? 0 : 1,
            ...morph,
          }}
        />

        {/* The glass, arriving underneath the black. */}
        <View
          pointerEvents="none"
          className="absolute inset-0"
          style={{ opacity: scrolled ? 1 : 0, ...morph }}
        >
          <GlassFill weight="chrome" radius="card" />
        </View>

        <View
          className="hidden overflow-hidden sm:block"
          style={{
            width: scrolled ? 0 : 40,
            marginEnd: scrolled ? 0 : 8,
            opacity: scrolled ? 0 : 1,
            ...morph,
          }}
        >
          <BrandMark className="h-6 w-10" accessible={false} />
        </View>

        {TABS.map((tab) => (
          <TabTrigger key={tab.tab} name={tab.tab} href={tab.href} asChild>
            <WebTabLink
              label={t(tab.titleKey)}
              icon={tab.icon}
              hidden={tab.hiddenOnWeb === true}
              testID={`nav-tab-${tab.tab}`}
            />
          </TabTrigger>
        ))}

        <WebNavControls />
      </TabList>
      {/*
       * `TabSlot` renders a `ScreenContainer` whose own style is
       * `{ flexGrow: 1, flexShrink: 0 }` — a flex item that cannot shrink below
       * its content. Any tab taller than the window therefore grew the slot past
       * the viewport instead of scrolling inside it, and the page became
       * unreachable below the fold. Allowing it to shrink hands the overflow to
       * the screen's own `ScrollView`, where it belongs.
       */}
      {/*
       * The slot clears the floating bar once, for every screen. Home opts out
       * of that inset (see `HeroScroll`) so its film can run under the glass —
       * which is the whole point of the bar being translucent.
       */}
      <TabSlot
        style={{
          flexShrink: 1,
          minHeight: 0,
          paddingTop: NAV_INSET,
        }}
      />
    </Tabs>
  );
}
