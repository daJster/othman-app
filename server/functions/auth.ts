import { randomUUID } from 'node:crypto';
import type { AuthContext, PublicUser } from '../contracts.ts';
import { ApiError } from '../lib/errors.ts';
import { createToken, hashPassword, verifyPassword } from '../lib/password.ts';
import {
  asObject,
  optionalNullableString,
  optionalString,
  requiredEmail,
  requiredPassword,
  requiredString,
} from '../lib/validation.ts';
import {
  createSessionsRepository,
  createUsersRepository,
  toPublicUser,
} from '../repositories/users.ts';
import {
  ensureProfile,
  removeProfile,
  writeProfile,
} from '../stores/profiles.ts';
import { requireAuth } from './guards.ts';
import { created, defineFunction, ok } from './types.ts';
import type { FunctionContext, FunctionResult } from './types.ts';

/**
 * Authentication functions.
 *
 * Firebase Auth in the real deployment; SQLite sessions here. The response
 * shape (`{ user, token, expiresAt }`) is the only thing the app depends on, so
 * swapping the provider does not touch the frontend auth service.
 *
 * Passwords are scrypt-hashed (see `lib/password.ts`). Tokens are opaque and
 * stored hashed? No — stored verbatim in this mock so the value is easy to
 * inspect during device debugging. The production function must store a hash.
 */

export type SessionResponse = {
  user: PublicUser;
  token: string;
  expiresAt: string;
};

function createSession(
  context: FunctionContext,
  userId: string,
): SessionResponse {
  const users = createUsersRepository(context.db);
  const sessions = createSessionsRepository(context.db, context.config);
  const user = users.findById(userId);

  if (!user) throw ApiError.notFound('Account does not exist');

  const token = createToken();
  const session = sessions.create(userId, token);

  return {
    user: toPublicUser(user),
    token,
    expiresAt: session.expiresAt,
  };
}

const register = defineFunction((event, context): FunctionResult => {
  const body = asObject(event.body);
  const email = requiredEmail(body);
  const password = requiredPassword(body);
  const displayName = optionalString(body, 'displayName', { max: 120 }) ?? null;
  const phoneNumber =
    optionalNullableString(body, 'phoneNumber', { max: 40 }) ?? null;

  const users = createUsersRepository(context.db);

  if (users.findByEmail(email)) {
    throw ApiError.conflict(`An account already exists for ${email}`);
  }

  const user = users.insert({
    id: randomUUID(),
    email,
    passwordHash: hashPassword(password),
    displayName,
    photoURL: null,
    phoneNumber,
    role: 'user',
  });

  ensureProfile(context.documents, user.id);
  context.events.publish('account.created', {
    uid: user.id,
    role: user.role,
  });

  return created(createSession(context, user.id));
});

const login = defineFunction((event, context): FunctionResult => {
  const body = asObject(event.body);
  const email = requiredEmail(body);
  const password = requiredString(body, 'password', { max: 128 });

  const users = createUsersRepository(context.db);
  const user = users.findByEmail(email);

  // One message for both "unknown email" and "wrong password": distinguishing
  // them turns the endpoint into an account-enumeration oracle.
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new ApiError('unauthenticated', 'Invalid email or password');
  }

  if (user.disabled === 1) {
    throw new ApiError('permission-denied', 'This account is disabled');
  }

  return ok(createSession(context, user.id));
});

const logout = defineFunction((event, context): FunctionResult => {
  const auth = requireAuth(context);
  const sessions = createSessionsRepository(context.db, context.config);

  sessions.revoke(auth.token);

  return ok({ signedOut: true });
});

const session = defineFunction((event, context): FunctionResult => {
  const auth = requireAuth(context);

  return ok({ user: auth.user });
});

/**
 * Demo Google sign-in.
 *
 * There is no OAuth handshake in the mock: the button signs in a seeded
 * `google@kuttab.test` account. That keeps the social UI honest (the screen
 * really ends up signed in) without pretending to verify a token the server
 * never received. The production function replaces this body with
 * `getAuth().verifyIdToken(...)`.
 */
const google = defineFunction((event, context): FunctionResult => {
  const users = createUsersRepository(context.db);
  const demoEmail = 'google@kuttab.test';
  const existing = users.findByEmail(demoEmail);

  if (existing) {
    if (existing.disabled === 1) {
      throw new ApiError('permission-denied', 'This account is disabled');
    }

    return ok(createSession(context, existing.id));
  }

  const user = users.insert({
    id: randomUUID(),
    email: demoEmail,
    passwordHash: hashPassword(`google-${randomUUID()}`),
    displayName: 'Google Demo',
    photoURL: null,
    phoneNumber: null,
    role: 'user',
  });

  ensureProfile(context.documents, user.id);
  context.events.publish('account.created', {
    uid: user.id,
    role: user.role,
  });

  return created(createSession(context, user.id));
});

const updateProfile = defineFunction((event, context): FunctionResult => {
  const auth: AuthContext = requireAuth(context);
  const body = asObject(event.body);
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

  context.events.publish('account.updated', {
    uid: updated.id,
    fields: Object.keys(body),
  });

  return ok({ user: toPublicUser(updated) });
});

const updatePreferences = defineFunction((event, context): FunctionResult => {
  const auth = requireAuth(context);
  const body = asObject(event.body);
  const locale = optionalString(body, 'locale', { max: 2 });
  const notifications =
    typeof body.notifications === 'boolean' ? body.notifications : undefined;
  const bio = optionalNullableString(body, 'bio', { max: 500 });

  if (locale !== undefined && locale !== 'ar' && locale !== 'en') {
    throw ApiError.invalid('"locale" must be "ar" or "en"');
  }

  const profile = writeProfile(context.documents, auth.user.uid, {
    ...(locale === undefined ? {} : { locale }),
    ...(notifications === undefined ? {} : { notifications }),
    ...(bio === undefined ? {} : { bio }),
  });

  context.events.publish('account.preferences.updated', {
    uid: auth.user.uid,
  });

  return ok({ profile });
});

const deleteAccount = defineFunction((event, context): FunctionResult => {
  const auth = requireAuth(context);
  const users = createUsersRepository(context.db);
  const sessions = createSessionsRepository(context.db, context.config);

  sessions.revokeAllForUser(auth.user.uid);
  context.db
    .prepare('DELETE FROM meeting_attendees WHERE user_id = ?')
    .run(auth.user.uid);
  users.remove(auth.user.uid);
  removeProfile(context.documents, auth.user.uid);

  context.events.publish('account.deleted', { uid: auth.user.uid });

  return ok({ deleted: true });
});

export const authFunctions = {
  'auth.register': register,
  'auth.login': login,
  'auth.logout': logout,
  'auth.session': session,
  'auth.google': google,
  'auth.updateProfile': updateProfile,
  'auth.updatePreferences': updatePreferences,
  'auth.deleteAccount': deleteAccount,
};
