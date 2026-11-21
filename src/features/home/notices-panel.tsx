import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { api, useApiQuery } from '@/api';
import { useDirection, numberLocale, type Language } from '@/i18n';
import type { Notice } from '@/services/notices/notices.service';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { pickLocalized } from './circle-format';
import { useReadNotices } from './notices-read';
import { useCircle } from './use-circle';

/**
 * The inbox, as a popover panel.
 *
 * One flat list, newest first — no day headings. The date already rides on each
 * row next to the title, so grouping by day printed the same fact twice and
 * cost a sticky band to do it.
 *
 * Two lines per notice: an unread dot, the notice truncated, and when it
 * landed; then one line of description. The dot is the only colour on the row,
 * so what is new is findable without reading anything.
 *
 * **Paged.** The web popover asks for six rows; the full-screen phone drawer
 * asks for twelve so the first page fills its taller viewport. Reaching the end
 * asks for another page and shows a spinner under the last row while it arrives.
 * The mock inbox spans several pages on both surfaces.
 *
 * **Rows are marked read when pressed**, never as a side effect of opening the
 * panel: marking on open deleted every dot in the first frame, which made the
 * unread treatment correct and invisible, and clearing on close still emptied
 * the inbox behind the reader's back.
 */
const LOADING_FLOOR_MS = 300;
/** Delay between rows. Four rows land inside ~80 ms. */
const ROW_STAGGER_MS = 16;
/**
 * Fixed ceiling for the web inbox list, in pixels.
 *
 * It used to be a share of the window, so the panel changed height with the
 * viewport and, worse, when a page arrived. A constant keeps the popover the
 * same object every time it opens; the list scrolls inside it. The native sheet
 * opts into filling its available screen space instead.
 */
const MENU_MAX_HEIGHT = 420;

