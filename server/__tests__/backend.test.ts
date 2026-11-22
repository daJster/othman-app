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

test('the event stream carries CORS headers and a ready frame', async () => {
  const token = await login();
  const controller = new AbortController();
  const response = await fetch(
    `${running.url}/v1/events/stream?token=${encodeURIComponent(token)}&since=0`,
    {
      // The browser opens this stream from :8081 against :9000. Without the
      // allow-origin header EventSource reports a network error and the app
      // loses live updates while every other request keeps working.
      headers: { origin: 'http://localhost:8081' },
      signal: controller.signal,
    },
  );

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    'http://localhost:8081',
  );
  assert.match(
    response.headers.get('content-type') ?? '',
    /text\/event-stream/,
  );

  const reader = response.body?.getReader();
  assert.ok(reader, 'the stream has a body');

  const first = await reader.read();
  await reader.cancel();
  controller.abort();

  assert.match(new TextDecoder().decode(first.value), /retry: 3000/);
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

test('meetings: scoped reads, admin writes, student RSVP', async () => {
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
        meetLink: '',
        description: '',
        location: '',
        organizer: '',
        attendees: [{ name: 'Student', userId: 'demo-student' }],
      },
    },
  );

  assert.equal(created.status, 201);
  assert.equal(created.body.meeting.status, 'scheduled');

  const id = created.body.meeting.id;

  const other = await api<{ meeting: { id: number } }>('/v1/meetings', {
    method: 'POST',
    token: admin,
    body: {
      title: 'Another cohort',
      date: '2030-01-16',
      time: '18:00',
      durationMinutes: 30,
      attendees: [{ name: 'Somebody else' }],
    },
  });

  assert.equal(other.status, 201);
  const otherId = other.body.meeting.id;

  // Anonymous reads keep the public list: the app's sign-in surface can still
  // show what the cohort has scheduled.
  const publicListed = await api<{ meetings: { id: number }[] }>(
    '/v1/meetings?date=2030-01-15',
  );
  assert.equal(publicListed.status, 200);
  assert.equal(publicListed.body.meetings.length, 1);

  // A signed-in student only sees the meeting they belong to, on the day and
  // in the calendar range the tab actually requests.
  const mineListed = await api<{ meetings: { id: number }[]; total: number }>(
    '/v1/meetings?date=2030-01-15',
    { token: student },
  );
  assert.equal(mineListed.status, 200);
  assert.deepEqual(
    mineListed.body.meetings.map((meeting) => meeting.id),
    [id],
  );
  assert.equal(mineListed.body.total, 1);

  const otherDay = await api<{ meetings: unknown[] }>(
    '/v1/meetings?date=2030-01-16',
    { token: student },
  );
  assert.equal(otherDay.status, 200);
  assert.equal(otherDay.body.meetings.length, 0);

  const range = await api<{ meetings: { id: number }[] }>(
    '/v1/meetings?from=2030-01-15&to=2030-01-16',
    { token: student },
  );
  assert.equal(range.status, 200);
  assert.deepEqual(
    range.body.meetings.map((meeting) => meeting.id),
    [id],
  );

  // The shaykh manages the whole calendar, so his view is not narrowed.
  const adminView = await api<{ meetings: { id: number }[] }>(
    '/v1/meetings?date=2030-01-16',
    { token: admin },
  );
  assert.equal(adminView.status, 200);
  assert.deepEqual(
    adminView.body.meetings.map((meeting) => meeting.id),
    [otherId],
  );

  const studentCreate = await api('/v1/meetings', {
    method: 'POST',
    token: student,
    body: {
      title: 'Not allowed',
      date: '2030-01-17',
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

  const declined = await api<{
    meeting: { attendees: { userId: string | null; status: string }[] };
  }>(`/v1/meetings/${id}/rsvp`, {
    method: 'POST',
    token: student,
    body: { going: false },
  });

  assert.equal(declined.status, 200);
  assert.ok(
    declined.body.meeting.attendees.some(
      (attendee) => attendee.userId !== null && attendee.status === 'declined',
    ),
  );

  for (const meetingId of [id, otherId]) {
    const removed = await api(`/v1/meetings/${meetingId}`, {
      method: 'DELETE',
      token: admin,
    });
    assert.equal(removed.status, 204);
  }
});

test('notices keep the web fixture and expose a paged phone archive', async () => {
  const webPage = await api<{
    notices: { id: string }[];
    hasMore: boolean;
    total: number;
  }>('/v1/notices?page=1');

  assert.equal(webPage.status, 200);
  assert.equal(webPage.body.total, 14);
  assert.equal(webPage.body.notices.length, 6);
  assert.equal(webPage.body.hasMore, true);

  const phonePage = await api<{
    notices: { id: string }[];
    hasMore: boolean;
    total: number;
  }>('/v1/notices?page=1&limit=12&extended=true');

  assert.equal(phonePage.status, 200);
  assert.equal(phonePage.body.total, 32);
  assert.equal(phonePage.body.notices.length, 12);
  assert.equal(phonePage.body.hasMore, true);

  const phoneLastPage = await api<{
    notices: { id: string }[];
    hasMore: boolean;
    total: number;
  }>('/v1/notices?page=3&limit=12&extended=true');

  assert.equal(phoneLastPage.status, 200);
  assert.equal(phoneLastPage.body.total, 32);
  assert.equal(phoneLastPage.body.notices.length, 8);
  assert.equal(phoneLastPage.body.hasMore, false);
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

type FeatureFlag = {
  state: string;
  note: string | null;
  exemptRoles: string[];
  updatedAt: string | null;
  updatedBy: string | null;
};

type FeatureResponse = {
  flags: Record<string, FeatureFlag>;
  updatedAt: string | null;
  updatedBy: string | null;
};

async function writeFeatures(
  token: string,
  changes: unknown[],
): Promise<ApiResponse<FeatureResponse>> {
  return api<FeatureResponse>('/v1/config/features', {
    method: 'PUT',
    token,
    body: { changes },
  });
}

test('feature config is public and empty on a fresh database', async () => {
  const response = await api<FeatureResponse>('/v1/config/features');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.flags, {});
  assert.equal(response.body.updatedAt, null);
  assert.equal(response.body.updatedBy, null);
});

test('only a superadmin can write feature config', async () => {
  const guest = await api('/v1/config/features', {
    method: 'PUT',
    body: { changes: [] },
  });
  assert.equal(guest.status, 401);

  const admin = await login('shaykh@kuttab.test');
  const denied = await writeFeatures(admin, []);
  assert.equal(denied.status, 403);
});

test('superadmin writes, reads back and removes an override', async () => {
  const superadmin = await login('admin@kuttab.test');

  const written = await writeFeatures(superadmin, [
    {
      key: 'meetings',
      state: 'maintenance',
      note: 'Fixing the calendar crash',
      exemptRoles: ['superadmin'],
    },
  ]);

  assert.equal(written.status, 200);
  assert.equal(written.body.flags.meetings.state, 'maintenance');
  assert.equal(written.body.flags.meetings.note, 'Fixing the calendar crash');
  assert.deepEqual(written.body.flags.meetings.exemptRoles, ['superadmin']);
  assert.equal(written.body.flags.meetings.updatedBy, 'admin@kuttab.test');
  assert.ok(written.body.flags.meetings.updatedAt);
  assert.equal(written.body.updatedBy, 'admin@kuttab.test');

  const fetched = await api<FeatureResponse>('/v1/config/features');
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.flags.meetings.state, 'maintenance');
  assert.equal(fetched.body.updatedBy, 'admin@kuttab.test');

  const removed = await writeFeatures(superadmin, [
    { key: 'meetings', state: null },
  ]);

  assert.equal(removed.status, 200);
  assert.equal(removed.body.flags.meetings, undefined);
});

test('feature writes reject malformed bodies and the locked switchboard', async () => {
  const superadmin = await login('admin@kuttab.test');

  const malformed: unknown[] = [
    [],
    {},
    { changes: 'nope' },
    { changes: [{ key: 'Meetings', state: 'off' }] },
    { changes: [{ key: 'meetings', state: 'disabled' }] },
    { changes: [{ key: 'meetings', state: 'off', note: 'x'.repeat(501) }] },
    {
      changes: [{ key: 'meetings', state: 'off', exemptRoles: ['guest'] }],
    },
    {
      changes: [{ key: 'meetings', state: 'off', exemptRoles: ['wizard'] }],
    },
    {
      changes: Array.from({ length: 101 }, (_, index) => ({
        key: `meetings.item${index}`,
        state: 'off',
      })),
    },
  ];

  for (const body of malformed) {
    const response = await api<{ error: { code: string } }>(
      '/v1/config/features',
      { method: 'PUT', token: superadmin, body },
    );

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'invalid-argument');
  }

  const locked = await writeFeatures(superadmin, [
    { key: 'admin.features', state: 'off' },
  ]);

  assert.equal(locked.status, 412);
});

