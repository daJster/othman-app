import type { AccountData } from '../../types';

/**
 * Profile edit validation.
 *
 * Pure, so it runs under `tsconfig.core.json` and is tested without a renderer.
 * It returns **codes**, never sentences: `core` has no locale, and a string here
 * would either be English in an Arabic UI or a key that silently rots.
 *
 * Only the fields the user can edit are validated. Email and role are owned by
 * the backend (role) or by Firebase Auth (email), so a bad value there is not a
 * user mistake to report inline.
 */

export type ProfileDraft = {
  displayName: string;
  phoneNumber: string;
};

export type ProfileFieldError = 'required' | 'length' | 'invalid';

export type ProfileDraftErrors = Partial<
  Record<keyof ProfileDraft, ProfileFieldError>
>;

export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 60;

/**
 * E.164 in the loose sense the UI can enforce: a `+`, a country code and enough
 * digits. The exact country plan is not knowable offline, and a strict regex
 * would reject valid numbers from countries with variable-length plans.
 */
const PHONE_PATTERN = /^\+\d{8,15}$/;

/** Strip the separators people type; keep the leading `+`. */
export function normalizePhoneNumber(input: string): string {
  return input.replace(/[\s().-]/g, '');
}

export function validateProfileDraft(draft: ProfileDraft): ProfileDraftErrors {
  const errors: ProfileDraftErrors = {};

  const name = draft.displayName.trim();
  if (name.length === 0) {
    errors.displayName = 'required';
  } else if (
    name.length < DISPLAY_NAME_MIN_LENGTH ||
    name.length > DISPLAY_NAME_MAX_LENGTH
  ) {
    errors.displayName = 'length';
  }

  const phone = normalizePhoneNumber(draft.phoneNumber.trim());
  // Empty is valid: a phone number is optional, and `null` clears it.
  if (phone.length > 0 && !PHONE_PATTERN.test(phone)) {
    errors.phoneNumber = 'invalid';
  }

  return errors;
}

/** The draft a freshly opened form starts from. */
export function toProfileDraft(account: AccountData): ProfileDraft {
  return {
    displayName: account.displayName ?? '',
    phoneNumber: account.phoneNumber ?? '',
  };
}

/**
 * Whether saving would change anything.
 *
 * Compares normalized values, so typing a trailing space or reformatting a
 * phone number does not enable Save — pressing it would be a no-op write.
 */
export function isProfileDraftDirty(
  draft: ProfileDraft,
  account: AccountData,
): boolean {
  return (
    draft.displayName.trim() !== (account.displayName ?? '').trim() ||
    normalizePhoneNumber(draft.phoneNumber.trim()) !==
      normalizePhoneNumber((account.phoneNumber ?? '').trim())
  );
}
