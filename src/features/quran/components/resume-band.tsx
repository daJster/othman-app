import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { formatDateKey } from '@/core/domain/meetings/date-key';
import {
  DUAA_TARGET,
  isGoldenDay,
  NAFILA_TARGET,
  SALAH_TARGET,
} from '@/core/domain/practice/practice';
import type { ReadingEntry } from '@/core/domain/quran/reading-log';
import {
  useDailyHizb,
  useHydrateReadingLog,
  useReadingLog,
} from '@/features/quran/history/use-reading-log';
import { useDirection } from '@/i18n';
import { DuaaSheet } from '@/features/practice/duaa-sheet';
import { NafilaSheet } from '@/features/practice/nafila-sheet';
import { SalahDialog } from '@/features/practice/salah-dialog';
import { usePracticeDay } from '@/features/practice/use-practice-day';
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
 * one was selected, ayah), so a tap restores that session — and four metric
 * gauges beside it in centered 2×2 rows. Pages reads the reading log's daily
 * goal; the other three are the day's practice and are editable:
 *
 *  - Salah opens a dialog with one checkbox per prayer (gauge full at 5).
 *  - Duaa opens a sheet with one duaa and a hold-to-complete bar (gauge full
 *    at 3; the count may keep rising, cycling the deck).
 *  - Nafila opens a bottom sheet with a 0–30 number field (gauge full at 1).
 *  - Pages has no press target: it is the reading log's, not a manual entry.
 *
 * A gauge that reached its own target turns green; when all four are full the
 * day turns golden, every arc goes back to brass and the activity calendar
 * paints that day gold. Practice is stored per day and resets at 02:00 local
 * time (see `core/domain/practice`), so a late-night session still counts for
 * the day it belonged to. The row is physical LTR in both languages: nothing
 * mirrors, and the text's own direction comes from the `Text` primitive.
 *
 * The gauges are the small arcs (84pt, 104pt from `md`): the card stays the
 * section's anchor, and the caption under each gauge names its metric. The
 * completion line mounts below the row when the pages goal is done, keyed by
 * day so its entrance runs once. With reduced motion both entrances are
 * simply there.
 *
 * The demo seed is history, never a position: a first-run install must not
 * claim its reader is sitting on An-Nas page 604, so nothing here announces a
 * "current" page — the card simply names the last recorded session.
 *
 * The band fades in once — a single entrance on the container. With no entry
 * yet it shows one quiet line instead of a labelled void, and no gauge: there
 * is nothing to count towards.
 *
 * Hairlines and borders, not shadow: the card's 1px border is the only
 * elevation in the section.
 */
