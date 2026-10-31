import { createElement, type MouseEvent } from 'react';
import {
  TabList,
  TabSlot,
  TabTrigger,
  Tabs,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { TABS } from '@/features/navigation/route-registry';
import { shouldHandleWebLink } from '@/features/navigation/web-link';
import { useVisibleTabs } from '@/features/navigation/use-visible-tabs';
import type { IconName } from '@/core/config';
import { cn } from '@/ui/cn';
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
  const visible = useVisibleTabs();
  const visibleNames = new Set(visible.map((tab) => tab.tab));

  return (
    <Tabs className="flex-1 bg-background">
      <TabList className="flex-row flex-wrap items-center gap-1 border-b border-border bg-card px-2 py-2 sm:px-3">
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
      'aria-selected': hidden ? undefined : isFocused ? 'true' : 'false',
      'aria-current': isFocused && !hidden ? 'page' : undefined,
      'aria-hidden': hidden ? 'true' : undefined,
      tabIndex: hidden ? -1 : undefined,
      style: {
        textDecoration: 'none',
        color: 'inherit',
        display: hidden ? 'none' : undefined,
      },
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
        'flex-row items-center gap-2 rounded-md px-3 py-2 active:opacity-80',
        isFocused ? 'bg-muted' : 'bg-transparent',
        className,
      )}
    >
      <Icon name={icon} size={18} tone={isFocused ? 'primary' : 'muted'} />
      <Text variant="label" tone={isFocused ? 'default' : 'muted'}>
        {label}
      </Text>
    </View>,
  );
}
