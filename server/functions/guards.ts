import type { AuthContext, PublicUser, UserRole } from '../contracts.ts';
import { ApiError } from '../lib/errors.ts';
import type { FunctionContext } from './types.ts';

/**
 * Authorization guards.
 *
 * Role ordering is explicit rather than numeric so a new role cannot silently
 * inherit permissions by being appended to an array. `guest` is the absence of a
 * session; it is never assigned to a stored user.
 */

const ROLE_RANK: Record<Exclude<UserRole, 'guest'>, number> = {
  user: 1,
  admin: 2,
  superadmin: 3,
};

export function requireAuth(context: FunctionContext): AuthContext {
  if (!context.auth) {
    throw ApiError.unauthenticated();
  }

  return context.auth;
}

export function hasRole(user: PublicUser, role: UserRole): boolean {
  if (role === 'guest') return true;
  if (user.role === 'guest') return false;

  return ROLE_RANK[user.role] >= ROLE_RANK[role as Exclude<UserRole, 'guest'>];
}

export function requireRole(
  context: FunctionContext,
  role: Exclude<UserRole, 'guest'>,
): AuthContext {
  const auth = requireAuth(context);

  if (!hasRole(auth.user, role)) {
    throw ApiError.forbidden(`Requires the "${role}" role`);
  }

  return auth;
}

/** Self-service reads/writes are allowed for the owner; admin for everyone. */
export function requireSelfOrAdmin(
  context: FunctionContext,
  uid: string,
): AuthContext {
  const auth = requireAuth(context);

  if (auth.user.uid !== uid && !hasRole(auth.user, 'admin')) {
    throw ApiError.forbidden('You can only access your own account');
  }

  return auth;
}

export function isAdmin(user: PublicUser | null | undefined): boolean {
  return Boolean(user && hasRole(user, 'admin'));
}