const DAILY_PAGES = 1;
/** The four gauges the summary ring counts. */
const PRACTICE_GAUGES = 4;

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
  const { width: windowWidth } = useWindowDimensions();

  useHydrateReadingLog();
  const { entries, ready } = useReadingLog();

  const day = formatDateKey(new Date());
  const { read, target, done } = useDailyHizb(day, DAILY_PAGES);
  const practice = usePracticeDay();
  const [salahOpen, setSalahOpen] = useState(false);
  const [duaaOpen, setDuaaOpen] = useState(false);
  const [nafilaOpen, setNafilaOpen] = useState(false);

  /*
   * Reading is the one gauge the reader cannot tick; it is the reading log's
   * daily hizb. It is mirrored into the practice row so the calendar can colour
   * a day without opening the reader's own history, and so goldenness is a
   * property of the stored day rather than of this screen's mount.
   */
  const pagesDone = done ? 1 : 0;

  useEffect(() => {
    if (!practice.ready || practice.entry.pages === pagesDone) {
      return;
    }

    practice.update({ pages: pagesDone });
  }, [pagesDone, practice.ready, practice.entry.pages, practice.update]);

  const golden = isGoldenDay({ ...practice.entry, pages: pagesDone });
  const filledCount = [
    pagesDone >= 1,
    practice.entry.salah >= SALAH_TARGET,
    practice.entry.duaa >= DUAA_TARGET,
    practice.entry.nafila >= NAFILA_TARGET,
  ].filter(Boolean).length;

  const gaugeTone = (filled: boolean) =>
    golden ? 'gold' : filled ? 'success' : 'brass';

  /*
   * The ring is a readout, not the section's mass. At 20pt it read as four
   * heavy discs; 14 keeps the arc legible at 130 and lets the empty middle do
   * the work. Phones get 9 on the smaller 115 ring, where 12 was crowding the
   * value it surrounds.
   */
  const gaugeStroke = wide ? 14 : 9;

  /*
   * Four gauges across a phone. The diameter comes from the width the strip
   * actually has (page gutters + three 4px gaps), clamped so a narrow device
   * never overflows and a wide one still reads as "big":
   *   390 → 86px, 375 → 82px, 360 → 79px, 320 → 69px.
   */
  const phoneGaugeSize = Math.min(
    88,
    Math.max(64, Math.floor((windowWidth - 44) / 4)),
  );
  const phoneGaugeStroke = Math.max(7, Math.round(phoneGaugeSize * 0.1));

  // The log is newest-first, so the first entry is the latest session. One
  // card only: an older session is not a resume action, and a row of them
  // crowded the smallest screen.
  const latest = entries[0] ?? null;

  const open = (entry: ReadingEntry) =>
    onOpen({ page: entry.page, surah: entry.surah, ayahKey: entry.ayahKey });

  // On a phone the four gauges sit in one strip above the card; from `wide`
  // they keep the 2×2 block beside it. One definition, two arrangements.
  const gaugeNodes = {
    pages: (
      <PracticeGauge
        id="pages"
        label={t('quran.resume.metrics.pages')}
        value={read}
        max={target}
        size={wide ? 130 : phoneGaugeSize}
        strokeWidth={wide ? gaugeStroke : phoneGaugeStroke}
        language={language}
        tone={gaugeTone(read >= target)}
      />
    ),
    salah: (
      <PracticeGauge
        id="salah"
        label={t('quran.resume.metrics.salat')}
        value={practice.entry.salah}
        max={SALAH_TARGET}
        size={wide ? 130 : phoneGaugeSize}
        strokeWidth={wide ? gaugeStroke : phoneGaugeStroke}
        language={language}
        tone={gaugeTone(practice.entry.salah >= SALAH_TARGET)}
        onPress={() => setSalahOpen(true)}
      />
    ),
    duaa: (
      <PracticeGauge
        id="duaa"
        label={t('quran.resume.metrics.duaa')}
        value={practice.entry.duaa}
        max={DUAA_TARGET}
        size={wide ? 130 : phoneGaugeSize}
        strokeWidth={wide ? gaugeStroke : phoneGaugeStroke}
        language={language}
        tone={gaugeTone(practice.entry.duaa >= DUAA_TARGET)}
        repeatable
        onPress={() => setDuaaOpen(true)}
      />
    ),
    nafila: (
      <PracticeGauge
        id="nafila"
        label={t('quran.resume.metrics.nafila')}
        value={practice.entry.nafila}
        max={NAFILA_TARGET}
        size={wide ? 130 : phoneGaugeSize}
        strokeWidth={wide ? gaugeStroke : phoneGaugeStroke}
        language={language}
        tone={gaugeTone(practice.entry.nafila >= NAFILA_TARGET)}
        repeatable
        onPress={() => setNafilaOpen(true)}
      />
    ),
  };

  return (
    <View testID="quran-resume-band" className="py-7 md:py-8">
      <Text variant="overline" tone="muted">
        {t('quran.resume.recent')}
      </Text>

      {latest ? (
        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.duration(240)}
        >
          {wide ? (
            <View className="mt-4 flex-row items-center gap-6 md:gap-8">
              <ReadingSessionCard
                key={latest.day}
                entry={latest}
                compact
                latest
                className="w-full max-w-44 md:max-w-48"
                onPress={() => open(latest)}
              />

              <View className="flex-1 items-center gap-2">
                <View className="flex-row justify-center gap-3">
                  {gaugeNodes.pages}
                  {gaugeNodes.salah}
                </View>
                <View className="flex-row justify-center gap-3">
                  {gaugeNodes.duaa}
                  {gaugeNodes.nafila}
                </View>
              </View>
            </View>
          ) : (
            <View className="mt-4 gap-4">
              {/* Gauges first, one strip of four. */}
              <View className="flex-row items-start justify-between gap-1">
                {gaugeNodes.pages}
                {gaugeNodes.salah}
                {gaugeNodes.duaa}
                {gaugeNodes.nafila}
              </View>

              {/* The page becomes landscape on a phone: wide and compact. */}
              <ReadingSessionCard
                key={latest.day}
                entry={latest}
                compact
                latest
                className="w-full"
                aspectRatio={1.7}
                onPress={() => open(latest)}
              />
            </View>
          )}
        </Animated.View>
      ) : ready ? (
        <Text variant="caption" tone="muted" className="mt-4">
          {t('quran.resume.empty')}
        </Text>
      ) : null}

      {/*
       * One summary row, not two completion lines: a tiny 0–4 gauge that counts
       * how many of the four fill, and a single caption that changes from the
       * count to the golden sentence when the fourth lands.
       */}
      <Animated.View
        key={`summary-${filledCount}`}
        entering={reducedMotion ? undefined : FadeIn.duration(240)}
        testID="practice-summary"
        className="mt-5 flex-row items-center gap-2.5"
      >
        <View style={{ width: 30, height: 30 }}>
          <HizbGauge
            value={filledCount}
            max={PRACTICE_GAUGES}
            size={30}
            strokeWidth={3}
            tone={golden ? 'gold' : 'white'}
          />
          {/* The check belongs to the full ring only: gold inside gold. */}
          {golden ? (
            <View
              pointerEvents="none"
              className="absolute inset-0 items-center justify-center"
            >
              <Icon name="check" size={12} tone="brass" />
            </View>
          ) : null}
        </View>
        <Text
          variant="caption"
          className={golden ? 'text-brass-ink' : undefined}
          tone={golden ? undefined : 'muted'}
        >
          {golden
            ? t('practice.golden')
            : t('practice.summary', {
                done: filledCount,
                target: PRACTICE_GAUGES,
              })}
        </Text>
      </Animated.View>

      <SalahDialog
        open={salahOpen}
        onOpenChange={setSalahOpen}
        value={practice.entry.salah}
        onSave={(salah) => practice.update({ salah })}
      />

      <NafilaSheet
        open={nafilaOpen}
        onOpenChange={setNafilaOpen}
        value={practice.entry.nafila}
        onSave={(nafila) => practice.update({ nafila })}
      />

      <DuaaSheet
        open={duaaOpen}
        onOpenChange={setDuaaOpen}
        value={practice.entry.duaa}
        onComplete={() => {
          practice.update({ duaa: practice.entry.duaa + 1 });
        }}
      />
    </View>
  );
}

