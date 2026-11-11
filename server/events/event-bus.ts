import type { DatabaseSync } from 'node:sqlite';
import type { DomainEvent } from '../contracts.ts';

/**
 * Domain event log + in-process pub/sub.
 *
 * Events are persisted so `GET /v1/events?since=<cursor>` works after a server
 * restart, and they are also pushed to live SSE subscribers. The frontend can
 * therefore choose polling or streaming without the backend changing shape.
 *
 * `id` is the cursor. It is monotonic because it is SQLite's AUTOINCREMENT, not
 * `Date.now()`: two events in the same millisecond still order correctly.
 */

const MAX_BUFFERED_EVENTS = 500;

type EventRow = {
  id: number;
  type: string;
  payload: string;
  created_at: string;
};

function toEvent(row: EventRow): DomainEvent {
  let payload: unknown = null;

  try {
    payload = JSON.parse(row.payload) as unknown;
  } catch {
    payload = row.payload;
  }

  return {
    id: row.id,
    type: row.type,
    payload,
    createdAt: row.created_at,
  };
}

export class EventBus {
  private readonly db: DatabaseSync;
  private readonly listeners = new Set<(event: DomainEvent) => void>();
  private readonly buffer: DomainEvent[] = [];

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  publish(type: string, payload: unknown): DomainEvent {
    const createdAt = new Date().toISOString();

    const result = this.db
      .prepare(
        'INSERT INTO domain_events (type, payload, created_at) VALUES (?, ?, ?)',
      )
      .run(type, JSON.stringify(payload ?? null), createdAt);

    const event: DomainEvent = {
      id: Number(result.lastInsertRowid),
      type,
      payload: payload ?? null,
      createdAt,
    };

    this.buffer.push(event);
    if (this.buffer.length > MAX_BUFFERED_EVENTS) this.buffer.shift();

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        // A broken subscriber must not fail the write that produced the event.
        console.warn('[events] listener failed:', error);
      }
    }

    return event;
  }

  /** Every event with `id > cursor`, oldest first. */
  since(cursor: number, limit = 100): DomainEvent[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM domain_events
         WHERE id > ?
         ORDER BY id ASC
         LIMIT ?`,
      )
      .all(cursor, limit) as EventRow[];

    return rows.map(toEvent);
  }

  latestId(): number {
    const row = this.db
      .prepare('SELECT COALESCE(MAX(id), 0) AS id FROM domain_events')
      .get() as { id: number } | undefined;

    return Number(row?.id ?? 0);
  }

  subscribe(listener: (event: DomainEvent) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  subscriberCount(): number {
    return this.listeners.size;
  }
}
