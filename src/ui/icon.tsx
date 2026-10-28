import { SymbolView } from 'expo-symbols';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { withUniwind } from 'uniwind';
import type { IconName, IconRegistry } from '@/core/config';

/**
 * Icon registry.
 *
 * `core` declares logical names as strings (it may not import components), and
 * this file resolves each key to the platform set: SF Symbols on iOS, Material
 * Icons on Android and web. `satisfies IconRegistry` makes the table
 * exhaustive — adding a name in `core/config/types.ts` without a mapping here
 * is a compile error instead of a blank square on device.
 *
 * Three columns, because the platforms genuinely disagree:
 *
 *  - `ios` — SF Symbol name.
 *  - `md` — Material **Icons** name, used by `@expo/vector-icons` in `<Icon>`.
 *  - `mdSymbol` — Material **Symbols** name, used by `NativeTabs`. They are a
 *    different set with a different spelling convention (`menu-book` vs
 *    `menu_book`), so they cannot share a column without lying to the type
 *    system. Only the tab icons reach this column, but every row has one so a
 *    future tab cannot silently fall back to a blank square.
 *
 * Both icon components are third-party, so both are wrapped with `withUniwind`
 * once here; their colour is an `accent-` class, which is the only way to make
 * an icon theme-aware (RN has no colour inheritance).
 */
type IconSet = {
  ios: SFSymbol;
  md: ComponentProps<typeof MaterialIcons>['name'];
  mdSymbol: AndroidSymbol;
};

const ICONS = {
  home: { ios: 'house', md: 'home', mdSymbol: 'home' },
  user: { ios: 'person', md: 'person', mdSymbol: 'person' },
  'book-open': { ios: 'book', md: 'menu-book', mdSymbol: 'menu_book' },
  'chart-line': {
    ios: 'chart.line.uptrend.xyaxis',
    md: 'show-chart',
    mdSymbol: 'show_chart',
  },
  'check-circle': {
    ios: 'checkmark.circle',
    md: 'check-circle',
    mdSymbol: 'check_circle',
  },
  cog: { ios: 'gearshape', md: 'settings', mdSymbol: 'settings' },
  'external-link': {
    ios: 'arrow.up.right.square',
    md: 'open-in-new',
    mdSymbol: 'open_in_new',
  },
  'file-text': { ios: 'doc.text', md: 'description', mdSymbol: 'description' },
  megaphone: { ios: 'megaphone', md: 'campaign', mdSymbol: 'campaign' },
  trash: { ios: 'trash', md: 'delete', mdSymbol: 'delete' },
  university: {
    ios: 'building.columns',
    md: 'account-balance',
    mdSymbol: 'account_balance',
  },
  video: { ios: 'video', md: 'videocam', mdSymbol: 'videocam' },
  'alert-circle': {
    ios: 'exclamationmark.triangle',
    md: 'error-outline',
    mdSymbol: 'error_outline',
  },
  inbox: { ios: 'tray', md: 'inbox', mdSymbol: 'inbox' },
  calendar: {
    ios: 'calendar',
    md: 'calendar-today',
    mdSymbol: 'calendar_today',
  },
  'chevron-down': {
    ios: 'chevron.down',
    md: 'expand-more',
    mdSymbol: 'expand_more',
  },
  'chevron-left': {
    ios: 'chevron.left',
    md: 'chevron-left',
    mdSymbol: 'chevron_left',
  },
  'chevron-right': {
    ios: 'chevron.right',
    md: 'chevron-right',
    mdSymbol: 'chevron_right',
  },
  'chevron-up': {
    ios: 'chevron.up',
    md: 'expand-less',
    mdSymbol: 'expand_less',
  },
  clock: { ios: 'clock', md: 'schedule', mdSymbol: 'schedule' },
  'map-pin': { ios: 'mappin.and.ellipse', md: 'place', mdSymbol: 'place' },
  users: { ios: 'person.2', md: 'group', mdSymbol: 'group' },
  // Added with the account screens (P4.3).
  camera: { ios: 'camera', md: 'photo-camera', mdSymbol: 'photo_camera' },
  info: { ios: 'info.circle', md: 'info-outline', mdSymbol: 'info' },
  logout: {
    ios: 'rectangle.portrait.and.arrow.right',
    md: 'logout',
    mdSymbol: 'logout',
  },
} satisfies IconRegistry<IconSet>;

const StyledSymbol = withUniwind(SymbolView);
const StyledMaterialIcon = withUniwind(MaterialIcons);

/** `accent-` class per intent, so callers do not have to know the prefix. */
const TONE_ACCENT = {
  foreground: 'accent-foreground',
  muted: 'accent-muted-foreground',
  primary: 'accent-primary',
  destructive: 'accent-destructive',
} as const;

export type IconTone = keyof typeof TONE_ACCENT;

/**
 * Platform glyph names for a logical icon.
 *
 * Native tab bars render their own icons — they cannot host an arbitrary
 * component — so `NativeTabs` needs the raw names rather than `<Icon>`. Exposing
 * the same table keeps one source of truth: adding a tab icon cannot drift from
 * the icon set the rest of the app uses.
 */
export function getIconGlyph(name: IconName): IconSet {
  return ICONS[name];
}

export type IconProps = {
  name: IconName;
  size?: number;
  tone?: IconTone;
};

export function Icon({ name, size = 20, tone = 'foreground' }: IconProps) {
  const icon = ICONS[name];
  const colorClassName = TONE_ACCENT[tone];

  if (Platform.OS === 'ios') {
    return (
      <StyledSymbol
        name={icon.ios}
        size={size}
        tintColorClassName={colorClassName}
        accessibilityElementsHidden
      />
    );
  }

  return (
    <StyledMaterialIcon
      name={icon.md}
      size={size}
      colorClassName={colorClassName}
      accessibilityElementsHidden
    />
  );
}
