import type { DatabaseSync } from 'node:sqlite';
import type {
  AttendeeRecord,
  DateKey,
  MeetingRecord,
  MeetingStatus,
} from '../contracts.ts';

/**
 * Meetings repository — the tabular half of the meetings domain.
 *
 * `status` is derived on every read, never stored: a demo row with
 * `status: "soon"` becomes a lie the moment the session starts. The rule is the
 * same one the app uses (`src/core/domain/meetings/status.ts`), duplicated here
 * because the server cannot import through the Metro alias.
 */

type MeetingRow = {
  id: number;
  title: string;
  title_ar: string | null;
  description: string;
  description_ar: string | null;
  date: string;
  time: string;
  duration_minutes: number;
  meet_link: string;
  organizer: string;
  organizer_ar: string | null;
  location: string;
  location_ar: string | null;
  created_at: string;
  updated_at: string;
};

type AttendeeRow = {
  meeting_id: number;
  user_id: string | null;
  name: string;
  name_ar: string | null;
  avatar: string | null;
  status: string;
};

export type MeetingInput = {
  title: string;
  titleAr?: string | null;
  description?: string;
  descriptionAr?: string | null;
  date: DateKey;
  time: string;
  durationMinutes: number;
  meetLink?: string;
  organizer?: string;
  organizerAr?: string | null;
  location?: string;
  locationAr?: string | null;
  attendees?: AttendeeInput[];
};

export type AttendeeInput = {
  name: string;
  nameAr?: string | null;
  avatar?: string | null;
  userId?: string | null;
  status?: 'invited' | 'going' | 'declined';
};

export type MeetingPatch = Partial<MeetingInput>;

const SOON_WINDOW_MS = 2 * 60 * 60 * 1000;

function parseDateKey(key: DateKey): Date {
  const [year, month, day] = key.split('-').map(Number);

  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function meetingStatusAt(
  meeting: { date: DateKey; time: string; durationMinutes: number },
  now: Date,
): MeetingStatus {
  const day = parseDateKey(meeting.date);
  const [hours, minutes] = meeting.time.split(':').map(Number);
  const start = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
  ).getTime();
  const end = start + Math.max(0, meeting.durationMinutes) * 60_000;
  const at = now.getTime();

  if (at >= end) return 'past';
  if (start - at <= SOON_WINDOW_MS) return 'soon';

  const sameDay =
    day.getFullYear() === now.getFullYear() &&
    day.getMonth() === now.getMonth() &&
    day.getDate() === now.getDate();

  return sameDay ? 'upcoming' : 'scheduled';
}

function toAttendee(row: AttendeeRow): AttendeeRecord {
  return {
    name: row.name,
    ...(row.name_ar ? { nameAr: row.name_ar } : {}),
    ...(row.avatar ? { avatar: row.avatar } : {}),
    userId: row.user_id,
    status:
      row.status === 'going' || row.status === 'declined'
        ? row.status
        : 'invited',
  };
}

