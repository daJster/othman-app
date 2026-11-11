import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { createMockServer } from '../mock-server.ts';

/**
 * Integration tests for the mock backend.
 *
 * These run under Node's own test runner (`npm run test:server`), not Jest:
 * the server is ESM + `node:sqlite` + TypeScript type stripping, and Node 24
 * executes that combination natively. Starting a real HTTP server on port 0
 * exercises the transport (CORS, body parsing, error mapping, auth resolution)
 * as well as the handlers, so a passing test means the app's client would see
 * the same response.
 */

type Running = {
  url: string;
  close: () => Promise<void>;
};

type ApiResponse<T = unknown> = {
  status: number;
  body: T;
};

let running: Running;
let tempDir: string;

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'kuttab-mock-'));
  const server = createMockServer({
    port: 0,
    host: '127.0.0.1',
    dbPath: ':memory:',
    dataDir: join(tempDir, 'documents'),
    logRequests: false,
    latencyMs: 0,
  });

  const started = await server.listen();
  running = { url: started.url, close: started.close };
});

after(async () => {
  await running?.close();
  rmSync(tempDir, { recursive: true, force: true });
});

async function api<T = unknown>(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    token?: string;
  } = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {};

  if (init.body !== undefined) headers['content-type'] = 'application/json';
  if (init.token) headers.authorization = `Bearer ${init.token}`;

  const response = await fetch(`${running.url}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  const text = await response.text();

  return {
    status: response.status,
    body: (text ? JSON.parse(text) : null) as T,
  };
}

async function login(
  email = 'student@kuttab.test',
  password = 'kuttab1234',
): Promise<string> {
  const response = await api<{ token: string }>('/v1/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  assert.equal(response.status, 200);
  return response.body.token;
}

test('health is public and reports the service', async () => {
  const response = await api<{ ok: boolean; service: string }>('/health');

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.service, 'kuttab-mock-backend');
});

test('seeded accounts can sign in and restore a session', async () => {
  const token = await login();
  const session = await api<{ user: { email: string; role: string } }>(
    '/v1/auth/session',
    { token },
  );

  assert.equal(session.status, 200);
  assert.equal(session.body.user.email, 'student@kuttab.test');
  assert.equal(session.body.user.role, 'user');
});

test('a wrong password is rejected without revealing the account', async () => {
  const wrong = await api<{ error: { code: string; message: string } }>(
    '/v1/auth/login',
    {
      method: 'POST',
      body: { email: 'student@kuttab.test', password: 'wrong-password1' },
    },
  );
  const missing = await api<{ error: { code: string; message: string } }>(
    '/v1/auth/login',
    {
      method: 'POST',
      body: { email: 'nobody@kuttab.test', password: 'wrong-password1' },
    },
  );

  assert.equal(wrong.status, 401);
  assert.equal(missing.status, 401);
  assert.equal(wrong.body.error.message, missing.body.error.message);
});

test('registration creates an account, profile document and session', async () => {
  const response = await api<{
    token: string;
    user: { uid: string; role: string };
  }>('/v1/auth/register', {
    method: 'POST',
    body: {
      email: 'new-reader@kuttab.test',
      password: 'reader1234',
      displayName: 'New Reader',
    },
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.user.role, 'user');
  assert.ok(response.body.token);

  const account = await api<{ account: { profile: { locale: string } } }>(
    '/v1/accounts/me',
    { token: response.body.token },
  );

  assert.equal(account.status, 200);
  assert.equal(account.body.account.profile.locale, 'ar');
});

test('authorization: guests are rejected, users cannot list accounts', async () => {
  const guest = await api('/v1/accounts');
  const student = await login();
  const user = await api<{ error: { code: string } }>('/v1/accounts', {
    token: student,
  });

  assert.equal(guest.status, 401);
  assert.equal(user.status, 403);
  assert.equal(user.body.error.code, 'permission-denied');
});

test('admin account CRUD, including role changes and deletion', async () => {
  const admin = await login('admin@kuttab.test');

  const created = await api<{ account: { uid: string; email: string } }>(
    '/v1/accounts',
    {
      method: 'POST',
      token: admin,
      body: {
        email: 'managed@kuttab.test',
        password: 'managed1234',
        displayName: 'Managed',
        role: 'user',
      },
    },
  );

  assert.equal(created.status, 201);
  const uid = created.body.account.uid;

  const updated = await api<{ account: { displayName: string; role: string } }>(
    `/v1/accounts/${uid}`,
    {
      method: 'PATCH',
      token: admin,
      body: { displayName: 'Managed II', role: 'admin' },
    },
  );

  assert.equal(updated.status, 200);
  assert.equal(updated.body.account.displayName, 'Managed II');
  assert.equal(updated.body.account.role, 'admin');

  const listed = await api<{ accounts: unknown[]; total: number }>(
    '/v1/accounts?role=admin',
    { token: admin },
  );
  assert.equal(listed.status, 200);
  assert.ok(listed.body.accounts.length >= 2);

  const removed = await api(`/v1/accounts/${uid}`, {
    method: 'DELETE',
    token: admin,
  });
  assert.equal(removed.status, 204);

  const missing = await api(`/v1/accounts/${uid}`, { token: admin });
  assert.equal(missing.status, 404);
});

test('meetings: public reads, admin writes, student RSVP', async () => {
  const admin = await login('shaykh@kuttab.test');
  const student = await login();

  const created = await api<{ meeting: { id: number; status: string } }>(
    '/v1/meetings',
    {
      method: 'POST',
      token: admin,
      body: {
        title: 'Test session',
        titleAr: 'حلقة اختبار',
        date: '2030-01-15',
        time: '18:00',
        durationMinutes: 60,
        meetLink: 'https://meet.google.com/test',
        attendees: [{ name: 'Student' }],
      },
    },
  );

  assert.equal(created.status, 201);
  assert.equal(created.body.meeting.status, 'scheduled');

  const id = created.body.meeting.id;

  const listed = await api<{ meetings: { id: number }[] }>(
    '/v1/meetings?date=2030-01-15',
  );
  assert.equal(listed.status, 200);
  assert.equal(listed.body.meetings.length, 1);

  const studentCreate = await api('/v1/meetings', {
    method: 'POST',
    token: student,
    body: {
      title: 'Not allowed',
      date: '2030-01-16',
      time: '18:00',
      durationMinutes: 30,
    },
  });
  assert.equal(studentCreate.status, 403);

  const rsvp = await api<{
    meeting: { attendees: { userId: string | null; status: string }[] };
  }>(`/v1/meetings/${id}/rsvp`, { method: 'POST', token: student });

  assert.equal(rsvp.status, 200);
  assert.ok(
    rsvp.body.meeting.attendees.some(
      (attendee) => attendee.userId !== null && attendee.status === 'going',
    ),
  );

  const removed = await api(`/v1/meetings/${id}`, {
    method: 'DELETE',
    token: admin,
  });
  assert.equal(removed.status, 204);
});

test('Qur’an catalog and ayahs are public and complete', async () => {
  const catalog = await api<{
    surahs: Record<string, { nameEnglish: string; ayahCount: number }>;
    editions: Record<string, { name: string }>;
  }>('/v1/quran/catalog');

  assert.equal(catalog.status, 200);
  assert.equal(Object.keys(catalog.body.surahs).length, 114);
  assert.equal(catalog.body.surahs['1']?.nameEnglish, 'Al-Fatiha');
  assert.ok(Object.keys(catalog.body.editions).length >= 1);

  const surah = await api<{ ayahs: { text: string }[] }>('/v1/quran/surahs/1');
  assert.equal(surah.status, 200);
  assert.equal(surah.body.ayahs.length, 7);
  assert.match(surah.body.ayahs[0].text, /بِسْمِ/);

  const ayah = await api<{
    ayah: { absoluteNumber: number; numberInSurah: number };
  }>('/v1/quran/ayahs/1');
  assert.equal(ayah.status, 200);
  assert.equal(ayah.body.ayah.absoluteNumber, 1);
  assert.equal(ayah.body.ayah.numberInSurah, 1);
});

test('Qur’an progress, bookmarks and notes are per-user CRUD', async () => {
  const student = await login();

  const progress = await api<{ progress: { surahNumber: number }[] }>(
    '/v1/quran/progress',
    { token: student },
  );
  assert.equal(progress.status, 200);
  assert.equal(progress.body.progress.length, 114);

  const put = await api<{ progress: { percent: number } }>(
    '/v1/quran/progress/5',
    {
      method: 'PUT',
      token: student,
      body: { surahNumber: 5, percent: 42, lastReviewed: '2026-01-10' },
    },
  );
  assert.equal(put.status, 200);
  assert.equal(put.body.progress.percent, 42);

  const deleted = await api('/v1/quran/progress/5', {
    method: 'DELETE',
    token: student,
  });
  assert.equal(deleted.status, 204);

  const bookmark = await api<{ bookmark: { id: string } }>(
    '/v1/quran/bookmarks',
    {
      method: 'POST',
      token: student,
      body: {
        surah: 2,
        ayah: 255,
        absoluteNumber: 262,
        label: 'Ayat al-Kursi',
      },
    },
  );
  assert.equal(bookmark.status, 201);

  const renamed = await api<{ bookmark: { label: string } }>(
    `/v1/quran/bookmarks/${bookmark.body.bookmark.id}`,
    {
      method: 'PATCH',
      token: student,
      body: { label: 'Al-Kursi' },
    },
  );
  assert.equal(renamed.body.bookmark.label, 'Al-Kursi');

  const note = await api<{ note: { id: string; text: string } }>(
    '/v1/quran/notes',
    {
      method: 'POST',
      token: student,
      body: {
        surah: 2,
        ayah: 255,
        absoluteNumber: 262,
        text: 'Review this ayah before the next halqa.',
      },
    },
  );
  assert.equal(note.status, 201);

  const updated = await api<{ note: { text: string } }>(
    `/v1/quran/notes/${note.body.note.id}`,
    {
      method: 'PATCH',
      token: student,
      body: { text: 'Reviewed.' },
    },
  );
  assert.equal(updated.body.note.text, 'Reviewed.');

  const removedBookmark = await api(
    `/v1/quran/bookmarks/${bookmark.body.bookmark.id}`,
    { method: 'DELETE', token: student },
  );
  assert.equal(removedBookmark.status, 204);

  const removedNote = await api(`/v1/quran/notes/${note.body.note.id}`, {
    method: 'DELETE',
    token: student,
  });
  assert.equal(removedNote.status, 204);
});

test('Qur’an records do not leak between users', async () => {
  const admin = await login('admin@kuttab.test');
  const created = await api<{ account: { uid: string } }>('/v1/accounts', {
    method: 'POST',
    token: admin,
    body: {
      email: 'isolated@kuttab.test',
      password: 'isolated1234',
      displayName: 'Isolated',
    },
  });
  assert.equal(created.status, 201);

  const other = await login('isolated@kuttab.test', 'isolated1234');
  const notes = await api<{ notes: unknown[] }>('/v1/quran/notes', {
    token: other,
  });

  assert.equal(notes.status, 200);
  assert.equal(notes.body.notes.length, 0);

  const bookmarks = await api<{ bookmarks: unknown[] }>('/v1/quran/bookmarks', {
    token: other,
  });
  assert.equal(bookmarks.body.bookmarks.length, 0);
});

test('events are persisted and pollable by cursor', async () => {
  const admin = await login('admin@kuttab.test');

  const first = await api<{ cursor: number }>('/v1/events?since=0', {
    token: admin,
  });
  assert.equal(first.status, 200);

  const created = await api<{ meeting: { id: number } }>('/v1/meetings', {
    method: 'POST',
    token: admin,
    body: {
      title: 'Event probe',
      date: '2031-02-01',
      time: '09:00',
      durationMinutes: 30,
    },
  });
  assert.equal(created.status, 201);

  const second = await api<{
    events: { type: string; id: number }[];
    cursor: number;
  }>(`/v1/events?since=${first.body.cursor}`, { token: admin });

  assert.equal(second.status, 200);
  assert.ok(
    second.body.events.some((event) => event.type === 'meetings.created'),
  );
  assert.ok(second.body.cursor > first.body.cursor);

  const anonymous = await api('/v1/events?since=0');
  assert.equal(anonymous.status, 401);
});

test('the callable endpoint returns the same function result', async () => {
  const response = await api<{
    result: { token: string; user: { email: string } };
  }>('/v1/functions/auth.login', {
    method: 'POST',
    body: {
      data: { email: 'student@kuttab.test', password: 'kuttab1234' },
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.result.user.email, 'student@kuttab.test');
  assert.ok(response.body.result.token);
});

test('unknown routes and functions return a structured 404', async () => {
  const route = await api<{ error: { code: string } }>('/v1/nope');
  const fn = await api<{ error: { code: string } }>('/v1/functions/nope', {
    method: 'POST',
    body: {},
  });

  assert.equal(route.status, 404);
  assert.equal(fn.status, 404);
  assert.equal(route.body.error.code, 'not-found');
  assert.equal(fn.body.error.code, 'not-found');
});