test('a maintenance area blocks writes but not reads', async () => {
  const superadmin = await login('admin@kuttab.test');

  const exempt = await writeFeatures(superadmin, [
    {
      key: 'meetings',
      state: 'maintenance',
      note: 'Fixing the calendar crash',
      exemptRoles: ['superadmin'],
    },
  ]);
  assert.equal(exempt.status, 200);

  const created = await api<{ meeting: { id: number } }>('/v1/meetings', {
    method: 'POST',
    token: superadmin,
    body: {
      title: 'Allowed during maintenance',
      date: '2032-03-01',
      time: '18:00',
      durationMinutes: 30,
    },
  });
  assert.equal(created.status, 201);

  await api(`/v1/meetings/${created.body.meeting.id}`, {
    method: 'DELETE',
    token: superadmin,
  });

  const unrestricted = await writeFeatures(superadmin, [
    { key: 'meetings', state: 'maintenance' },
  ]);
  assert.equal(unrestricted.status, 200);

  const admin = await login('shaykh@kuttab.test');
  const blocked = await api<{ error: { code: string; message: string } }>(
    '/v1/meetings',
    {
      method: 'POST',
      token: admin,
      body: {
        title: 'Blocked write',
        date: '2032-03-02',
        time: '18:00',
        durationMinutes: 30,
      },
    },
  );

  assert.equal(blocked.status, 503);
  assert.equal(blocked.body.error.code, 'unavailable');
  assert.match(blocked.body.error.message, /meetings is in maintenance/);

  const read = await api('/v1/meetings?date=2032-03-02');
  assert.equal(read.status, 200);

  const cleared = await writeFeatures(superadmin, [
    { key: 'meetings', state: null },
  ]);
  assert.equal(cleared.status, 200);
});

