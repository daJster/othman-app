import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, useApiQuery } from '@/api';
import { useCSSVariable } from 'uniwind';
import { Platform, Pressable, View } from 'react-native';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useExclusiveBarMenu } from '@/features/navigation/web/bar-menu';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { Icon } from '@/ui/icon';
import { NoticesPanel } from './notices-panel';
import { NoticesSheet } from './notices-sheet';
import { useReadNotices } from './notices-read';

/**
 * The bell and its inbox.
 *
 * Two placements, one component. On the glass panel it is bare ink over the
 * film's light; in the web bar it is a ghost control matching the theme,
 * language and session triggers.
 *
 * **Two inbox surfaces, chosen by where the bell is.** In the bar on the web
 * the bell *pops* like every other control beside it — an anchored popover,
 * dismissed by the next press, with the panel in `notices-panel.tsx`. On a
 * phone, and from the hero panel, it still opens the bottom sheet: that is the
 * right shape for a thumb-reachable surface and the only one `@expo/ui` can
 * animate on both platforms.
 *
 * The unread marker is a single red dot — never a count, because a number turns
 * an invitation into a backlog. The label carries the unread state for assistive
 * tech; the dot is decoration.
 */
export type NoticesBellProps = {
  variant?: 'panel' | 'bar';
  className?: string;
  /** The ghost card is behind the morph overlay; its controls must not answer. */
  interactive?: boolean;
};

export function NoticesBell({
  variant = 'bar',
  className,
  interactive = true,
}: NoticesBellProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // The same page-one query the panel uses: one cache entry, so opening the
  // panel costs nothing after the bell has already asked.
  const query = useApiQuery(api.notices.page, {
    page: 1,
    extended: Platform.OS !== 'web',
    limit: Platform.OS !== 'web' ? 12 : undefined,
  });
  const { read } = useReadNotices();
  // Tracking only: the popover keeps its own open state, but the bar needs to
  // know which control owns the press so one click can hand over to another.
  const exclusive = useExclusiveBarMenu('notices');

  const unread = (query.data?.notices ?? []).some((item) => !read.has(item.id));

  const destructive = useCSSVariable('--color-destructive');
  const canopy = useCSSVariable('--color-canopy');
  const dotColor = typeof destructive === 'string' ? destructive : '#e5484d';
  const ringColor = typeof canopy === 'string' ? canopy : '#000000';

  const bell = (
    <Pressable
      testID={`notices-bell-${variant}`}
      pointerEvents={interactive ? 'auto' : 'none'}
      aria-hidden={!interactive}
      accessibilityRole="button"
      accessibilityLabel={
        unread
          ? `${t('home.notices.open')} — ${t('home.notices.unread')}`
          : t('home.notices.open')
      }
      onPress={
        variant === 'bar' && Platform.OS === 'web'
          ? undefined
          : () => setOpen(true)
      }
      className={cn(
        'relative h-11 w-11 items-center justify-center rounded-full',
        // A ghost control like its neighbours. The resting half-opacity is gone:
        // it multiplied into the unread dot and dimmed the one mark the bar
        // exists to show. The wash is the whole hover now, and the dot keeps its
        // full colour until the notice is read.
        'transition-colors duration-100 hover:bg-foreground/5 active:bg-foreground/10',
        FOCUS_RING,
        className,
      )}
    >
      <Icon
        name="bell"
        size={18}
        tone={variant === 'panel' ? 'foreground' : 'muted'}
      />

      {unread ? (
        <View
          testID={`notices-dot-${variant}`}
          pointerEvents="none"
          /*
           * Geometry and colour inline. The bar's dot was invisible on some
           * engines while the same classes painted fine elsewhere, and there is
           * no second chance for a one-glyph marker: explicit numbers cannot be
           * dropped by the utility sheet and cannot inherit the button's
           * half-opacity resting state.
           */
          style={{
            position: 'absolute',
            top: 7,
            right: 7,
            width: 8,
            height: 8,
            borderRadius: 4,
            zIndex: 2,
            backgroundColor: dotColor,
            borderWidth: 1,
            borderColor: ringColor,
          }}
        />
      ) : null}
    </Pressable>
  );

  if (variant === 'bar' && Platform.OS === 'web') {
    return (
      <Popover {...exclusive}>
        <PopoverTrigger asChild>{bell}</PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={8}
          // The panel owns its own padding and bounds; the content is only the
          // material. `p-0` has to travel in `style` — the primitive's own
          // `p-panel` wins the class merge, and the extra 24 px would hold the
          // scroller (and its sticky heading) away from the panel's top edge.
          style={{ padding: 0 }}
          className="w-[22rem] max-w-[calc(100vw-2rem)]"
          testID="notices-popover"
        >
          <NoticesPanel />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      {bell}
      <NoticesSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
