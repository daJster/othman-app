import { createElement, type MouseEvent } from 'react';
import type { TabTriggerSlotProps } from 'expo-router/ui';
import { View } from 'react-native';
import type { IconName } from '@/core/config';
import { shouldHandleWebLink } from '@/features/navigation/web-link';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

/**
 * One destination in the web bar, rendered as a real anchor.
 *
 * `TabTrigger asChild` supplies the router's click handler; this component
 * supplies the element the browser understands. The element stays an `<a href>`
 * on purpose: middle-click, Cmd/Ctrl-click, open-in-new-tab, focus order and
 * the status bar all stop working the moment it becomes a button with an
 * `onClick`.
 *
 * The attributes are split into `webTabAria` because they are policy, not
 * decoration: a hidden trigger must be out of the accessibility tree and out of
 * the tab order while still registering its route with the navigator.
 */
export type WebTabLinkProps = TabTriggerSlotProps & {
  label: string;
  icon: IconName;
  hidden?: boolean;
  testID?: string;
};

export type WebTabAriaState = {
  isFocused: boolean;
  hidden: boolean;
};

/**
 * ARIA for a tab whose route may be gated.
 *
 * Visible tabs are a tablist item (`role="tab"`, `aria-selected`). The focused
 * one also carries `aria-current="page"` because on web this bar *is* the
 * page's navigation, and the browser's own "current page" signal is what
 * assistive tech announces on navigation.
 */
export function webTabAria({ isFocused, hidden }: WebTabAriaState) {
  if (hidden) {
    return { 'aria-hidden': 'true' as const, tabIndex: -1 as const };
  }

  return {
    role: 'tab' as const,
    'aria-selected': isFocused ? ('true' as const) : ('false' as const),
    'aria-current': isFocused ? ('page' as const) : undefined,
  };
}

export function WebTabLink({
  label,
  icon,
  isFocused,
  className,
  href,
  hidden = false,
  onPress,
  testID,
}: WebTabLinkProps) {
  return createElement(
    'a',
    {
      href,
      ...webTabAria({ isFocused: Boolean(isFocused), hidden }),
      'aria-label': hidden ? undefined : label,
      style: {
        textDecoration: 'none',
        color: 'inherit',
        display: hidden ? 'none' : undefined,
      },
      className: FOCUS_RING,
      testID,
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
