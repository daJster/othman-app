import { useTranslation } from 'react-i18next';
import { useEffect, useMemo } from 'react';
import { View, useWindowDimensions, Platform } from 'react-native';
import type { TFunction } from 'i18next';
import { useDirection, type Language } from '@/i18n';
import { cn } from '@/ui/cn';
import type { CircleItem } from '@/services/circle';
import { NativeSheetContent } from '@/ui/native-sheet-content';
import { SheetHeader } from '@/ui/sheet-header';
import { ThemedBottomSheet } from '@/ui/themed-bottom-sheet';
import { Text } from '@/ui/text';
import { daysAway } from './circle-projection';
import { formatDay, pickLocalized, topicLabel } from './circle-format';
import { useCircle } from './use-circle';
import { useReadNotices } from './notices-read';

/**
 * The inbox.
 *
 * One `@expo/ui` bottom sheet on native (real detents, drag, back-button) and
 * its `<dialog>` implementation on web — the only `@expo/ui` surface that
 * animates on both platforms. Inside, the rows are RN views from the app's own
 * tokens rather than `List`: the universal list hard-codes its own label
 * colours on web, which is why Account already forks there.
 *
 * Opening the sheet marks everything read. The dot is an invitation, not a
 * task list; a "mark all read" control would be a second job for a page that
 * has one.
 */
export type NoticesSheetProps = {
  open: boolean;
  onClose: () => void;
};

export function NoticesSheet({ open, onClose }: NoticesSheetProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const { items, now } = useCircle();
  const { read, markRead } = useReadNotices();
  const window = useWindowDimensions();
  // Native sheets host RN without a width; web dialogs already constrain it.
  const sheetWidth =
    Platform.OS === 'web' ? undefined : Math.max(0, window.width - 32);

  const notices = useMemo(
    () =>
      items
        .filter((item) => item.kind === 'notice')
        .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [items],
  );

  const unreadIds = useMemo(
    () => notices.filter((item) => !read.has(item.id)).map((item) => item.id),
    [notices, read],
  );

  useEffect(() => {
    if (open && unreadIds.length > 0) {
      markRead(unreadIds);
    }
  }, [open, unreadIds, markRead]);

  const today = notices.filter((item) => daysAway(item, now) === 0);
  const earlier = notices.filter((item) => daysAway(item, now) !== 0);

  return (
    <ThemedBottomSheet
      isPresented={open}
      onDismiss={onClose}
      showDragIndicator={Platform.OS !== 'web'}
      // A native sheet hosts RN content that cannot scroll itself, so it opens
      // tall enough to hold the list rather than clipping the last notice. Web
      // sizes the dialog to its content.
      snapPoints={Platform.OS === 'web' ? undefined : ['full']}
      testID="notices-sheet"
    >
      <NativeSheetContent>
        {/*
         * A native sheet host has no width to give its RN subtree: without an
         * explicit measure the text lays out at its intrinsic width and runs
         * off the right edge of the sheet. The window minus a gutter is the
         * sheet's own width on both platforms.
         */}
        <View
          style={sheetWidth ? { width: sheetWidth } : undefined}
          className={cn(
            'gap-5 p-4 pb-6',
            Platform.OS === 'web' && 'mx-auto w-full max-w-xl py-6',
          )}
        >
          <SheetHeader
            title={t('home.notices.title')}
            onClose={onClose}
            closeTestID="notices-close"
          />

          {notices.length === 0 ? (
            <Text variant="caption" tone="muted">
              {t('home.notices.empty')}
            </Text>
          ) : null}

          {today.length > 0 ? (
            <NoticeGroup
              title={t('home.notices.today')}
              items={today}
              language={language}
              now={now}
              t={t}
            />
          ) : null}

          {earlier.length > 0 ? (
            <NoticeGroup
              title={t('home.notices.thisWeek')}
              items={earlier}
              language={language}
              now={now}
              t={t}
            />
          ) : null}
        </View>
      </NativeSheetContent>
    </ThemedBottomSheet>
  );
}

function NoticeGroup({
  title,
  items,
  language,
  now,
  t,
}: {
  title: string;
  items: readonly CircleItem[];
  language: Language;
  now: Date;
  t: TFunction<'common'>;
}) {
  return (
    <View className="gap-3">
      <Text variant="overline" tone="muted" className="tracking-[0.2em]">
        {title}
      </Text>

      {items.map((item) => (
        <View key={item.id} className="gap-1">
          <Text
            variant="overline"
            className="text-2xs tracking-[0.18em] text-brass-ink"
          >
            {[
              topicLabel(item.topic ?? 'app', t),
              formatDay(item, language, now, t),
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>

          <Text variant="subtitle" className="text-base leading-snug">
            {pickLocalized(item.title, language)}
          </Text>

          <Text variant="body" tone="muted" className="text-sm leading-relaxed">
            {pickLocalized(item.body, language)}
          </Text>
        </View>
      ))}
    </View>
  );
}
