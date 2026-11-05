import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { formatDateKey } from '@/core/domain/meetings/date-key';
import type { ReadingEntry } from '@/core/domain/quran/reading-log';
import { SEED_READING_LOG } from '@/features/quran/history/seed';
import {
  useDailyHizb,
  useHydrateReadingLog,
  useReadingLog,
} from '@/features/quran/history/use-reading-log';
import { useDirection } from '@/i18n';
import { Icon } from '@/ui/icon';
import { useIsWide } from '@/ui/layout';
import { useReducedMotion } from '@/ui/motion';
import { Text } from '@/ui/text';
import { formatReaderNumber } from '../format';
import { HizbGauge } from './hizb-gauge';
import { ReadingSessionCard } from './reading-session-card';

/**
 * The last place the reader stopped, beside today's goal.
 *
 * The reading log is the durable record: it is the only thing that survives a
 * cold launch with the page the reader actually stopped on, because the reader
 * store's position is resolved when the mushaf's geometry attaches, which only
 * happens inside the reader. The band hydrates the log itself so the landing
 * page is a complete entry point on a fresh load, not only after a visit to the
 * reader.
 *
 * One row: the newest entry is the resume action — the card it shows is the
 * page it opens, carrying the whole recorded position (page, surah and, when
 * one was selected, ayah), so a tap restores that session — and the 2×2
 * gauge grid beside it reads how much of today's one-page goal is done in
 * the first cell, with three placeholder cells for future metrics. The card
 * is the only press target; the gauges are readouts, never buttons. The row
 * is physical LTR in both languages: nothing mirrors, and the text's own
 * direction comes from the `Text` primitive.
 *
 * The gauges are the small arcs (84pt, 104pt from `md`): the card stays the
 * section's anchor, and the caption under the first gauge names the goal the
 * same way the fraction would. The completion line mounts below the row when the
 * goal is done, keyed by day so its entrance runs once. With reduced motion
 * both entrances are simply there.
 *
 * The demo seed is history, never a position. While the log is the seed alone,
 * the card is labelled by the caption below it rather than by a heading that
 * claims the reader is on the seed's last page: a first-run install must not
 * claim its reader is sitting on An-Nas page 604.
 *
 * The band fades in once — a single entrance on the container. With no entry
 * yet it shows one quiet line instead of a labelled void, and no gauge: there
 * is nothing to count towards.
 *
 * Hairlines and borders, not shadow: the band closes with one border, and the
 * card's 1px border is the only elevation in the section.
 */
const DAILY_PAGES = 1;

export type ResumeBandProps = {
  /** Open the reader at the position the chosen session recorded. */
  onOpen: (entry: {
    page: number;
    surah: number;
    ayahKey: string | null;
  }) => void;
};

export function ResumeBand({ onOpen }: ResumeBandProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const wide = useIsWide();
  const reducedMotion = useReducedMotion();

  useHydrateReadingLog();
  const { entries, ready } = useReadingLog();

  const day = formatDateKey(new Date());
  const { read, target, done } = useDailyHizb(day, DAILY_PAGES);

  // The log is newest-first, so the first entry is the latest session. One
  // card only: an older session is not a resume action, and a row of them
  // crowded the smallest screen.
  const latest = entries[0] ?? null;
  const sample = hasSeedHistory(entries);

  const open = (entry: ReadingEntry) =>
    onOpen({ page: entry.page, surah: entry.surah, ayahKey: entry.ayahKey });

  return (
    <View
      testID="quran-resume-band"
      className="border-b border-border py-7 md:py-8"
    >
      <Text variant="overline" tone="muted">
        {t('quran.resume.recent')}
      </Text>

      {latest ? (
        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.duration(240)}
        >
          <View className="mt-4 flex-row items-center gap-3 md:gap-4">
            <ReadingSessionCard
              key={latest.day}
              entry={latest}
              compact
              latest
              className="w-full max-w-[150px] md:max-w-[168px]"
              onPress={() => open(latest)}
            />

            <View className="flex-1 items-center gap-2">
              <View className="flex-row justify-center gap-2 md:gap-3">
                <View testID="quran-mini-gauge" className="items-center gap-1">
                  <HizbGauge
                    value={read}
                    max={target}
                    size={wide ? 104 : 84}
                    strokeWidth={wide ? 10 : 9}
                    centerLabel={formatReaderNumber(read, language)}
                    accessibilityLabel={t('quran.goal.progress', {
                      read: formatReaderNumber(read, language),
                      target: formatReaderNumber(target, language),
                    })}
                  />
                  <Text variant="caption" tone="muted">
                    {t('quran.goal.title')}
                  </Text>
                </View>
                <View testID="quran-mini-gauge" className="items-center gap-1">
                  <HizbGauge
                    value={0}
                    max={1}
                    size={wide ? 104 : 84}
                    strokeWidth={wide ? 10 : 9}
                    centerLabel="–"
                    accessibilityLabel={t('quran.resume.soon')}
                  />
                  <Text variant="caption" tone="muted">
                    {t('quran.resume.soon')}
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-center gap-2 md:gap-3">
                <View testID="quran-mini-gauge" className="items-center gap-1">
                  <HizbGauge
                    value={0}
                    max={1}
                    size={wide ? 104 : 84}
                    strokeWidth={wide ? 10 : 9}
                    centerLabel="–"
                    accessibilityLabel={t('quran.resume.soon')}
                  />
                  <Text variant="caption" tone="muted">
                    {t('quran.resume.soon')}
                  </Text>
                </View>
                <View testID="quran-mini-gauge" className="items-center gap-1">
                  <HizbGauge
                    value={0}
                    max={1}
                    size={wide ? 104 : 84}
                    strokeWidth={wide ? 10 : 9}
                    centerLabel="–"
                    accessibilityLabel={t('quran.resume.soon')}
                  />
                  <Text variant="caption" tone="muted">
                    {t('quran.resume.soon')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {sample ? (
            <Text variant="caption" tone="muted" className="mt-3">
              {t('quran.resume.sample')}
            </Text>
          ) : null}
        </Animated.View>
      ) : ready ? (
        <Text variant="caption" tone="muted" className="mt-4">
          {t('quran.resume.empty')}
        </Text>
      ) : null}

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
 * `at` values move every run even when nothing else did.
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
