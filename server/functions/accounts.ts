import { randomUUID } from 'node:crypto';
import type { AccountRecord, ProfileDocument, UserRole } from '../contracts.ts';
import { ApiError } from '../lib/errors.ts';
import { hashPassword } from '../lib/password.ts';
import {
  asObject,
  optionalBoolean,
  optionalEnum,
  optionalNullableString,
  optionalString,
  parseLimit,
  parseOffset,
  requiredEmail,
  requiredPassword,
} from '../lib/validation.ts';
import {
  createSessionsRepository,
  createUsersRepository,
  isUserRole,
  toPublicUser,
  type UserRow,
} from '../repositories/users.ts';
import {
  ensureProfile,
  readProfile,
  removeProfile,
  writeProfile,
} from '../stores/profiles.ts';
import { hasRole, isAdmin, requireAuth, requireRole } from './guards.ts';
import { created, defineFunction, noContent, ok } from './types.ts';
import type { FunctionContext, FunctionResult } from './types.ts';

/**
 * Account CRUD + authorization.
 *
 * Rules, all enforced here so every transport inherits them:
 *
 *  - a user reads and updates their own account; admins read/update anyone;
 *  - only admins may list accounts or create one with a role;
 *  - `role` and `disabled` are admin-only fields — a self-update that includes
 *    them is rejected rather than silently ignored;
 *  - deleting a superadmin, or the last superadmin, requires care: admins can
 *    only delete ordinary users, superadmins can delete anyone but themselves.
 */

function toAccount(
  row: UserRow,
  documents: FunctionContext['documents'],
): AccountRecord {
  return {
    ...toPublicUser(row),
    profile: readProfile(documents, row.id),
  };
}

function profilePatchFrom(body: Record<string, unknown>): {
  bio?: string | null;
  locale?: 'ar' | 'en';
  notifications?: boolean;
} | null {
  if (body.profile === undefined) return null;

  const profile = asObject(body.profile, 'profile');
  const bio = optionalNullableString(profile, 'bio', { max: 500 });
  const locale = optionalEnum(profile, 'locale', ['ar', 'en'] as const);
  const notifications = optionalBoolean(profile, 'notifications');

  return {
    ...(bio === undefined ? {} : { bio }),
    ...(locale === undefined ? {} : { locale }),
    ...(notifications === undefined ? {} : { notifications }),
  };
}

const list = defineFunction((event, context): FunctionResult => {
  requireRole(context, 'admin');
  const users = createUsersRepository(context.db);
  const roleParam = event.query.role;

  if (roleParam !== undefined && !isUserRole(roleParam)) {
    throw ApiError.invalid(`Unknown role "${roleParam}"`);
  }

  const { rows, total } = users.list({
    role: roleParam,
    q: event.query.q,
    limit: parseLimit(event.query),
    offset: parseOffset(event.query),
  });

  return ok({
    accounts: rows.map((row) => toPublicUser(row)),
    total,
  });
});

const get = defineFunction((event, context): FunctionResult => {
  const uid = event.params.uid;
  if (!uid) throw ApiError.invalid('Missing account id');

  const auth = requireAuth(context);
  if (auth.user.uid !== uid && !isAdmin(auth.user)) {
    throw ApiError.forbidden('You can only read your own account');
  }

  const users = createUsersRepository(context.db);
  const row = users.findById(uid);
  if (!row) throw ApiError.notFound('Account does not exist');

  return ok({ account: toAccount(row, context.documents) });
});

const me = defineFunction((event, context): FunctionResult => {
  const auth = requireAuth(context);
  const users = createUsersRepository(context.db);
  const row = users.findById(auth.user.uid);

  if (!row) throw ApiError.notFound('Account does not exist');

  return ok({ account: toAccount(row, context.documents) });
});

const meUpdate = defineFunction((event, context): FunctionResult => {
  const auth = requireAuth(context);
  const body = asObject(event.body);

  if (body.role !== undefined || body.disabled !== undefined) {
    throw ApiError.forbidden('You cannot change your own role or status');
  }

  const users = createUsersRepository(context.db);
  const displayName = optionalNullableString(body, 'displayName', { max: 120 });
  const photoURL = optionalNullableString(body, 'photoURL', { max: 2048 });
  const phoneNumber = optionalNullableString(body, 'phoneNumber', { max: 40 });

  const updated = users.update(auth.user.uid, {
    displayName,
    photoURL,
    phoneNumber,
  });

  if (!updated) throw ApiError.notFound('Account does not exist');

  const patch = profilePatchFrom(body);
  if (patch) writeProfile(context.documents, auth.user.uid, patch);

  context.events.publish('account.updated', { uid: auth.user.uid });

  return ok({ account: toAccount(updated, context.documents) });
});

