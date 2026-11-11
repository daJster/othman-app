import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { IconName } from '@/core/config';
import { useDirection } from '@/i18n';
import { isAppHref, type AppHref } from '@/features/navigation/route-registry';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { Icon } from '@/ui/icon';
import { Skeleton } from '@/ui/skeleton';
import { Button } from '@/ui/button';
import { Text } from '@/ui/text';
import { useReducedMotion } from '@/ui/motion';
import {
  formatCountdown,
  formatDay,
  formatWhen,
  pickLocalized,
  topicLabel,
} from './circle-format';
import { MOTION, REVEAL_OFFSET } from './motion';
import { useCircle } from './use-circle';

/**
 * The circle rail: three dated rows on the one brass line.
 *
 * This is the page's answer to "what is next". The rows are not navigation —
 * they are the week: the next session, the next exam, the latest word from the
 * circle. The destinations moved to a strip below, because a menu dressed as a
 * circle was the original page's biggest lie.
 *
 * Geometry is inherited from the old station rows (40 px node, hairline
 * connector, 44 pt target) so the page keeps its warm thread; only the content
 * changed. Two rows expand in place — an exam and a notice have text worth
 * reading and no destination worth leaving Home for.
 */
export function CircleRail() {
  const { t } = useTranslation();
  const { language } = useDirection();
  const { nextHalqa, nextExam, newestNotice, now, state } = useCircle();
  const [openId, setOpenId] = useState<string | null>(null);

  /*
   * The rail is async, so it owns three states before any row exists. They keep
   * the same row geometry: a spinner or a spinner's replacement would move the
   * page under the reader's thumb while they are already scrolling.
   */
  if (state.status === 'pending') {
    return <RailSkeleton label={t('home.rail.loading')} />;
  }

  if (state.status === 'error') {
    /*
     * A quiet, inline recovery rather than the full-page `ErrorState`: this
     * band sits under a heading on a calm landing page, and a 32 px alert icon
     * in the middle of it would be louder than anything it is reporting.
     */
    return (
      <View className="gap-2 py-4">
        <Text variant="caption" tone="muted">
          {t('home.rail.error')}
        </Text>
        <Button
          variant="link"
          size="sm"
          label={t('action.retry')}
          onPress={state.retry}
          className="self-start"
        />
      </View>
    );
  }

  if (!nextHalqa && !nextExam && !newestNotice) {
    return (
      <Text variant="caption" tone="muted" className="py-6">
        {t('home.rail.empty')}
      </Text>
    );
  }

  return (
    <View>
      {nextHalqa ? (
        <RailRow
          icon="video"
          label={t('home.rail.halqa')}
          title={pickLocalized(nextHalqa.title, language)}
          meta={[
            formatWhen(nextHalqa, language, now, t),
            pickLocalized(nextHalqa.meta, language),
          ]
            .filter(Boolean)
            .join(' · ')}
          href={asHref(nextHalqa.href) ?? '/meetings'}
        />
      ) : null}

      {nextExam ? (
        <RailRow
          icon="check-circle"
          label={t('home.rail.exam')}
          title={pickLocalized(nextExam.title, language)}
          meta={[
            formatCountdown(nextExam, language, now, t),
            pickLocalized(nextExam.meta, language),
          ]
            .filter(Boolean)
            .join(' · ')}
          body={pickLocalized(nextExam.body, language)}
          open={openId === nextExam.id}
          onToggle={() =>
            setOpenId(openId === nextExam.id ? null : nextExam.id)
          }
        />
      ) : null}

      {newestNotice ? (
        <RailRow
          icon={newestNotice.topic === 'app' ? 'info' : 'inbox'}
          label={topicLabel(newestNotice.topic ?? 'app', t)}
          title={pickLocalized(newestNotice.title, language)}
          meta={formatDay(newestNotice, language, now, t)}
          body={pickLocalized(newestNotice.body, language)}
          open={openId === newestNotice.id}
          onToggle={() =>
            setOpenId(openId === newestNotice.id ? null : newestNotice.id)
          }
          isLast
        />
      ) : null}
    </View>
  );
}

