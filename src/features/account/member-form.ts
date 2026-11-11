import type { BackendAccount, BackendUser } from '@/api';
import type { UserRole } from '@/core/types';

/**
 * The member form's draft and rules.
 *
 * Pure, like the meeting form, so the same normalisation serves create and edit
 * and the rules are testable without a renderer. The server's own checks remain
 * the boundary; this module exists so the user hears about a bad password before
 * a round trip, not after one.
 */

/** Roles an administrator can assign through the accounts API. */
export const ASSIGNABLE_MEMBER_ROLES = [
  'user',
  'admin',
  'superadmin',
] as const satisfies readonly UserRole[];

export type MemberRole = (typeof ASSIGNABLE_MEMBER_ROLES)[number];

export type MemberDraft = {
  email: string;
  password: string;
  displayName: string;
  phoneNumber: string;
  role: MemberRole;
  disabled: boolean;
};

export type MemberField = 'email' | 'password' | 'displayName' | 'phoneNumber';

export type MemberErrorKey =
  | 'members.form.validation.email'
  | 'members.form.validation.password'
  | 'members.form.validation.displayName';

export type MemberErrors = Partial<Record<MemberField, MemberErrorKey>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/;

export function createEmptyMemberDraft(): MemberDraft {
  return {
    email: '',
    password: '',
    displayName: '',
    phoneNumber: '',
    role: 'user',
    disabled: false,
  };
}

export function toMemberDraft(account: BackendUser): MemberDraft {
  return {
    email: account.email,
    password: '',
    displayName: account.displayName ?? '',
    phoneNumber: account.phoneNumber ?? '',
    role:
      account.role === 'admin' || account.role === 'superadmin'
        ? account.role
        : 'user',
    disabled: account.disabled,
  };
}

export function validateMemberDraft(
  draft: MemberDraft,
  mode: 'create' | 'edit',
): MemberErrors {
  const errors: MemberErrors = {};

  if (mode === 'create' && !EMAIL.test(draft.email.trim())) {
    errors.email = 'members.form.validation.email';
  }

  if (mode === 'create' && !PASSWORD.test(draft.password)) {
    errors.password = 'members.form.validation.password';
  }

  const name = draft.displayName.trim();
  if (name.length > 0 && (name.length < 2 || name.length > 60)) {
    errors.displayName = 'members.form.validation.displayName';
  }

  return errors;
}

/** Empty strings become `null`: the server's nullable fields mean "cleared". */
function nullable(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export type CreateMemberInput = {
  email: string;
  password: string;
  displayName?: string;
  phoneNumber?: string | null;
  role: MemberRole;
};

export function toCreateMemberInput(draft: MemberDraft): CreateMemberInput {
  const displayName = nullable(draft.displayName);
  const phoneNumber = nullable(draft.phoneNumber);

  return {
    email: draft.email.trim().toLowerCase(),
    password: draft.password,
    ...(displayName === null ? {} : { displayName }),
    phoneNumber,
    role: draft.role,
  };
}

/**
 * Only what changed.
 *
 * A PATCH that repeats unchanged fields is harmless but not free: it makes the
 * server publish `account.updated` for a no-op and can trip the last-superadmin
 * guard with a role the user never touched.
 */
export type UpdateMemberPatch = {
  displayName?: string | null;
  phoneNumber?: string | null;
  role?: MemberRole;
  disabled?: boolean;
};

export function toUpdateMemberPatch(
  draft: MemberDraft,
  account: BackendUser,
): UpdateMemberPatch {
  const patch: UpdateMemberPatch = {};
  const displayName = nullable(draft.displayName);
  const phoneNumber = nullable(draft.phoneNumber);

  if (displayName !== (account.displayName ?? null)) {
    patch.displayName = displayName;
  }
  if (phoneNumber !== (account.phoneNumber ?? null)) {
    patch.phoneNumber = phoneNumber;
  }
  if (draft.role !== account.role) {
    patch.role = draft.role;
  }
  if (draft.disabled !== account.disabled) {
    patch.disabled = draft.disabled;
  }

  return patch;
}

export function isMemberDraftDirty(
  draft: MemberDraft,
  account: BackendUser,
): boolean {
  return Object.keys(toUpdateMemberPatch(draft, account)).length > 0;
}

/** A display name or email that reads well in a list row. */
export function memberName(account: BackendUser | BackendAccount): string {
  return account.displayName?.trim() || account.email;
}
