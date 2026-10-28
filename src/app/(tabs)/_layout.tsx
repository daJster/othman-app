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
    >
      {TABS.map((tab) => {
        const glyph = getIconGlyph(tab.icon);

        return (
          <NativeTabs.Trigger key={tab.tab} name={tab.tab}>
            <NativeTabs.Trigger.Icon sf={glyph.ios} md={glyph.mdSymbol} />
            <NativeTabs.Trigger.Label>
              {t(tab.titleKey)}
            </NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        );
      })}
    </NativeTabs>
  );
}
