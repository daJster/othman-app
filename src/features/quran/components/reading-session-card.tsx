import { QueryClientContext } from '@tanstack/react-query';
import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReadingEntry } from '@/core/domain/quran/reading-log';
import { isPageInEdition, quranPageImageUrl } from '@/core/domain/quran/page';
import type { QuranEdition, SurahMetadata } from '@/core/types';
import { useDirection } from '@/i18n';
import { cn } from '@/ui/cn';
import { Image } from '@/ui/image';
import { Pressable } from '@/ui/pressable';
import { Text } from '@/ui/text';
import { formatReaderNumber } from '../format';
import { useQuranCatalog } from '../use-quran-catalog';

/**
 * One recorded reading session, as a compact image card.
 *
 * Portrait 3:4: the mushaf page scan sits behind everything, and all text
 * lives at the physical left-bottom over a black scrim so it stays legible in
 * both languages. The card is a single `Pressable`: it names the whole
 * position, so a tap anywhere on it should open exactly that position, not the
 * card's page alone.
 *
 * The surah is named from the catalog the mushaf itself uses, so the card can
 * never disagree with the reader about where a page belongs. Until that payload
 * arrives — or on a surface composed without the app's query tree, which is what
 * a unit test is — the card falls back to the surah's number rather than
 * showing a gap. The scan comes from the same catalog: the entry's edition when
 * it is attached, otherwise no photo and the canopy field shows through.
 *
 * The card is the resume action, so it carries the brass hairline that marks
 * it. The border is also the elevation — a shadow here would compete with the
 * band's hairline, so there is none.
 *
 * Hover is a web affordance only; native has no pointer to hover with. Nothing
 * mirrors: in both languages the text sits at the physical left-bottom, and
 * the text's own direction comes from the `Text` primitive.
 */
export type ReadingSessionCardProps = {
  entry: ReadingEntry;
  /** The newest session: the resume action, drawn with the brass border. */
  latest: boolean;
  /** Sizing from the row: a fixed width on a phone, `flex-1` from `md`. */
  className?: string;
  /** Denser type and padding when the card sits beside the gauge. */
  compact?: boolean;
  onPress: () => void;
};

export function ReadingSessionCard(props: ReadingSessionCardProps) {
  const client = useContext(QueryClientContext);

  // A band may be composed without the app's query tree; without a client there
  // is no catalog to read, which is the same not-loaded branch as a cold fetch.
  if (!client) {
    return <ReadingSessionCardView {...props} metadata={null} edition={null} />;
  }

  return <ReadingSessionCardContent {...props} />;
}

function ReadingSessionCardContent(props: ReadingSessionCardProps) {
  const catalog = useQuranCatalog();
  if (catalog.state.status !== 'ready') {
    return <ReadingSessionCardView {...props} metadata={null} edition={null} />;
  }
  const metadata = catalog.state.data.surahs[String(props.entry.surah)] ?? null;
  const edition =
    catalog.state.data.editions[props.entry.editionKey ?? ''] ?? null;

  return (
    <ReadingSessionCardView {...props} metadata={metadata} edition={edition} />
  );
}

type ReadingSessionCardViewProps = ReadingSessionCardProps & {
  /** `null` while the catalog is unavailable: name the number, not a gap. */
  metadata: SurahMetadata | null;
  /** `null` while the catalog is unavailable: no photo, canopy shows through. */
  edition: QuranEdition | null;
};

