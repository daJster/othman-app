import { QueryClientContext } from '@tanstack/react-query';
import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import type { ReadingEntry } from '@/core/domain/quran/reading-log';
import type { SurahMetadata } from '@/core/types';
import { useDirection } from '@/i18n';
import { cn } from '@/ui/cn';
import { Pressable } from '@/ui/pressable';
import { Text } from '@/ui/text';
import { formatReaderNumber } from '../format';
import { useQuranCatalog } from '../use-quran-catalog';

/**
 * One recorded reading session, as a card.
 *
 * The page is the headline because it is what a reader recognises; the surah
 * names the place, and the third line either points at the selected ayah or
 * says how long ago the session was. The card is a single `Pressable`: it names
 * the whole position, so a tap anywhere on it should open exactly that
 * position, not the card's page alone.
 *
 * The surah is named from the catalog the mushaf itself uses, so the card can
 * never disagree with the reader about where a page belongs. Until that payload
 * arrives — or on a surface composed without the app's query tree, which is what
 * a unit test is — the card falls back to the surah's number rather than
 * showing a gap.
 *
 * The newest session is the resume action, so it is the one lifted surface in
 * the band: a brass hairline and the secondary fill. The other two sit on the
 * card colour with an ordinary border. The border is also the elevation — a
 * shadow here would compete with the band's hairline, so there is none.
 *
 * Hover is a web affordance only; native has no pointer to hover with. Nothing
 * mirrors: in both languages the page sits at the top and the labels below it,
 * and the text's own alignment comes from the `Text` primitive.
 */
export type ReadingSessionCardProps = {
  entry: ReadingEntry;
  /** The newest session: the resume action, drawn with the brass border. */
  latest: boolean;
  /** Sizing from the row: a fixed width on a phone, `flex-1` from `md`. */
  className?: string;
  onPress: () => void;
};

export function ReadingSessionCard(props: ReadingSessionCardProps) {
  const client = useContext(QueryClientContext);

  // A band may be composed without the app's query tree; without a client there
  // is no catalog to read, which is the same not-loaded branch as a cold fetch.
  if (!client) {
    return <ReadingSessionCardView {...props} metadata={null} />;
  }

  return <ReadingSessionCardContent {...props} />;
}

function ReadingSessionCardContent(props: ReadingSessionCardProps) {
  const catalog = useQuranCatalog();
  const metadata =
    catalog.state.status === 'ready'
      ? (catalog.state.data.surahs[String(props.entry.surah)] ?? null)
      : null;

  return <ReadingSessionCardView {...props} metadata={metadata} />;
}

type ReadingSessionCardViewProps = ReadingSessionCardProps & {
  /** `null` while the catalog is unavailable: name the number, not a gap. */
  metadata: SurahMetadata | null;
};

function ReadingSessionCardView({
  entry,
  latest,
  className,
  onPress,
  metadata,
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
   * The card therefore never prints an absolute Quran-wide index; the label is
   * the language's own word for ayah, with the number in that language's
   * digits.
   */
  const supporting = entry.ayahKey
    ? t('quran.resume.ayahLabel', {
        ayah: formatReaderNumber(Number(entry.ayahKey), language),
      })
    : relativeDay(entry.at, now, t);

  // The visible labels already carry their own unit ("Page", "Ayah"), so the
  // spoken name is those plus the surah, in reading order, rather than a fourth
  // sentence assembled from fragments.
  const label = [t('quran.resume.pageLabel', { page }), surah, supporting].join(
    ' · ',
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      dataSet={{ latest }}
      onPress={onPress}
      testID="quran-session-card"
      className={cn(
        'min-h-[88px] justify-between gap-2 rounded-xl border p-3 active:opacity-70',
        latest ? 'border-brass/60 bg-secondary' : 'border-border bg-card',
        // Border only: the hairline is the affordance, not a shadow or a lift.
        Platform.select({
          web: cn(
            'transition-colors',
            latest ? 'hover:border-brass' : 'hover:border-brass/50',
          ),
        }),
        className,
      )}
    >
      <Text variant="title" className="text-3xl leading-none tabular-nums">
        {page}
      </Text>

      <View className="gap-0.5">
        <Text className="text-xl font-semibold">{surah}</Text>
        <Text variant="caption" tone="muted">
          {supporting}
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
