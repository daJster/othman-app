import type { Language } from '@/i18n';

/**
 * Reader labels.
 *
 * Numbers go through `Intl` so Arabic gets its own digits. The reader is the
 * one place where digits sit next to Arabic text constantly (page, ayah, surah
 * numbers), so this is shared rather than re-derived per component.
 */
export function formatReaderNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(language).format(value);
}

/**
 * `m:ss` for the audio progress labels.
 *
 * A missing or not-yet-known duration is `--:--`, not `00:00`: at boot the
 * duration is genuinely unknown, and showing zero would suggest a broken file.
 * Seconds are floored, because a label that jumps to `0:01` before playback
 * starts reads as a false start.
 */
export function formatAudioTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) {
    return '--:--';
  }

  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}
