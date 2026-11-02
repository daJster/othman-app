import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';
import { useResolveClassNames } from 'uniwind';
import { TABS } from '@/features/navigation/route-registry';
import { getIconGlyph } from '@/ui/icon';

/**
 * Native tab bar (iOS / Android).
 *
 * `NativeTabs` renders the platform's own tab bar — UITabBarController and
 * Material's bottom navigation — so it keeps the OS's blur, badges, haptics and
 * "tap the active tab to scroll to top" behaviour that a JS tab bar cannot
 * reproduce. The cost is that icons and labels are *not* React components, which
 * is why `APP_ROUTES` carries logical icon names and this file resolves them to
 * SF Symbols / Material symbols.
 *
 * Colours are resolved from tokens through `useResolveClassNames`: the native
 * tab bar takes `ColorValue`s, not classNames, and a literal hex here would be
 * the one place in the app that ignores the theme.
 *
 * Every registry tab is always a trigger, signed in or out. A changing trigger
 * set remounts the navigator (and its state) on auth changes, and a bar that
 * shrinks from four items to two is a layout surprise. Access is enforced by
 * `RequireAuth` and the root redirect, not by the bar.
 *
 * Three platform choices are explicit rather than inherited:
 *
 *  - `labelVisibilityMode="labeled"` — Material's default (`auto`) drops labels
 *    once there are more than three destinations, so Android would show four
 *    unlabeled glyphs where iOS shows four labels. The bar is the only chrome
 *    on the screen; it keeps its labels.
 *  - `minimizeBehavior="never"` — iOS 26 can shrink the bar on scroll. Every
 *    screen here is a normal scrolling page, so hiding the destinations buys
 *    nothing and makes them chase the user.
 *  - `testID`/`accessibilityLabel` per trigger — the same destination names the
 *    web anchors expose, so one device test can drive either shell.
 *
 * The web shell is `_layout.web.tsx`; Metro picks it by platform.
 */
export default function NativeTabsLayout() {
  const { t } = useTranslation();
  const bar = useResolveClassNames('bg-background');
  const idleIcon = useResolveClassNames('text-muted-foreground');
  const activeIcon = useResolveClassNames('text-primary');

  return (
    <NativeTabs
      backgroundColor={bar.backgroundColor}
      iconColor={{ default: idleIcon.color, selected: activeIcon.color }}
      labelStyle={{ selected: { color: activeIcon.color } }}
      labelVisibilityMode="labeled"
      minimizeBehavior="never"
    >
      {TABS.map((tab) => {
        const glyph = getIconGlyph(tab.icon);
        const label = t(tab.titleKey);

        return (
          <NativeTabs.Trigger
            key={tab.tab}
            name={tab.tab}
            testID={`tab-${tab.tab}`}
            accessibilityLabel={label}
          >
            <NativeTabs.Trigger.Icon sf={glyph.ios} md={glyph.mdSymbol} />
            <NativeTabs.Trigger.Label>{label}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        );
      })}
    </NativeTabs>
  );
}