/**
 * One gauge, as a control.
 *
 * The ring and its caption are one press target, so the label is never a place
 * the pointer falls through. `pages` passes no `onPress` and stays a readout.
 */
function PracticeGauge({
  id,
  label,
  value,
  max,
  size,
  strokeWidth,
  language,
  tone,
  onPress,
  repeatable = false,
}: {
  id: 'pages' | 'salah' | 'duaa' | 'nafila';
  label: string;
  value: number;
  max: number;
  size: number;
  strokeWidth: number;
  language: 'ar' | 'en';
  tone: 'brass' | 'success' | 'gold';
  onPress?: () => void;
  /** Values that may pass the target (duaa, nafila) announce a plain count. */
  repeatable?: boolean;
}) {
  const { t } = useTranslation();
  const read = formatReaderNumber(value, language);
  const target = formatReaderNumber(max, language);

  return (
    <Pressable
      testID={`practice-gauge-${id}`}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={
        // Repeatable gauges read as a count: "Duaa: 7", never "7 of 3".
        max === 1 || repeatable
          ? t('quran.resume.metrics.value', { label, read })
          : t('quran.resume.metrics.progress', { label, read, target })
      }
      onPress={onPress}
      disabled={!onPress}
      className="items-center gap-1 rounded-full active:opacity-80"
    >
      <HizbGauge
        value={value}
        max={max}
        size={size}
        strokeWidth={strokeWidth}
        tone={tone}
        centerLabel={read}
        accessibilityLabel={undefined}
      />
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </Pressable>
  );
}
