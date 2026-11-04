import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { formatDateKey } from '@/core/domain/meetings/date-key';
import type { ReadingEntry } from '@/core/domain/quran/reading-log';
import {
  useDailyHizb,
  useHydrateReadingLog,
  useReadingLog,
} from '@/features/quran/history/use-reading-log';
import { SEED_READING_LOG } from '@/features/quran/history/seed';
import { useDirection } from '@/i18n';
import { Icon } from '@/ui/icon';
import { useIsWide } from '@/ui/layout';
import { useReducedMotion } from '@/ui/motion';
import { Text } from '@/ui/text';
import { formatReaderNumber } from '../format';
import { HizbGauge } from './hizb-gauge';

/**
 * How much of today's goal is done.
 *
 * The goal is one page a day. That is small on purpose: the band is a daily
 * invitation, not a scoreboard, and one page is the smallest unit a reader can
 * honestly finish and count. Partial pages are not tracked, so the fraction is
 * always `0 of 1` or `1 of 1`.
 *
 * The ring is the anchor and the fraction is the only metric; there is no
 * second percentage in the centre. The pairing is physical — gauge on the left,
 * fraction on the right, under it on very narrow widths — so Arabic and English
 * keep the same composition instead of mirroring it.
 *
 * The sample caption is not a permanent apology. It appears only while the
 * log still carries the demo seed, because a reader who opened the app for the
 * first time should not mistake seeded history for their own work. The
 * detection matches the resume band's: the seed sits at the tail of the log
 * (matched on page and surah, since its timestamps move with "today"), and
 * real readings are prepended ahead of it.
 *
 * The completion line is mounted rather than toggled on an already-mounted
 * view, so `FadeIn` runs once when `done` turns true and never replays on a
 * re-render (the day is the key). With reduced motion it is the same line,
 * rendered without the animation.
 */
const DAILY_PAGES = 1;
const PHONE_SIZE = 136;
const WIDE_SIZE = 176;
const PHONE_STROKE = 10;
const WIDE_STROKE = 12;

export function DailyHizbBand() {
  const { t } = useTranslation();
  const { language } = useDirection();
  const wide = useIsWide();
  const reducedMotion = useReducedMotion();

  // The landing page is a complete entry point on a cold launch, so the band
  // starts the one-shot read of the persisted log itself.
  useHydrateReadingLog();
  const { entries } = useReadingLog();

  const day = formatDateKey(new Date());
  const { read, target, done } = useDailyHizb(day, DAILY_PAGES);
  const sample = hasSeedHistory(entries);

  const size = wide ? WIDE_SIZE : PHONE_SIZE;
  const strokeWidth = wide ? WIDE_STROKE : PHONE_STROKE;

  return (
    <View
      testID="quran-hizb-band"
      className="border-b border-border py-7 md:py-8"
    >
      <Text variant="overline" tone="muted">
        {t('quran.goal.title')}
      </Text>

      <View className="mt-4 flex-row flex-wrap items-center gap-6 md:gap-10">
        <HizbGauge
          value={read}
          max={target}
          size={size}
          strokeWidth={strokeWidth}
        />

        <View className="max-w-[18rem] gap-1">
          <Text
            variant="title"
            className="text-3xl font-semibold tabular-nums md:text-4xl"
          >
            {t('quran.goal.progress', {
              read: formatReaderNumber(read, language),
              target: formatReaderNumber(target, language),
            })}
          </Text>

          {sample ? (
            <Text variant="caption" tone="muted">
              {t('quran.goal.sample')}
            </Text>
          ) : null}
        </View>
      </View>

      {done ? (
        <Animated.View
          key={day}
          entering={reducedMotion ? undefined : FadeIn.duration(240)}
          testID="quran-hizb-done"
          className="mt-5 flex-row items-center gap-2"
        >
          {/* The registry has no bare `check`; `check-circle` is the
              completion glyph it already ships. */}
          <Icon name="check-circle" size={14} tone="primary" />
          <Text variant="caption" className="text-success">
            {t('quran.goal.done')}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * The demo seed still sits at the tail of the log.
 *
 * Real readings are prepended, so the seed days stay contiguous and oldest
 * last. Matching on page and surah rather than on timestamps keeps the label
 * stable between sessions: the seed is generated relative to "today", so its
 * `at` values move every run even when nothing else did. This mirrors the
 * resume band's helper; both bands answer the same question about the log.
 */
function hasSeedHistory(entries: readonly ReadingEntry[]): boolean {
  const seedLength = SEED_READING_LOG.length;
  if (entries.length < seedLength) return false;

  const tail = entries.slice(entries.length - seedLength);

  return tail.every(
    (entry, index) =>
      entry.page === SEED_READING_LOG[index].page &&
      entry.surah === SEED_READING_LOG[index].surah,
  );
}
