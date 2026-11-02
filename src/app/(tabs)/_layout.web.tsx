import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { TABS } from '@/features/navigation/route-registry';
import { WebNavControls } from '@/features/navigation/web/nav-controls';
import { WebTabLink } from '@/features/navigation/web/tab-link';
import { BrandMark } from '@/features/brand/brand-mark';
import { cn } from '@/ui/cn';
import { PAGE_GUTTER } from '@/ui/page';

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
 * Every registry destination is rendered, signed in or out. A trigger is what
 * registers the route with the navigator; hiding private ones made the bar
 * change size at sign-in, and `NativeTabs` documents that a changing trigger
 * set remounts the navigator and resets its state. Access is gated where it
 * belongs: `RequireAuth` on the screen and the root redirect for private paths.
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
       * The bar is the page grid: one row capped at the same `max-w-6xl`
       * gutter Home uses. `justifyContent` travels in `style`, not a class:
       * Expo Router applies `styles.tabList` (`justifyContent: space-between`)
       * after Uniwind's className, so a `justify-start` class loses.
       */}
      <TabList
        role="navigation"
        className={cn(
          'mx-auto w-full max-w-6xl flex-row flex-nowrap items-center gap-1 border-b border-border bg-background',
          PAGE_GUTTER,
        )}
        style={{ justifyContent: 'flex-start' }}
      >
        <View className="hidden pe-2 sm:block">
          <BrandMark className="h-6 w-[42px]" accessible={false} />
        </View>

        {TABS.map((tab) => (
          <TabTrigger key={tab.tab} name={tab.tab} href={tab.href} asChild>
            <WebTabLink
              label={t(tab.titleKey)}
              icon={tab.icon}
              testID={`nav-tab-${tab.tab}`}
            />
          </TabTrigger>
        ))}

        <WebNavControls />
      </TabList>
      <TabSlot />
    </Tabs>
  );
}
