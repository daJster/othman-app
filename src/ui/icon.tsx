import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import type { LucideIcon } from 'lucide-react-native';
import BookOpen from 'lucide-react-native/icons/book-open';
import Calendar from 'lucide-react-native/icons/calendar';
import Camera from 'lucide-react-native/icons/camera';
import ChartLine from 'lucide-react-native/icons/chart-line';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import Clock from 'lucide-react-native/icons/clock';
import ExternalLink from 'lucide-react-native/icons/external-link';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import FileText from 'lucide-react-native/icons/file-text';
import House from 'lucide-react-native/icons/house';
import Inbox from 'lucide-react-native/icons/inbox';
import Info from 'lucide-react-native/icons/info';
import Layers from 'lucide-react-native/icons/layers';
import LogOut from 'lucide-react-native/icons/log-out';
import MapPin from 'lucide-react-native/icons/map-pin';
import Menu from 'lucide-react-native/icons/menu';
import Pause from 'lucide-react-native/icons/pause';
import Pencil from 'lucide-react-native/icons/pencil';
import Play from 'lucide-react-native/icons/play';
import Search from 'lucide-react-native/icons/search';
import User from 'lucide-react-native/icons/user';
import Users from 'lucide-react-native/icons/users';
import Video from 'lucide-react-native/icons/video';
import Volume2 from 'lucide-react-native/icons/volume-2';
import X from 'lucide-react-native/icons/x';
import { useResolveClassNames } from 'uniwind';
import type { IconName } from '@/core/config';

/**
 * Icon registry.
 *
 * `core` declares logical names as strings (it may not import components), and
 * this file binds them to Lucide components. Lucide draws one stroked icon set
 * on web, iOS and Android, so an icon looks the same everywhere — the icon-font
 * and SF Symbol branches are gone.
 *
 * Imports are **subpath** imports (`lucide-react-native/icons/house`), not the
 * package barrel. The barrel re-exports every icon and pulls thousands of
 * modules into the Metro graph for the thirty we use.
 *
 * `satisfies` makes the table exhaustive: adding a name in
 * `core/config/types.ts` without a mapping here is a compile error instead of a
 * blank square on device.
 *
 * The native tab bar is the one exception. `NativeTabs` renders platform icons
 * itself and cannot host an arbitrary component, so `TAB_GLYPHS` keeps the SF
 * Symbol / Material Symbol names for the four tab roots only.
 */
const ICON_COMPONENTS = {
  'book-open': BookOpen,
  'chart-line': ChartLine,
  'check-circle': CircleCheck,
  'external-link': ExternalLink,
  'file-text': FileText,
  video: Video,
  home: House,
  user: User,
  'alert-circle': CircleAlert,
  inbox: Inbox,
  calendar: Calendar,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  clock: Clock,
  'map-pin': MapPin,
  users: Users,
  camera: Camera,
  info: Info,
  logout: LogOut,
  menu: Menu,
  search: Search,
  layers: Layers,
  pencil: Pencil,
  volume: Volume2,
  play: Play,
  pause: Pause,
  close: X,
  eye: Eye,
  'eye-off': EyeOff,
} satisfies Readonly<Record<IconName, LucideIcon>>;

/** `text-` class per intent, so callers do not have to know the prefix. */
const TONE_CLASS = {
  foreground: 'text-foreground',
  muted: 'text-muted-foreground',
  primary: 'text-primary',
  destructive: 'text-destructive',
} as const;

export type IconTone = keyof typeof TONE_CLASS;

type TabGlyph = { ios: SFSymbol; mdSymbol: AndroidSymbol };

/**
 * Native tab glyphs.
 *
 * Only the four tab roots can appear here. Keeping this table separate from
 * `ICON_COMPONENTS` states the platform constraint instead of pretending Lucide
 * can render inside `NativeTabs`.
 */
const TAB_GLYPHS = {
  home: { ios: 'house', mdSymbol: 'home' },
  'book-open': { ios: 'book', mdSymbol: 'menu_book' },
  video: { ios: 'video', mdSymbol: 'videocam' },
  user: { ios: 'person', mdSymbol: 'person' },
} satisfies Partial<Record<IconName, TabGlyph>>;

/**
 * Platform glyph names for a logical tab icon.
 *
 * Throws for a name outside the tab table: a missing native glyph is a
 * programming error, and failing loudly is better than a blank tab.
 */
export function getIconGlyph(name: IconName): TabGlyph {
  const glyph = (TAB_GLYPHS as Partial<Record<IconName, TabGlyph>>)[name];

  if (!glyph) {
    throw new Error(`No native tab glyph registered for "${name}"`);
  }

  return glyph;
}

export type IconProps = {
  name: IconName;
  size?: number;
  tone?: IconTone;
};

export function Icon({ name, size = 20, tone = 'foreground' }: IconProps) {
  const Component = ICON_COMPONENTS[name];
  const { color } = useResolveClassNames(TONE_CLASS[tone]);

  return (
    <Component
      color={color}
      size={size}
      strokeWidth={1.8}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      {...({ 'aria-hidden': true } as Record<string, unknown>)}
    />
  );
}