const create = defineFunction((event, context): FunctionResult => {
  const auth = requireRole(context, 'admin');
  const body = asObject(event.body);
  const email = requiredEmail(body);
  const password = requiredPassword(body);
  const displayName = optionalString(body, 'displayName', { max: 120 }) ?? null;
  const phoneNumber =
    optionalNullableString(body, 'phoneNumber', { max: 40 }) ?? null;
  const photoURL =
    optionalNullableString(body, 'photoURL', { max: 2048 }) ?? null;
  const role =
    optionalEnum(body, 'role', ['user', 'admin', 'superadmin'] as const) ??
    'user';

  if (role === 'superadmin' && !hasRole(auth.user, 'superadmin')) {
    throw ApiError.forbidden('Only a superadmin can create a superadmin');
  }

  const users = createUsersRepository(context.db);

  if (users.findByEmail(email)) {
    throw ApiError.conflict(`An account already exists for ${email}`);
  }

  const row = users.insert({
    id: randomUUID(),
    email,
    passwordHash: hashPassword(password),
    displayName,
    photoURL,
    phoneNumber,
    role,
  });

  ensureProfile(context.documents, row.id);

  const patch = profilePatchFrom(body);
  if (patch) writeProfile(context.documents, row.id, patch);

  context.events.publish('account.created', {
    uid: row.id,
    role: row.role,
  });

  return created({ account: toAccount(row, context.documents) });
});

const update = defineFunction((event, context): FunctionResult => {
  const uid = event.params.uid;
  if (!uid) throw ApiError.invalid('Missing account id');

  const auth = requireAuth(context);
  const self = auth.user.uid === uid;

  if (!self && !isAdmin(auth.user)) {
    throw ApiError.forbidden('You can only update your own account');
  }

  const body = asObject(event.body);

  if (!self && body.role !== undefined) {
    // Admins may promote/demote ordinary accounts, but only a superadmin can
    // create or remove a peer.
    if (body.role === 'superadmin' && !hasRole(auth.user, 'superadmin')) {
      throw ApiError.forbidden('Only a superadmin can grant superadmin');
    }

    if (!hasRole(auth.user, 'admin')) {
      throw ApiError.forbidden('Only an admin can change roles');
    }
  }

  const users = createUsersRepository(context.db);
  const target = users.findById(uid);
  if (!target) throw ApiError.notFound('Account does not exist');

  const role = optionalEnum(body, 'role', [
    'user',
    'admin',
    'superadmin',
  ] as const);
  const disabled = optionalBoolean(body, 'disabled');
  const displayName = optionalNullableString(body, 'displayName', { max: 120 });
  const photoURL = optionalNullableString(body, 'photoURL', { max: 2048 });
  const phoneNumber = optionalNullableString(body, 'phoneNumber', { max: 40 });

  if (self && (role !== undefined || disabled !== undefined)) {
    throw ApiError.forbidden('You cannot change your own role or status');
  }

  if (
    target.role === 'superadmin' &&
    role !== undefined &&
    role !== 'superadmin'
  ) {
    const superadmins = users.countByRole('superadmin');
    if (superadmins <= 1) {
      throw ApiError.precondition('The last superadmin cannot be demoted');
    }
  }

  const updated = users.update(uid, {
    displayName,
    photoURL,
    phoneNumber,
    role,
    disabled,
  });

  if (!updated) throw ApiError.notFound('Account does not exist');

  if (disabled === true) {
    createSessionsRepository(context.db, context.config).revokeAllForUser(uid);
  }

  const patch = profilePatchFrom(body);
  if (patch) writeProfile(context.documents, uid, patch);

  context.events.publish('account.updated', { uid });

  return ok({ account: toAccount(updated, context.documents) });
});

const remove = defineFunction((event, context): FunctionResult => {
  const uid = event.params.uid;
  if (!uid) throw ApiError.invalid('Missing account id');

  const auth = requireRole(context, 'admin');

  if (auth.user.uid === uid) {
    throw ApiError.precondition('You cannot delete your own account here');
  }

  const users = createUsersRepository(context.db);
  const target = users.findById(uid);
  if (!target) throw ApiError.notFound('Account does not exist');

  if (target.role === 'superadmin' && !hasRole(auth.user, 'superadmin')) {
    throw ApiError.forbidden('Only a superadmin can delete a superadmin');
  }

  if (target.role === 'admin' && !hasRole(auth.user, 'superadmin')) {
    throw ApiError.forbidden('Only a superadmin can delete an admin');
  }

  createSessionsRepository(context.db, context.config).revokeAllForUser(uid);
  context.db
    .prepare('DELETE FROM meeting_attendees WHERE user_id = ?')
    .run(uid);
  users.remove(uid);
  removeProfile(context.documents, uid);

  context.events.publish('account.deleted', { uid });

  return noContent();
});

export const accountFunctions = {
  'accounts.list': list,
  'accounts.get': get,
  'accounts.me': me,
  'accounts.meUpdate': meUpdate,
  'accounts.create': create,
  'accounts.update': update,
  'accounts.remove': remove,
};

/** Re-exported for tests and future functions that shape an account. */
export { toAccount };
export type { ProfileDocument, UserRole };