export function NoticesPanel({
  availableHeight,
  extended = false,
  limit,
}: {
  /** Native full-screen sheet: the remaining height below its title. */
  availableHeight?: number;
  /** Load the larger native-only archive fixture. */
  extended?: boolean;
  /** Rows per native page; the web tray keeps the default page size. */
  limit?: number;
}) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const { read, markRead } = useReadNotices();
  const { now } = useCircle();

  const [settled, setSettled] = useState(false);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<readonly Notice[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const query = useApiQuery(api.notices.page, { page, extended, limit });

  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), LOADING_FLOOR_MS);

    return () => clearTimeout(timer);
  }, []);

  // Merge each page in by id, so a refetch of a page cannot duplicate a row.
  useEffect(() => {
    const data = query.data;

    if (!data) {
      return;
    }

    /*
     * Accumulating pages is exactly this rule's exception: the new rows only
     * exist once a server answer arrives, which is the "external system" half of
     * what an effect is for. Rendering straight from `query.data` would drop
     * every page but the current one.
     */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMore(data.hasMore);
    setItems((previous) => {
      const byId = new Map(previous.map((item) => [item.id, item]));

      for (const item of data.notices) {
        byId.set(item.id, item);
      }

      return [...byId.values()].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
    });
  }, [query.data]);

  const loadMore = useCallback(() => {
    if (!hasMore || query.isFetching) {
      return;
    }

    setPage((current) => current + 1);
  }, [hasMore, query.isFetching]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;

      if (
        contentSize.height - layoutMeasurement.height - contentOffset.y <=
        48
      ) {
        loadMore();
      }
    },
    [loadMore],
  );

  /*
   * Read is a press, not a side effect of closing: a notice is marked when the
   * reader actually opens it, and opening the inbox no longer clears the dots
   * behind their back. The bell's dot therefore survives a visit until a row is
   * touched — which is what makes it useful.
   */
  const markOne = useCallback(
    (id: string) => {
      markRead([id]);
    },
    [markRead],
  );

  const firstLoad = !settled || (query.isPending && items.length === 0);
  const loadingMore = query.isFetching && items.length > 0;

  if (firstLoad) {
    return (
      <View
        className="items-center justify-center"
        style={
          availableHeight === undefined
            ? { paddingVertical: 40 }
            : { height: availableHeight }
        }
      >
        <Spinner label={t('home.rail.loading')} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View
        className={
          availableHeight === undefined
            ? 'px-panel py-6'
            : 'items-center justify-center'
        }
        style={
          availableHeight === undefined
            ? undefined
            : { height: availableHeight }
        }
      >
        <Text variant="caption" tone="muted">
          {t('home.notices.empty')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="grow-0 overscroll-contain"
      onScroll={onScroll}
      scrollEventThrottle={16}
      style={
        availableHeight === undefined
          ? { maxHeight: MENU_MAX_HEIGHT }
          : { height: availableHeight }
      }
      contentContainerClassName="py-1 pr-1.5"
    >
      {items.map((item, index) => (
        <NoticeRow
          key={item.id}
          item={item}
          unread={!read.has(item.id)}
          language={language}
          now={now}
          delayMs={Math.min(index, 8) * ROW_STAGGER_MS}
          onRead={markOne}
        />
      ))}

      {loadingMore ? (
        <View className="items-center py-3">
          <Spinner size="sm" label={t('home.rail.loading')} />
        </View>
      ) : null}
    </ScrollView>
  );
}

/** Longest title the row shows, in characters, ellipsis included. */
const TITLE_LIMIT = 30;

/**
 * One notice: mark, title, age on the first line; description under it.
 *
 * The row is a press target, not decoration: pressing it marks it read. Hover
 * animates a wash in and the unread mark grows a touch — motion that confirms
 * the row is live without moving the text away from the pointer.
 */
function NoticeRow({
  item,
  unread,
  language,
  now,
  delayMs,
  onRead,
}: {
  item: Notice;
  unread: boolean;
  language: Language;
  now: Date;
  delayMs: number;
  onRead: (id: string) => void;
}) {
  const reducedMotion = useReducedMotion();
  const hover = useSharedValue(0);

  const duration = reducedMotion ? 0 : 140;
  const enter = () => {
    hover.value = withTiming(1, { duration });
  };
  const leave = () => {
    hover.value = withTiming(0, { duration });
  };

  const washStyle = useAnimatedStyle(() => ({ opacity: hover.value * 0.05 }));
  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + hover.value * 0.25 }],
  }));

  const title = clipTitle(pickLocalized(item.title, language));

  return (
    <Animated.View
      className="notice-enter"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <Pressable
        testID={`notice-row-${item.id}`}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ selected: !unread }}
        onPress={() => onRead(item.id)}
        onHoverIn={enter}
        onHoverOut={leave}
        onPressIn={enter}
        onPressOut={leave}
        className="relative gap-1 px-3 py-2.5"
      >
        {/* The wash sits behind the text, so it can fade without touching ink. */}
        <Animated.View
          pointerEvents="none"
          style={washStyle}
          className="absolute inset-0 rounded-sm bg-foreground"
        />

        <View className="flex-row items-center gap-2">
          {unread ? (
            <Animated.View
              testID={`notice-unread-${item.id}`}
              // 6px, inline: the sheet generates no fractional spacing
              // utilities (`h-1.5` compiles to nothing here).
              style={[markStyle, { width: 6, height: 6 }]}
              className="shrink-0 rounded-full bg-destructive"
            />
          ) : null}

          <Text
            variant="label"
            className="min-w-0 flex-1 text-sm leading-snug"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>

          <Text variant="caption" tone="muted" className="shrink-0 text-2xs">
            {relativeTime(item.createdAt, language, now)}
          </Text>
        </View>

        <Text
          variant="body"
          tone="muted"
          className="text-xs leading-relaxed"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {pickLocalized(item.body, language)}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Cuts a title to `TITLE_LIMIT` characters with a real ellipsis.
 *
 * `numberOfLines` alone cannot honour a character budget: a wide panel fits
 * sixty characters on one line, and the point of the limit is that two notices
 * never differ in how much of their title survives. Counted over code points,
 * not UTF-16 units, so an Arabic ligature or an emoji is one character.
 */
function clipTitle(text: string): string {
  const characters = Array.from(text);

  if (characters.length <= TITLE_LIMIT) {
    return text;
  }

  return `${characters.slice(0, TITLE_LIMIT - 1).join('')}…`;
}

/**
 * "12 min ago", or the date once it is older than an hour.
 *
 * `Intl.RelativeTimeFormat` does the wording where the runtime provides it, so
 * Arabic gets its own grammar without a translation key per unit. Hermes builds
 * without that Intl constructor fall back to the localized calendar date.
 */
function relativeTime(iso: string, language: Language, now: Date): string {
  const at = new Date(iso);

  if (Number.isNaN(at.getTime())) {
    return '';
  }

  const minutes = Math.round((now.getTime() - at.getTime()) / 60_000);

  if (minutes < 60 && typeof Intl.RelativeTimeFormat === 'function') {
    return new Intl.RelativeTimeFormat(numberLocale(language), {
      numeric: 'auto',
      style: 'short',
    }).format(-Math.max(minutes, 1), 'minute');
  }

  return new Intl.DateTimeFormat(numberLocale(language), {
    day: 'numeric',
    month: 'short',
  }).format(at);
}