export function createMeetingsRepository(db: DatabaseSync) {
  function attendeesFor(meetingId: number): AttendeeRecord[] {
    const rows = db
      .prepare(
        `SELECT * FROM meeting_attendees
         WHERE meeting_id = ?
         ORDER BY status DESC, name ASC`,
      )
      .all(meetingId) as AttendeeRow[];

    return rows.map(toAttendee);
  }

  function toMeeting(row: MeetingRow, now = new Date()): MeetingRecord {
    return {
      id: row.id,
      title: row.title,
      ...(row.title_ar ? { titleAr: row.title_ar } : {}),
      description: row.description,
      ...(row.description_ar ? { descriptionAr: row.description_ar } : {}),
      date: row.date,
      time: row.time,
      durationMinutes: row.duration_minutes,
      meetLink: row.meet_link,
      status: meetingStatusAt(
        {
          date: row.date,
          time: row.time,
          durationMinutes: row.duration_minutes,
        },
        now,
      ),
      attendees: attendeesFor(row.id),
      organizer: row.organizer,
      ...(row.organizer_ar ? { organizerAr: row.organizer_ar } : {}),
      location: row.location,
      ...(row.location_ar ? { locationAr: row.location_ar } : {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  const repo = {
    get(id: number): MeetingRecord | null {
      const row = db.prepare('SELECT * FROM meetings WHERE id = ?').get(id) as
        MeetingRow | undefined;

      return row ? toMeeting(row) : null;
    },

    list(options: {
      date?: DateKey;
      from?: DateKey;
      to?: DateKey;
      limit: number;
      offset: number;
    }): { rows: MeetingRecord[]; total: number } {
      const clauses: string[] = [];
      const values: (string | number)[] = [];

      if (options.date) {
        clauses.push('date = ?');
        values.push(options.date);
      }
      if (options.from) {
        clauses.push('date >= ?');
        values.push(options.from);
      }
      if (options.to) {
        clauses.push('date <= ?');
        values.push(options.to);
      }

      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

      const totalRow = db
        .prepare(`SELECT COUNT(*) AS count FROM meetings ${where}`)
        .get(...values) as { count: number } | undefined;

      const rows = db
        .prepare(
          `SELECT * FROM meetings ${where}
           ORDER BY date ASC, time ASC
           LIMIT ? OFFSET ?`,
        )
        .all(...values, options.limit, options.offset) as MeetingRow[];

      const now = new Date();

      return {
        rows: rows.map((row) => toMeeting(row, now)),
        total: Number(totalRow?.count ?? 0),
      };
    },

    create(input: MeetingInput): MeetingRecord {
      const now = new Date().toISOString();

      const result = db
        .prepare(
          `INSERT INTO meetings (
             title, title_ar, description, description_ar, date, time,
             duration_minutes, meet_link, organizer, organizer_ar, location,
             location_ar, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          input.title,
          input.titleAr ?? null,
          input.description ?? '',
          input.descriptionAr ?? null,
          input.date,
          input.time,
          input.durationMinutes,
          input.meetLink ?? '',
          input.organizer ?? '',
          input.organizerAr ?? null,
          input.location ?? '',
          input.locationAr ?? null,
          now,
          now,
        );

      const id = Number(result.lastInsertRowid);

      for (const attendee of input.attendees ?? []) {
        repo.addAttendee(id, attendee);
      }

      const created = repo.get(id);
      if (!created) throw new Error('Meeting insert failed');

      return created;
    },

    update(id: number, patch: MeetingPatch): MeetingRecord | null {
      const current = repo.get(id);
      if (!current) return null;

      const assignments: string[] = [];
      const values: (string | number | null)[] = [];
      const push = (column: string, value: string | number | null) => {
        assignments.push(`${column} = ?`);
        values.push(value);
      };

      if (patch.title !== undefined) push('title', patch.title);
      if (patch.titleAr !== undefined) push('title_ar', patch.titleAr);
      if (patch.description !== undefined) {
        push('description', patch.description);
      }
      if (patch.descriptionAr !== undefined) {
        push('description_ar', patch.descriptionAr);
      }
      if (patch.date !== undefined) push('date', patch.date);
      if (patch.time !== undefined) push('time', patch.time);
      if (patch.durationMinutes !== undefined) {
        push('duration_minutes', patch.durationMinutes);
      }
      if (patch.meetLink !== undefined) push('meet_link', patch.meetLink);
      if (patch.organizer !== undefined) push('organizer', patch.organizer);
      if (patch.organizerAr !== undefined) {
        push('organizer_ar', patch.organizerAr);
      }
      if (patch.location !== undefined) push('location', patch.location);
      if (patch.locationAr !== undefined) push('location_ar', patch.locationAr);

      if (assignments.length > 0) {
        push('updated_at', new Date().toISOString());
        values.push(id);

        db.prepare(
          `UPDATE meetings SET ${assignments.join(', ')} WHERE id = ?`,
        ).run(...values);
      }

      return repo.get(id);
    },

    remove(id: number): boolean {
      const result = db.prepare('DELETE FROM meetings WHERE id = ?').run(id);

      return Number(result.changes) > 0;
    },

    addAttendee(meetingId: number, attendee: AttendeeInput): void {
      db.prepare(
        `INSERT INTO meeting_attendees
           (meeting_id, user_id, name, name_ar, avatar, status)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(meeting_id, user_id, name) DO UPDATE SET
           name_ar = excluded.name_ar,
           avatar = excluded.avatar,
           status = excluded.status`,
      ).run(
        meetingId,
        attendee.userId ?? null,
        attendee.name,
        attendee.nameAr ?? null,
        attendee.avatar ?? null,
        attendee.status ?? 'invited',
      );
    },

    removeAttendee(meetingId: number, userId: string): boolean {
      const result = db
        .prepare(
          'DELETE FROM meeting_attendees WHERE meeting_id = ? AND user_id = ?',
        )
        .run(meetingId, userId);

      return Number(result.changes) > 0;
    },

    clearAttendees(meetingId: number): void {
      db.prepare('DELETE FROM meeting_attendees WHERE meeting_id = ?').run(
        meetingId,
      );
    },

    countAll(): number {
      const row = db.prepare('SELECT COUNT(*) AS count FROM meetings').get() as
        { count: number } | undefined;

      return Number(row?.count ?? 0);
    },
  };

  return repo;
}

export type MeetingsRepository = ReturnType<typeof createMeetingsRepository>;
