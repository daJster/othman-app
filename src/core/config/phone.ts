/**
 * International dialling prefixes offered on signup and profile forms.
 *
 * Keyed by ISO 3166-1 alpha-2 rather than by name, so callers match on the code
 * a user actually selects.
 */

import type { PhoneExtension } from './types';
import { defineConfig, defineTable } from './primitives';

/** Country codes this build ships, derived from the data. */
export type PhoneIso = keyof typeof phoneRows;

const phoneRows = {
  FR: { name: 'France', iso: 'FR', dialCode: '+33', flag: '🇫🇷' },
  MA: { name: 'Morocco', iso: 'MA', dialCode: '+212', flag: '🇲🇦' },
} satisfies Record<string, PhoneExtension>;
export const PHONE_EXTENSIONS = defineTable(phoneRows);

/** Options for a country picker, in display order. */
export const PHONE_EXTENSION_OPTIONS = defineConfig<readonly PhoneExtension[]>(
  PHONE_EXTENSIONS.ids.map((iso) => PHONE_EXTENSIONS.get(iso)),
);

export function getPhoneExtension(iso: string): PhoneExtension | undefined {
  return PHONE_EXTENSIONS.find(iso.toUpperCase());
}

/** Inverse of {@link getPhoneExtension}, for rendering a stored number. */
export function findPhoneExtensionByDialCode(
  dialCode: string,
): PhoneExtension | undefined {
  return PHONE_EXTENSION_OPTIONS.find(
    (extension) => extension.dialCode === dialCode,
  );
}
