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
 * The destination is a **link in a navigation landmark**, not a tab in a tab
 * widget: there is no `role="tablist"` or tabpanel behind it, so `role="tab"`
 * would promise arrow-key semantics the bar does not have. `aria-current="page"`
 * is the honest signal and the one screen readers announce on navigation.
 *
 * Labels are visible at every width. Below `sm` the icon sits above a short
 * label; from `sm` up the two sit inline. An icon-only bar is unreadable on a
 * phone browser, which is the only chrome that viewport gets.
 */
export type WebTabLinkProps = TabTriggerSlotProps & {
  label: string;
  icon: IconName;
  /**
   * Registered but not shown. The trigger must still render so `expo-router`
   * creates the screen; `display: none` keeps it out of the bar, the
   * accessibility tree and the tab order.
   */
  hidden?: boolean;
  testID?: string;
};

export type WebTabAriaState = {
  isFocused: boolean;
  hidden: boolean;
};

/**
 * ARIA for a tab whose route may be hidden from the bar.
 *
 * Visible destinations are links with `aria-current` on the active one. A
 * hidden destination is removed from the tree entirely: it exists for the
 * navigator, not for the reader.
 */
export function webTabAria({ isFocused, hidden }: WebTabAriaState) {
  if (hidden) {
    return { 'aria-hidden': 'true' as const, tabIndex: -1 as const };
  }

  return { 'aria-current': isFocused ? ('page' as const) : undefined };
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
        // recolours it instead of changing the row's height. It sits directly
        // on the bar's hairline: the row owns no vertical padding, so the
        // indicator touches the bottom edge instead of floating above it.
        'min-h-12 min-w-11 flex-col items-center justify-center gap-0.5 border-b-2 px-1.5 pt-2 pb-1.5 active:opacity-80 sm:min-w-0 sm:flex-row sm:gap-2 sm:px-3 sm:pt-0 sm:pb-0',
        isFocused ? 'border-brass' : 'border-transparent',
        className,
      )}
    >
      <Icon name={icon} size={18} tone={isFocused ? 'foreground' : 'muted'} />
      <Text
        variant="label"
        tone={isFocused ? 'default' : 'muted'}
        className="text-[11px] leading-tight sm:text-sm"
      >
        {label}
      </Text>
    </View>,
  );
}
