import { createElement, type MouseEvent } from 'react';
import {
  TabList,
  TabSlot,
  TabTrigger,
  Tabs,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';
import { TABS } from '@/features/navigation/route-registry';
import { shouldHandleWebLink } from '@/features/navigation/web-link';
import { useVisibleTabs } from '@/features/navigation/use-visible-tabs';
import type { IconName } from '@/core/config';
import { BrandMark } from '@/features/brand/brand-mark';
import { LanguageDropdown } from '@/features/settings/language-dropdown';
import { ThemeDropdown } from '@/features/settings/theme-dropdown';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

/**
 * Web shell (expo-router/ui).
 *
 * `NativeTabs` only exists on iOS/Android, so web gets the headless
 * `Tabs`/`TabList`/`TabTrigger`/`TabSlot` set and renders the bar itself. The
 * bar is a top row, not a bottom bar: a wide viewport has no thumb to reach for,
 * and a top row doubles as the app's header.
 *
 * Each tab is a real `<a href>` on web. That is what makes middle-click,
 * Cmd/Ctrl-click, open-in-new-tab, focus order and the browser status bar work;
 * a Pressable with an `onPress` would look like a button and break all four.
 * Unmodified primary clicks still go through the router (and prevent the full
 * page load); modified clicks are left to the browser.
 *
 * The row wraps rather than overflowing at 375 px. A desktop phone-style bottom
 * bar is never rendered, at any width.
 */
export default function WebTabsLayout() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const visible = useVisibleTabs();
  const visibleNames = new Set(visible.map((tab) => tab.tab));
  // The compact controls need the narrower gutter at 375; the page grid keeps
  // 20 from `sm` up.
  const gutter = width < 640 ? 16 : 20;

  return (
    <Tabs className="flex-1 bg-background">
      {/*
       * The bar is the page grid: one row capped at the same `max-w-6xl`
       * gutter Home uses. `TabList` must stay the direct child of `Tabs`;
       * wrapping it in another row makes Expo Router drop every trigger.
       *
       * `justifyContent` and the horizontal padding travel in `style`, not a
       * class: Expo Router merges `styles.tabList` after Uniwind's className
       * styles, so a `justify-start` class loses. Triggers stay direct children
       * of `TabList` so the router can discover them.
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
            <TabLink
              label={t(tab.titleKey)}
              icon={tab.icon}
              hidden={!visibleNames.has(tab.tab)}
            />
          </TabTrigger>
        ))}

        {/*
         * Two 44px controls plus four labelled tabs do not fit at 390, so the
         * tab labels hide below `sm` (their aria-labels remain) and return once
         * there is room.
         */}
        <View className="ms-auto flex-row items-center gap-1">
          <ThemeDropdown variant="compact" />
          <LanguageDropdown variant="compact" />
        </View>
      </TabList>
      <TabSlot />
    </Tabs>
  );
}

function TabLink({
  label,
  icon,
  isFocused,
  className,
  href,
  hidden = false,
  onPress,
}: TabTriggerSlotProps & {
  label: string;
  icon: IconName;
  hidden?: boolean;
}) {
  return createElement(
    'a',
    {
      href,
      role: hidden ? undefined : 'tab',
      'aria-label': hidden ? undefined : label,
      'aria-selected': hidden ? undefined : isFocused ? 'true' : 'false',
      'aria-current': isFocused && !hidden ? 'page' : undefined,
      'aria-hidden': hidden ? 'true' : undefined,
      tabIndex: hidden ? -1 : undefined,
      style: {
        textDecoration: 'none',
        color: 'inherit',
        display: hidden ? 'none' : undefined,
      },
      className: FOCUS_RING,
      onClick: (event: MouseEvent<HTMLAnchorElement>) => {
        if (hidden || !shouldHandleWebLink(event)) return;

        // Let Expo Router's tab trigger call `preventDefault` and navigate.
        // Doing it first makes its `shouldHandleMouseEvent` see
        // `defaultPrevented === true` and skip navigation entirely.
        (onPress as unknown as (event: unknown) => void)?.(event);
      },
    },
    <View
      className={cn(
        // The underline is a real border on both states, so selecting a tab
        // recolours it instead of changing the row's height.
        'min-h-11 min-w-11 flex-row items-center justify-center gap-1 border-b-2 px-2 py-2 active:opacity-80 sm:min-w-0 sm:justify-start sm:gap-2 sm:px-3',
        isFocused ? 'border-brass' : 'border-transparent',
        className,
      )}
    >
      <Icon name={icon} size={18} tone={isFocused ? 'foreground' : 'muted'} />
      <Text
        variant="label"
        tone={isFocused ? 'default' : 'muted'}
        className="hidden sm:block"
      >
        {label}
      </Text>
    </View>,
  );
}
