import { DatabaseSync } from 'node:sqlite';

/**
 * SQLite schema.
 *
 * Tabular data only: identities, sessions, meetings, per-user Quran records and
 * the event log. Document-shaped data (profiles, the Quran catalog) lives in the
 * JSON store under `server/stores`. That split is the point of the exercise: the
 * same handler can talk to Postgres/DynamoDB or Firestore later without changing
 * its shape.
 *
 * `user_version` is the migration cursor. Every change to this file must add a
 * new numbered migration at the bottom of `migrate()`; the mock server is run by
 * developers who already have a `server/data` directory, so dropping and
 * recreating would silently wipe their session and notes.
 */

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT,
  photo_url     TEXT,
  phone_number  TEXT,
  role          TEXT NOT NULL DEFAULT 'user',
  disabled      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  revoked_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS meetings (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  title            TEXT NOT NULL,
  title_ar         TEXT,
  description      TEXT NOT NULL DEFAULT '',
  description_ar   TEXT,
  date             TEXT NOT NULL,
  time             TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  meet_link        TEXT NOT NULL DEFAULT '',
  organizer        TEXT NOT NULL DEFAULT '',
  organizer_ar     TEXT,
  location         TEXT NOT NULL DEFAULT '',
  location_ar      TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);

CREATE TABLE IF NOT EXISTS meeting_attendees (
  meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id    TEXT,
  name       TEXT NOT NULL,
  name_ar    TEXT,
  avatar     TEXT,
  status     TEXT NOT NULL DEFAULT 'invited',
  PRIMARY KEY (meeting_id, user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_attendees_user ON meeting_attendees(user_id);

CREATE TABLE IF NOT EXISTS quran_progress (
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  surah_number  INTEGER NOT NULL,
  percent       INTEGER NOT NULL,
  last_reviewed TEXT,
  updated_at    TEXT NOT NULL,
  PRIMARY KEY (user_id, surah_number)
);

CREATE TABLE IF NOT EXISTS quran_bookmarks (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  surah           INTEGER NOT NULL,
  ayah            INTEGER NOT NULL,
  absolute_number INTEGER NOT NULL,
  label           TEXT,
  created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON quran_bookmarks(user_id);

CREATE TABLE IF NOT EXISTS quran_notes (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  surah           INTEGER NOT NULL,
  ayah            INTEGER NOT NULL,
  absolute_number INTEGER NOT NULL,
  text            TEXT NOT NULL,
  created_at      INTEGER NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_user ON quran_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_ayah ON quran_notes(user_id, absolute_number);

CREATE TABLE IF NOT EXISTS domain_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT NOT NULL,
  payload    TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

export function openDatabase(path: string): DatabaseSync {
  const db = new DatabaseSync(path);

  // In-memory databases have no journal to configure, and enabling WAL on them
  // is a no-op that Node warns about on some platforms.
  if (path !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }

  db.exec('PRAGMA foreign_keys = ON;');
  migrate(db);

  return db;
}

function migrate(db: DatabaseSync): void {
  const row = db.prepare('PRAGMA user_version').get() as
    { user_version?: number } | undefined;
  const version = Number(row?.user_version ?? 0);

  if (version < 1) {
    db.exec(SCHEMA_V1);
    db.exec('PRAGMA user_version = 1;');
  }

  // Future migrations:
  // if (version < 2) { db.exec('ALTER TABLE …'); db.exec('PRAGMA user_version = 2;'); }
}

/**
 * Runs `fn` inside a transaction.
 *
 * `node:sqlite` is synchronous, so a callback that throws leaves the database
 * open mid-statement unless it is rolled back here.
 */
export function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec('BEGIN');

  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
