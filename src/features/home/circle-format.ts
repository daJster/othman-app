import type { TFunction } from 'i18next';
import { parseDateKey } from '@/core/domain/meetings/date-key';
import type { Language } from '@/i18n';
import type { CircleItem, Localized, NoticeTopic } from '@/services/circle';
import { daysAway } from './circle-projection';

/**
 * Display strings for the circle rows.
 *
 * Numbers, weekdays and clock times go through `Intl` for the same reason the
 * progress screen does: Arabic needs its own digits and its own weekday names,
 * and appending a Latin "18:00" would read as a foreign token inside Arabic
 * copy. Display only — the model keeps `HH:mm` and `YYYY-MM-DD`.
 */

type Translate = TFunction<'common'>;

export function pickLocalized(
  value: Localized | null,
  language: Language,
): string {
  if (!value) return '';

  return language === 'ar' ? value.ar : value.en;
}

export function formatCount(value: number, language: Language): string {
  return new Intl.NumberFormat(language).format(value);
}

/** `18:00` → the language's clock reading. */
export function formatTime(
  time: string | null,
  language: Language,
): string | null {
  if (!time) return null;

  const [hours, minutes] = time.split(':').map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;

  const anchor = new Date(2000, 0, 1, hours, minutes);

  return new Intl.DateTimeFormat(language, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(anchor);
}

/** Today / tomorrow / weekday, per the row's distance from today. */
export function formatDay(
  item: CircleItem,
  language: Language,
  now: Date,
  t: Translate,
): string {
  const away = daysAway(item, now);

  if (away === null) return '';
  if (away === 0) return t('home.rail.today');
  if (away === 1) return t('home.rail.tomorrow');

  if (item.date) {
    return new Intl.DateTimeFormat(language, { weekday: 'long' }).format(
      parseDateKey(item.date),
    );
  }

  return '';
}

/** `Today · 6:00 PM`, the rail row's time line. */
export function formatWhen(
  item: CircleItem,
  language: Language,
  now: Date,
  t: Translate,
): string {
  const day = formatDay(item, language, now, t);
  const time = formatTime(item.time, language);

  return [day, time].filter(Boolean).join(' · ');
}

/** `In 5 days` for the exam row. */
export function formatCountdown(
  item: CircleItem,
  language: Language,
  now: Date,
  t: Translate,
): string {
  const away = daysAway(item, now);

  if (away === null) return '';
  if (away === 0) return t('home.rail.today');
  if (away === 1) return t('home.rail.tomorrow');

  return t('home.rail.inDays', { days: formatCount(away, language) });
}

/** The overline for a notice, by who wrote it. */
export function topicLabel(topic: NoticeTopic, t: Translate): string {
  switch (topic) {
    case 'shaykh':
      return t('home.news.shaykh');
    case 'halqa':
      return t('home.news.halqa');
    default:
      return t('home.news.app');
  }
}
