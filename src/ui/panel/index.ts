/**
 * PanelUI surface.
 *
 * The Account and Progress screens compose their overlays and data displays
 * from one import. Each entry is either an app primitive (`Avatar`, `Skeleton`,
 * `EmptyState`) or a locally built component that the app owns end to end;
 * the re-exports keep the page code from reaching across four folders for the
 * dialog, tooltip and switch primitives the rest of the product already uses.
 *
 * `BottomSheet` is the platform-resolved `@expo/ui` sheet (native on iOS and
 * Android, dialog fallback on web). `Dialog` and `Tooltip` come from the
 * react-native-reusables layer so they keep their platform behaviour.
 */
export { Avatar } from '../avatar';
export { Skeleton } from '../skeleton';
export { EmptyState, Loading } from '../states';
export { Textarea } from '../textarea';
export { ThemedBottomSheet as BottomSheet } from '../themed-bottom-sheet';

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
export { Switch } from '@/components/ui/switch';
export {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export { Drawer } from './drawer';
export { Feedback, type FeedbackValue } from './feedback';
export { LiveLinechart, type LineChartPoint } from './line-chart';
export { SearchBar } from './search-bar';
export { SectionRail, type SectionRailItem } from './section-rail';
export { Spinner } from './spinner';
export { Steps, type StepItem, type StepStatus } from './steps';
export { ThemeSelector } from './theme-selector';
export { ToastProvider, useToast } from './toast';
export { WeekStrip, type WeekStripDay } from './week-strip';