test('quran off blocks bookmark writes but keeps the catalog readable', async () => {
  const superadmin = await login('admin@kuttab.test');
  const student = await login();

  const off = await writeFeatures(superadmin, [{ key: 'quran', state: 'off' }]);
  assert.equal(off.status, 200);

  const blocked = await api<{ error: { code: string } }>(
    '/v1/quran/bookmarks',
    {
      method: 'POST',
      token: student,
      body: { surah: 1, ayah: 1, absoluteNumber: 1 },
    },
  );
  assert.equal(blocked.status, 503);
  assert.equal(blocked.body.error.code, 'unavailable');

  const catalog = await api('/v1/quran/catalog');
  assert.equal(catalog.status, 200);

  await writeFeatures(superadmin, [{ key: 'quran', state: null }]);
});

test('app off blocks a user write while a superadmin stays exempt', async () => {
  const superadmin = await login('admin@kuttab.test');
  const student = await login();

  const off = await writeFeatures(superadmin, [{ key: 'app', state: 'off' }]);
  assert.equal(off.status, 200);

  const blocked = await api<{ error: { code: string; message: string } }>(
    '/v1/meetings',
    {
      method: 'POST',
      token: student,
      body: {
        title: 'Blocked by app off',
        date: '2032-04-01',
        time: '18:00',
        durationMinutes: 30,
      },
    },
  );

  assert.equal(blocked.status, 503);
  assert.equal(blocked.body.error.code, 'unavailable');
  assert.match(blocked.body.error.message, /meetings is off/);

  const created = await api<{ meeting: { id: number } }>('/v1/meetings', {
    method: 'POST',
    token: superadmin,
    body: {
      title: 'Superadmin during app off',
      date: '2032-04-01',
      time: '19:00',
      durationMinutes: 30,
    },
  });
  assert.equal(created.status, 201);

  await api(`/v1/meetings/${created.body.meeting.id}`, {
    method: 'DELETE',
    token: superadmin,
  });

  await writeFeatures(superadmin, [{ key: 'app', state: null }]);
});