function ReadingSessionCardView({
  entry,
  latest,
  className,
  compact = false,
  onPress,
  metadata,
  edition,
}: ReadingSessionCardViewProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  // A relative label is a statement about "now", so the clock is read once per
  // mount. Re-reading it on every render would make the card's text change for
  // reasons outside its data; reading it during render is what React's purity
  // rule forbids, hence the lazy state initializer.
  const [now] = useState(() => Date.now());

  const page = formatReaderNumber(entry.page, language);
  const surah = surahLabel(entry.surah, metadata, language, t);
  /*
   * `ayahKey` is the ayah *within its surah* — the bbox tables are keyed that
   * way (`byPage[page][ayahKey]`), and a shared link carries the same number.
   * The card therefore never prints an absolute Quran-wide index: the label is
   * the language's own word for ayah, with the number in that language's
   * digits.
   */
  const supporting = entry.ayahKey
    ? t('quran.resume.ayahLabel', {
        ayah: formatReaderNumber(Number(entry.ayahKey), language),
      })
    : relativeDay(entry.at, now, t);
  // "Page" travels through the locale, never hardcoded: "Page 12" / "صفحة ١٢".
  const pageLine = t('quran.resume.pageLabel', { page });

  // The visible labels already carry their own unit ("Page", "Ayah"), so the
  // spoken name is those plus the surah, in reading order, rather than a fourth
  // sentence assembled from fragments.
  const label = [pageLine, surah, supporting].join(' · ');
  const imageUrl =
    edition && isPageInEdition(edition, entry.page)
      ? quranPageImageUrl(edition, entry.page)
      : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      dataSet={{ latest }}
      onPress={onPress}
      testID="quran-session-card"
      className={cn(
        'relative justify-end overflow-hidden rounded-xl border active:opacity-70',
        latest ? 'border-brass/60' : 'border-border',
        // Border only: the hairline is the affordance, not a shadow or a lift.
        Platform.select({
          web: cn(
            'transition-colors',
            latest ? 'hover:border-brass' : 'hover:border-brass/50',
          ),
        }),
        className,
      )}
      style={{ aspectRatio: 3 / 4 }}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
          accessible={false}
        />
      ) : (
        <View className="absolute inset-0 bg-canopy" />
      )}

      {/*
       * Ink at the bottom only: the gradient lifts the left-bottom text off
       * any scan behind it. The top stays clear so the page itself shows.
       */}
      <LinearGradient
        colors={['rgba(3,10,7,0)', 'rgba(3,10,7,0.82)']}
        locations={[0.42, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View className={compact ? 'gap-0.5 p-3' : 'gap-0.5 p-4'}>
        <Text
          className={
            compact
              ? 'text-lg leading-snug font-semibold text-parchment'
              : 'text-2xl leading-snug font-semibold text-parchment'
          }
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {surah}
        </Text>
        <Text
          className={
            compact
              ? 'text-xs font-medium text-parchment tabular-nums'
              : 'text-sm font-medium text-parchment tabular-nums'
          }
        >
          {pageLine} · {supporting}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * The surah's own name from the catalog, in the interface language.
 *
 * Falls back to "Surah 12" while the payload is unavailable: the number is
 * always true, the name is only true once the catalog has told us which page
 * belongs to which surah.
 */
function surahLabel(
  surah: number,
  metadata: SurahMetadata | null,
  language: 'ar' | 'en',
  t: ReturnType<typeof useTranslation>['t'],
): string {
  if (metadata === null) {
    return t('pages.account.progress.surah', {
      number: formatReaderNumber(surah, language),
    });
  }

  return language === 'ar' ? metadata.name : metadata.nameEnglish;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole local calendar days between a past timestamp and now.
 *
 * Calendar days, not 24-hour windows: a reading at 20:00 yesterday still reads
 * as "yesterday" at 09:00 today. `Math.round` absorbs the hour a DST boundary
 * adds or removes, and a clock that runs backwards reads as today rather than
 * as a negative age.
 */
function daysAgo(at: number, now: number): number {
  return Math.max(0, Math.round((startOfDay(now) - startOfDay(at)) / DAY_MS));
}

function startOfDay(at: number): number {
  const date = new Date(at);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

type Translate = ReturnType<typeof useTranslation>['t'];

function relativeDay(at: number, now: number, t: Translate): string {
  const days = daysAgo(at, now);

  if (days === 0) return t('quran.resume.time.today');
  if (days === 1) return t('quran.resume.time.yesterday');

  return t('quran.resume.time.days', { count: days });
}
