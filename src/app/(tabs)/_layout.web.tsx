import {
  TabList,
  TabSlot,
  TabTrigger,
  Tabs,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { TABS } from '@/features/navigation/route-registry';
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
 * `TabTrigger asChild` clones the child and hands it `isFocused` plus the
 * navigation handler, so the button owns its own styling while the router owns
 * the behaviour.
 */
export default function WebTabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs className="flex-1 bg-background">
      <TabList className="flex-row items-center gap-1 border-b border-border bg-card px-3 py-2">
        {TABS.map((tab) => (
          <TabTrigger key={tab.tab} name={tab.tab} href={tab.href} asChild>
            <TabButton label={t(tab.titleKey)} icon={tab.icon} />
          </TabTrigger>
        ))}
      </TabList>
      <TabSlot />
    </Tabs>
  );
}

function TabButton({
  label,
  icon,
  isFocused,
  className,
  ...props
}: TabTriggerSlotProps & { label: string; icon: IconName }) {
  // `href` is dropped deliberately: the trigger's `onPress` already navigates,
  // and React Native's `Pressable` type has no `href`. Real anchor semantics
  // (middle-click, new tab) are a P8.2 web-parity item, not shell work.
  const { href: _href, ...pressableProps } = props;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      className={cn(
        'flex-row items-center gap-2 rounded-md px-3 py-2 active:opacity-80',
        isFocused ? 'bg-muted' : 'bg-transparent',
        className,
      )}
      {...pressableProps}
    >
      <Icon name={icon} size={18} tone={isFocused ? 'primary' : 'muted'} />
      <Text variant="label" tone={isFocused ? 'default' : 'muted'}>
        {label}
      </Text>
    </Pressable>
  );
}
