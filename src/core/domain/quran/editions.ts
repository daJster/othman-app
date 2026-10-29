import type { QuranEdition } from '../../types/quran';
import { QuranDataError } from './errors';

/**
 * Edition lookup.
 *
 * A stored `editionKey` can outlive the edition it names: the app is updated,
 * the CDN drops a riwaya, or a value is copied between devices. Falling back to
 * the first edition is what keeps a stale preference from producing a blank
 * reader on launch.
 */

/** The edition an unknown key should fall back to. */
export function resolveEditionKey(
  editions: Record<string, QuranEdition>,
  preferred?: string | null,
): string | undefined {
  if (preferred && editions[preferred]) return preferred;

  return Object.keys(editions)[0];
}

/**
 * The edition for a key that came from the app itself.
 *
 * Throws `QuranDataError` instead of returning `undefined`: callers reach this
 * only after resolving a key against the catalog, so a miss is a programming
 * error that should not be papered over with a default.
 */
export function requireEdition(
  editions: Record<string, QuranEdition>,
  key: string,
): QuranEdition {
  const edition = editions[key];

  if (!edition) {
    throw new QuranDataError('editions', `unknown edition "${key}"`);
  }

  return edition;
}
