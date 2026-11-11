import { formatDateKey, isDateKey } from '@/core/domain/meetings/date-key';
import type { DateKey } from '@/core/types';
import circleData from '@/data/mock/CircleMock.json';
import type {
  CircleItem,
  CircleKind,
  CircleRepository,
  Localized,
  NoticeTopic,
} from './circle.types';

/**
 * Demo circle content, in place until the Firestore repository lands.
 *
 * The JSON stores a **day offset**, not a date: a fixture pinned to a calendar
 * day starts lying the moment that day passes, which is exactly what happened
 * to the meetings mock (April 2026 corporate sessions). Offsets keep the demo
 * honest: there is always a session today and an exam next week, and the pill
 * always has something real to report.
 *
 * The JSON is hand-edited, so it is treated as an external boundary: unknown
 * kinds, topics and malformed offsets are skipped with a warning instead of
 * entering the cache as a half-rendered row.
 */

type RawItem = {
  id: string;
  kind: string;
  dayOffset: number;
  time: string | null;
  title: Localized;
  body: Localized;
  meta: Localized | null;
  topic: string | null;
  href: string | null;
};

const KINDS: readonly CircleKind[] = ['halqa', 'exam', 'notice'];
const TOPICS: readonly NoticeTopic[] = ['shaykh', 'halqa', 'app'];

const DAY_MS = 24 * 60 * 60 * 1000;

function isLocalized(value: unknown): value is Localized {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;

  return typeof record.ar === 'string' && typeof record.en === 'string';
}

/** Local midnight today, so offsets never drift through a DST boundary. */
function today(): Date {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function dateFor(offset: number): DateKey {
  return formatDateKey(new Date(today().getTime() + offset * DAY_MS));
}

function parseRows(raw: RawItem[]): CircleItem[] {
  const items: CircleItem[] = [];

  for (const row of raw) {
    const kind = KINDS.find((candidate) => candidate === row.kind);
    const topic =
      row.topic === null
        ? null
        : (TOPICS.find((candidate) => candidate === row.topic) ?? null);

    if (!kind || !isLocalized(row.title) || !isLocalized(row.body)) {
      console.warn(`[circle:mock] skipping "${row.id}": malformed row`);
      continue;
    }

    if (row.topic !== null && topic === null) {
      console.warn(`[circle:mock] skipping "${row.id}": unknown topic`);
      continue;
    }

    if (!Number.isFinite(row.dayOffset)) {
      console.warn(`[circle:mock] skipping "${row.id}": bad dayOffset`);
      continue;
    }

    const date = dateFor(row.dayOffset);

    if (!isDateKey(date)) {
      continue;
    }

    items.push({
      id: row.id,
      kind,
      date,
      time: row.time,
      title: row.title,
      body: row.body,
      meta: isLocalized(row.meta) ? row.meta : null,
      topic,
      href: row.href,
    });
  }

  return items;
}

const items = parseRows(circleData.items as RawItem[]);

/** Artificial latency so loading states are exercised in development. */
const MOCK_LATENCY_MS = 220;

export const mockCircleRepository: CircleRepository = {
  async list(): Promise<CircleItem[]> {
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

    return items;
  },
};
