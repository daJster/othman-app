import type { UserRole } from '@/core/types';

/**
 * Role labels.
 *
 * A literal map, not a template string: `t()` is typed against the locale, so a
 * computed `account.role.${role}` would type-check as an arbitrary string and
 * fail only at runtime. `satisfies` makes the map exhaustive over `UserRole`.
 *
 * `null` is not a role the user chose — it means the profile document has not
 * been provisioned yet. It is shown as the least privileged label rather than
 * inventing a "no role" state the backend does not have.
 */
const ROLE_LABEL_KEYS = {
  guest: 'account.role.guest',
  user: 'account.role.user',
  admin: 'account.role.admin',
  superadmin: 'account.role.superadmin',
} as const satisfies Record<UserRole, string>;

export type RoleLabelKey = (typeof ROLE_LABEL_KEYS)[UserRole];

export function roleLabelKey(role: UserRole | null | undefined): RoleLabelKey {
  return ROLE_LABEL_KEYS[role ?? 'guest'];
}

/** Roles an administrator can assign. Array order is menu order. */
export const ASSIGNABLE_ROLES = [
  'guest',
  'user',
  'admin',
  'superadmin',
] as const satisfies readonly UserRole[];

export function canEditRoles(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'superadmin';
}
