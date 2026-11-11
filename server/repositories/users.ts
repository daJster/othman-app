import type { DatabaseSync } from 'node:sqlite';
import type { PublicUser, SessionRecord, UserRole } from '../contracts.ts';
import type { ServerConfig } from '../config.ts';

/**
 * Users + sessions repositories.
 *
 * Everything that reaches SQL is parameterized. Column names are written
 * literally in each query (never interpolated from a request), so a PATCH can
 * only ever touch the columns a handler explicitly supports.
 */

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  photo_url: string | null;
  phone_number: string | null;
  role: UserRole;
  disabled: number;
  created_at: string;
  updated_at: string;
};

export type NewUser = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  role: UserRole;
  disabled?: boolean;
};

export type UserPatch = {
  email?: string;
  passwordHash?: string;
  displayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
  role?: UserRole;
  disabled?: boolean;
};

export type ListUsersOptions = {
  role?: UserRole;
  q?: string;
  limit: number;
  offset: number;
};

const ROLE_VALUES: readonly UserRole[] = [
  'guest',
  'user',
  'admin',
  'superadmin',
];

export function isUserRole(value: unknown): value is UserRole {
  return ROLE_VALUES.some((role) => role === value);
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    uid: row.id,
    email: row.email,
    displayName: row.display_name,
    photoURL: row.photo_url,
    role: row.role,
    phoneNumber: row.phone_number,
    disabled: row.disabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createUsersRepository(db: DatabaseSync) {
  const selectById = db.prepare('SELECT * FROM users WHERE id = ?');
  const selectByEmail = db.prepare('SELECT * FROM users WHERE email = ?');

  return {
    findById(id: string): UserRow | null {
      return (selectById.get(id) as UserRow | undefined) ?? null;
    },

    findByEmail(email: string): UserRow | null {
      return (
        (selectByEmail.get(email.toLowerCase()) as UserRow | undefined) ?? null
      );
    },

    insert(user: NewUser): UserRow {
      const now = new Date().toISOString();

      db.prepare(
        `INSERT INTO users (
           id, email, password_hash, display_name, photo_url, phone_number,
           role, disabled, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        user.id,
        user.email.toLowerCase(),
        user.passwordHash,
        user.displayName,
        user.photoURL,
        user.phoneNumber,
        user.role,
        user.disabled ? 1 : 0,
        now,
        now,
      );

      const created = this.findById(user.id);
      if (!created) throw new Error('User insert failed');

      return created;
    },

    update(id: string, patch: UserPatch): UserRow | null {
      const current = this.findById(id);
      if (!current) return null;

      const assignments: string[] = [];
      const values: (string | number | null)[] = [];
      const push = (column: string, value: string | number | null) => {
        assignments.push(`${column} = ?`);
        values.push(value);
      };

      if (patch.email !== undefined) push('email', patch.email.toLowerCase());
      if (patch.passwordHash !== undefined) {
        push('password_hash', patch.passwordHash);
      }
      if (patch.displayName !== undefined) {
        push('display_name', patch.displayName);
      }
      if (patch.photoURL !== undefined) push('photo_url', patch.photoURL);
      if (patch.phoneNumber !== undefined) {
        push('phone_number', patch.phoneNumber);
      }
      if (patch.role !== undefined) push('role', patch.role);
      if (patch.disabled !== undefined)
        push('disabled', patch.disabled ? 1 : 0);

      if (assignments.length === 0) return current;

      push('updated_at', new Date().toISOString());
      values.push(id);

      db.prepare(`UPDATE users SET ${assignments.join(', ')} WHERE id = ?`).run(
        ...values,
      );

      return this.findById(id);
    },

    remove(id: string): boolean {
      const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);

      return Number(result.changes) > 0;
    },

    list(options: ListUsersOptions): { rows: UserRow[]; total: number } {
      const clauses: string[] = [];
      const values: (string | number)[] = [];

      if (options.role) {
        clauses.push('role = ?');
        values.push(options.role);
      }

      if (options.q) {
        clauses.push('(email LIKE ? OR display_name LIKE ?)');
        const like = `%${options.q.replace(/[%_]/g, '')}%`;
        values.push(like, like);
      }

      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

      const totalRow = db
        .prepare(`SELECT COUNT(*) AS count FROM users ${where}`)
        .get(...values) as { count: number } | undefined;

      const rows = db
        .prepare(
          `SELECT * FROM users ${where}
           ORDER BY created_at ASC
           LIMIT ? OFFSET ?`,
        )
        .all(...values, options.limit, options.offset) as UserRow[];

      return { rows, total: Number(totalRow?.count ?? 0) };
    },

    countByRole(role: UserRole): number {
      const row = db
        .prepare('SELECT COUNT(*) AS count FROM users WHERE role = ?')
        .get(role) as { count: number } | undefined;

      return Number(row?.count ?? 0);
    },

    countAll(): number {
      const row = db.prepare('SELECT COUNT(*) AS count FROM users').get() as
        { count: number } | undefined;

      return Number(row?.count ?? 0);
    },
  };
}

export type UsersRepository = ReturnType<typeof createUsersRepository>;

/* ───────────────────────────── sessions ───────────────────────────── */

export function createSessionsRepository(
  db: DatabaseSync,
  config: Pick<ServerConfig, 'tokenTtlMs'>,
) {
  return {
    create(userId: string, token: string): SessionRecord {
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + config.tokenTtlMs);
      const record: SessionRecord = {
        token,
        userId,
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        revokedAt: null,
      };

      db.prepare(
        `INSERT INTO sessions (token, user_id, created_at, expires_at, revoked_at)
         VALUES (?, ?, ?, ?, NULL)`,
      ).run(token, userId, record.createdAt, record.expiresAt);

      return record;
    },

    /**
     * Resolves an active token to its user.
     *
     * Expiry is checked in JS rather than SQL so a clock difference between the
     * server process and SQLite's `datetime('now')` cannot keep a dead session
     * alive. A disabled user is treated as signed out.
     */
    findActive(
      token: string,
    ): { session: SessionRecord; user: UserRow } | null {
      const row = db
        .prepare(
          `SELECT u.*, s.token AS session_token, s.created_at AS session_created_at,
                  s.expires_at AS session_expires_at, s.revoked_at AS session_revoked_at
           FROM sessions s
           JOIN users u ON u.id = s.user_id
           WHERE s.token = ?`,
        )
        .get(token) as
        | (UserRow & {
            session_token: string;
            session_created_at: string;
            session_expires_at: string;
            session_revoked_at: string | null;
          })
        | undefined;

      if (!row) return null;
      if (row.session_revoked_at) return null;
      if (Date.parse(row.session_expires_at) <= Date.now()) return null;
      if (row.disabled === 1) return null;

      return {
        session: {
          token: row.session_token,
          userId: row.id,
          createdAt: row.session_created_at,
          expiresAt: row.session_expires_at,
          revokedAt: row.session_revoked_at,
        },
        user: row,
      };
    },

    revoke(token: string): void {
      db.prepare(
        'UPDATE sessions SET revoked_at = ? WHERE token = ? AND revoked_at IS NULL',
      ).run(new Date().toISOString(), token);
    },

    revokeAllForUser(userId: string): void {
      db.prepare(
        'UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL',
      ).run(new Date().toISOString(), userId);
    },
  };
}

export type SessionsRepository = ReturnType<typeof createSessionsRepository>;
