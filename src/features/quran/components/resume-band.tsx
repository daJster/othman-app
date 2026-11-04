import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { ReadingEntry } from '@/core/domain/quran/reading-log';
import { SEED_READING_LOG } from '@/features/quran/history/seed';
import {
  useHydrateReadingLog,
  useReadingLog,
} from '@/features/quran/history/use-reading-log';
import { useIsWide } from '@/ui/layout';
import { useReducedMotion } from '@/ui/motion';
import { Text } from '@/ui/text';
import { ReadingSessionCard } from './reading-session-card';

/**
 * The last three places the reader stopped.
 *
 * The reading log is the durable record: it is the only thing that survives a
 * cold launch with the page the reader actually stopped on, because the reader
 * store's position is resolved when the mushaf's geometry attaches, which only
 * happens inside the reader. The band hydrates the log itself so the landing
 * page is a complete entry point on a fresh load, not only after a visit to the
 * reader.
 *
 * There is no separate "current position" block any more. Three sessions sit in
 * one row, newest first, and the first card is the resume action: the page it
 * shows is the page it opens. Each card carries the whole recorded position
 * (page, surah and, when one was selected, ayah), so a tap restores that
 * session rather than only its page.
 *
 * The demo seed is history, never a position. While the log is the seed alone,
 * the cards are labelled by the caption below them rather than by a heading
 * that claims the reader is on the seed's last page: a first-run install must
 * not claim its reader is sitting on An-Nas page 604.
 *
 * One rail on a phone, three equal columns from `md`. The phone rail is a
 * horizontal `ScrollView` so the cards keep a readable width instead of
 * squeezing three columns into 320px; the first card is fully visible without
 * scrolling, and nothing overflows the page itself. The row fades in once —
 * a single entrance on the container, no per-card stagger — and with reduced
 * motion it is simply there.
 *
 * Hairlines and borders, not shadow: the band closes with one border, and the
 * cards' 1px borders are the only elevation in the section.
 */
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
  const reducedMotion = useReducedMotion();
  const wide = useIsWide();

  useHydrateReadingLog();
  const { entries } = useReadingLog();

  // The log is newest-first, so the three newest sessions are its first three
  // entries. A short log shows fewer cards; duplicating the only entry to fill
  // the row would pretend to a history the reader does not have.
  const recent = entries.slice(0, 3);
  const sample = hasSeedHistory(entries);

  const open = (entry: ReadingEntry) =>
    onOpen({ page: entry.page, surah: entry.surah, ayahKey: entry.ayahKey });

  const cards = recent.map((entry, index) => (
    <ReadingSessionCard
      key={entry.day}
      entry={entry}
      latest={index === 0}
      className={wide ? 'flex-1' : 'w-[150px]'}
      onPress={() => open(entry)}
    />
  ));

  return (
    <View
      testID="quran-resume-band"
      className="border-b border-border py-7 md:py-8"
    >
      <Text variant="overline" tone="muted">
        {t('quran.resume.recent')}
      </Text>

      {recent.length > 0 ? (
        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.duration(240)}
          className="mt-4"
        >
          {wide ? (
            <View className="flex-row gap-4">{cards}</View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-3"
            >
              {cards}
            </ScrollView>
          )}

          {sample ? (
            <Text variant="caption" tone="muted" className="pt-3">
              {t('quran.resume.sample')}
            </Text>
          ) : null}
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
