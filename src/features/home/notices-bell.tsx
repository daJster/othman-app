import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { Icon } from '@/ui/icon';
import { NoticesSheet } from './notices-sheet';
import { useReadNotices } from './notices-read';
import { useCircle } from './use-circle';

/**
 * The bell and its inbox.
 *
 * Two placements, one component: on the glass panel it is bare ink over the
 * film's light; in the web bar it is a ghost control matching the theme,
 * language and session triggers. The unread marker is a single clay dot — the
 * composition's one clay note — and never a count, because a number turns an
 * invitation into a backlog.
 *
 * The label carries the unread state for assistive tech; the dot is decoration.
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
  const { items } = useCircle();
  const { read } = useReadNotices();

  const unread = items.some(
    (item) => item.kind === 'notice' && !read.has(item.id),
  );

  return (
    <>
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
        onPress={() => setOpen(true)}
        className={cn(
          'relative h-11 w-11 items-center justify-center rounded-full',
          variant === 'bar' && 'active:opacity-80',
          variant === 'panel' && 'active:opacity-70',
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
            className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full border border-canopy bg-clay"
          />
        ) : null}
      </Pressable>

      <NoticesSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
