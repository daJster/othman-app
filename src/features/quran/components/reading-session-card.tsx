import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import type { ReadingEntry } from '@/core/domain/quran/reading-log';
import { useDirection } from '@/i18n';
import { cn } from '@/ui/cn';
import { Pressable } from '@/ui/pressable';
import { Text } from '@/ui/text';
import { formatReaderNumber } from '../format';

/**
 * One recorded reading session, as a card.
 *
 * The page is the headline because it is what a reader recognises; the surah
 * names the place, and the third line either points at the selected ayah or
 * says how long ago the session was. The card is a single `Pressable`: it names
 * the whole position, so a tap anywhere on it should open exactly that
 * position, not the card's page alone.
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

export function ReadingSessionCard({
  entry,
  latest,
  className,
  onPress,
}: ReadingSessionCardProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  // A relative label is a statement about "now", so the clock is read once per
  // mount. Re-reading it on every render would make the card's text change for
  // reasons outside its data; reading it during render is what React's purity
  // rule forbids, hence the lazy state initializer.
  const [now] = useState(() => Date.now());

  const page = formatReaderNumber(entry.page, language);
  const surah = t('pages.account.progress.surah', {
    number: formatReaderNumber(entry.surah, language),
  });
  const supporting = entry.ayahKey
    ? t('quran.resume.ayahLabel', {
        ayah: formatReaderNumber(Number(entry.ayahKey), language),
      })
    : relativeDay(entry.at, now, t);

  // The visible labels already carry their own unit ("Page", "Surah", "Ayah"),
  // so the spoken name is the three of them, in reading order, rather than a
  // fourth sentence assembled from fragments.
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
        <Text variant="label">{surah}</Text>
        <Text variant="caption" tone="muted">
          {supporting}
        </Text>
      </View>
    </Pressable>
  );
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
