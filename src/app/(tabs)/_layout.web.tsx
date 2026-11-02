import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';
import { TABS } from '@/features/navigation/route-registry';
import { useVisibleTabs } from '@/features/navigation/use-visible-tabs';
import { WebNavControls } from '@/features/navigation/web/nav-controls';
import { WebTabLink } from '@/features/navigation/web/tab-link';
import { BrandMark } from '@/features/brand/brand-mark';

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
 * Each tab is a real `<a href>` on web — see `WebTabLink`.
 *
 * The row wraps rather than overflowing at 375 px. A desktop phone-style bottom
 * bar is never rendered, at any width.
 */
export default function WebTabsLayout() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const visible = useVisibleTabs();
  const visibleNames = new Set(visible.map((tab) => tab.tab));
  // Same scale as PAGE_GUTTER in src/ui/page.tsx: 16 below 640, 20 above.
  // Kept in `style` because `TabList` applies its own `style` after
  // `className`; only `justifyContent` is actually overridden, so this moves
  // to the shared class in the follow-up UX commit.
  const gutter = width < 640 ? 16 : 20;

  return (
    <Tabs className="flex-1 bg-background">
      {/*
       * The bar is the page grid: one row capped at the same `max-w-6xl`
       * gutter Home uses.
       */}
      <TabList
        className="mx-auto w-full max-w-6xl flex-row flex-nowrap items-center gap-1 border-b border-border bg-background py-1 sm:py-2"
        style={{ justifyContent: 'flex-start', paddingHorizontal: gutter }}
      >
        <View className="hidden pe-2 sm:block">
          <BrandMark className="h-6 w-[42px]" accessible={false} />
        </View>

        {/*
         * Every registry tab is a trigger, even while signed out. A trigger is
         * what registers the route with the navigator; rendering only the
         * visible set made `/account` and `/meetings` fall back to Home before
         * `RequireAuth` could send the visitor to sign-in. Private triggers are
         * rendered but hidden from the bar and the tab order.
         */}
        {TABS.map((tab) => (
          <TabTrigger key={tab.tab} name={tab.tab} href={tab.href} asChild>
            <WebTabLink
              label={t(tab.titleKey)}
              icon={tab.icon}
              hidden={!visibleNames.has(tab.tab)}
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
