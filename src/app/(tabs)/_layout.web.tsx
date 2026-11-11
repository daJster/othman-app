import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { TABS } from '@/features/navigation/route-registry';
import { WebNavControls } from '@/features/navigation/web/nav-controls';
import { WebTabLink } from '@/features/navigation/web/tab-link';
import { BrandMark } from '@/features/brand/brand-mark';
import { cn } from '@/ui/cn';
import { GlassFill } from '@/ui/glass';
import { WIDE_CLASS } from '@/ui/ratio';

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

  return (
    <Tabs className="flex-1 bg-background">
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
          'relative mx-auto my-2 w-full flex-row flex-nowrap items-center gap-1 overflow-hidden rounded-card border border-glass-edge bg-glass-strong px-1.5 py-1 shadow-lg shadow-black/5',
          WIDE_CLASS,
        )}
        style={{ justifyContent: 'flex-start' }}
      >
        <GlassFill weight="chrome" radius="card" />

        <View className="hidden pe-1.5 sm:block">
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
      <TabSlot style={{ flexShrink: 1, minHeight: 0 }} />
    </Tabs>
  );
}
