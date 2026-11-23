import {
  array,
  asBoolean,
  asInteger,
  asOneOf,
  asRecord,
  asString,
  at,
  missingAsNull,
  type Parser,
} from '@/core/domain/wire/shape';
import type { BackendNotice, NoticesResponse } from '@/platform/backend';

/** The inbox page wire shape, checked before the notices panel renders a row. */

const parseKind = asOneOf<BackendNotice['kind']>(['notice']);
const parseTopic = asOneOf<NonNullable<BackendNotice['topic']>>([
  'shaykh',
  'halqa',
  'app',
]);

const parseLocalized: Parser<{ ar: string; en: string }> = (value, path) => {
  const row = asRecord(value, path);

  return {
    ar: asString(row.ar, at(path, 'ar')),
    en: asString(row.en, at(path, 'en')),
  };
};

const parseNotice: Parser<BackendNotice> = (value, path) => {
  const row = asRecord(value, path);

  return {
    id: asString(row.id, at(path, 'id')),
    kind: parseKind(row.kind, at(path, 'kind')),
    date: missingAsNull(asString)(row.date, at(path, 'date')),
    createdAt: asString(row.createdAt, at(path, 'createdAt')),
    title: parseLocalized(row.title, at(path, 'title')),
    body: parseLocalized(row.body, at(path, 'body')),
    topic: missingAsNull(parseTopic)(row.topic, at(path, 'topic')),
  };
};

/** `GET /v1/notices` → a page of the inbox. */
export function parseNoticesResponse(payload: unknown): NoticesResponse {
  const row = asRecord(payload, 'response');

  return {
    notices: array(parseNotice)(row.notices, 'notices'),
    page: asInteger(row.page, 'page', 1),
    hasMore: asBoolean(row.hasMore, 'hasMore'),
    total: asInteger(row.total, 'total', 0),
  };
}
