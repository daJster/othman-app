import {
  asBoolean,
  asOneOf,
  asRecord,
  asString,
  at,
  missingAsNull,
  type Parser,
} from '@/core/domain/wire/shape';
import type {
  BackendAccount,
  BackendProfile,
  BackendUser,
} from '@/platform/backend';
import type { UserRole } from '@/core/types';

/**
 * The wire shape of an account: the identity row plus its optional profile.
 *
 * The profile repository flattens this into the `AccountProfile` the UI reads,
 * so every field that flattening touches is checked here first.
 */

const parseRole = asOneOf<UserRole>(['guest', 'user', 'admin', 'superadmin']);
const parseLocale = asOneOf<BackendProfile['locale']>(['ar', 'en']);

export const parseBackendUser: Parser<BackendUser> = (value, path) => {
  const row = asRecord(value, path);

  return {
    uid: asString(row.uid, at(path, 'uid')),
    email: asString(row.email, at(path, 'email')),
    displayName: missingAsNull(asString)(
      row.displayName,
      at(path, 'displayName'),
    ),
    photoURL: missingAsNull(asString)(row.photoURL, at(path, 'photoURL')),
    role: parseRole(row.role, at(path, 'role')),
    phoneNumber: missingAsNull(asString)(
      row.phoneNumber,
      at(path, 'phoneNumber'),
    ),
    disabled: asBoolean(row.disabled, at(path, 'disabled')),
    createdAt: asString(row.createdAt, at(path, 'createdAt')),
    updatedAt: asString(row.updatedAt, at(path, 'updatedAt')),
  };
};

const parseProfile: Parser<BackendProfile> = (value, path) => {
  const row = asRecord(value, path);

  return {
    bio: missingAsNull(asString)(row.bio, at(path, 'bio')),
    locale: parseLocale(row.locale, at(path, 'locale')),
    notifications: asBoolean(row.notifications, at(path, 'notifications')),
    updatedAt: asString(row.updatedAt, at(path, 'updatedAt')),
  };
};

/** `GET /v1/accounts/{uid}` → `{ account }`. */
export function parseAccountResponse(payload: unknown): BackendAccount {
  const account = asRecord(asRecord(payload, 'response').account, 'account');

  return {
    ...parseBackendUser(account, 'account'),
    profile: missingAsNull(parseProfile)(account.profile, 'account.profile'),
  };
}