/**
 * Only a registry path may become a link: demo data cannot invent a route, and
 * a typo in a fixture would otherwise 404 instead of failing at the boundary.
 */
function asHref(value: string | null): AppHref | null {
  return value && isAppHref(value) ? value : null;
}

type RailRowProps = {
  icon: IconName;
  label: string;
  title: string;
  meta: string;
  href?: AppHref;
  body?: string;
  open?: boolean;
  onToggle?: () => void;
  isLast?: boolean;
};

function RailRow({
  icon,
  label,
  title,
  meta,
  href,
  body,
  open = false,
  onToggle,
  isLast = false,
}: RailRowProps) {
  const row = (
    <View className="flex-1 gap-1.5 pb-6">
      <Text
        variant="overline"
        className="text-2xs tracking-[0.2em] text-brass-ink"
      >
        {label}
      </Text>

      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text variant="subtitle">{title}</Text>
          {meta ? (
            <Text variant="caption" tone="muted">
              {meta}
            </Text>
          ) : null}
        </View>

        <View className="pt-1">
          <Icon
            name={
              body ? (open ? 'chevron-up' : 'chevron-down') : 'chevron-right'
            }
            size={18}
            tone="muted"
          />
        </View>
      </View>

      {body && open ? <RailBody text={body} /> : null}
    </View>
  );

  return (
    <View className="flex-row gap-gutter">
      <View className="w-10 items-center self-stretch">
        <View className="h-10 w-10 items-center justify-center rounded-full border border-brass/40 bg-glass">
          <Icon name={icon} size={18} tone="primary" />
        </View>
        {!isLast ? <View className="w-px flex-1 bg-border" /> : null}
      </View>

      {href ? (
        <Link href={href} asChild>
          <Pressable
            className={cn('flex-1 active:opacity-70', FOCUS_RING)}
            accessibilityRole="link"
            accessibilityLabel={`${label}: ${title}`}
          >
            {row}
          </Pressable>
        </Link>
      ) : (
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${label}: ${title}`}
          className={cn('flex-1 active:opacity-70', FOCUS_RING)}
        >
          {row}
        </Pressable>
      )}
    </View>
  );
}

/**
 * The rail before its first answer.
 *
 * Same geometry as the real rows — node column, connector, three lines per row
 * — so the section does not change height when the data lands. The bars are
 * centred rather than aligned to a language edge: a skeleton that guesses the
 * text direction is a skeleton that jumps when the text arrives.
 */
function RailSkeleton({ label }: { label: string }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label}>
      {[0, 1, 2].map((index) => (
        <View key={index} className="flex-row gap-gutter">
          <View className="w-10 items-center self-stretch">
            <Skeleton className="h-10 w-10 rounded-full" />
            {index < 2 ? <View className="w-px flex-1 bg-border" /> : null}
          </View>
          <View
            className={cn(
              'flex-1 items-center gap-2',
              index < 2 ? 'pb-6' : 'pb-0',
            )}
          >
            <Skeleton className="h-2.5 w-16 rounded-full" />
            <Skeleton className="h-4 w-3/5 rounded-full" />
            <Skeleton className="h-2.5 w-2/5 rounded-full" />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * The expanded copy.
 *
 * Opacity and a short rise, not a height animation: an expanding height cannot
 * be measured before it is laid out without a hidden copy, and a guessed
 * `maxHeight` clips long Arabic at a large OS text size. Fading in is honest
 * about the layout jump and survives text scaling.
 *
 * The body mounts only while its row is open, so the reveal runs once on mount
 * and the close is an instant, correct layout.
 */
function RailBody({ text }: { text: string }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: reduced ? MOTION.reduceMs : MOTION.reveal,
    });
  }, [progress, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: REVEAL_OFFSET * (1 - progress.value) }],
  }));

  return (
    <Animated.View style={style}>
      <Text variant="body" className="pt-1 text-sm leading-relaxed">
        {text}
      </Text>
    </Animated.View>
  );
}
