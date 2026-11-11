import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join, resolve } from 'node:path';
import { ApiError } from '../lib/errors.ts';

/**
 * JSON document store — the NoSQL half of the mock backend.
 *
 * One file per document: `<root>/<collection>/<id>.json`. A file per document,
 * rather than one big JSON blob, means a write touches one small file and a
 * crash cannot corrupt an unrelated record. Writes are atomic (temp file +
 * rename) for the same reason.
 *
 * This is the seam that becomes Firestore/DynamoDB. Callers only see
 * `get`/`list`/`set`/`patch`/`remove`, so a cloud implementation can replace it
 * without touching handlers.
 */

export type DocumentStore = {
  get<T>(collection: string, id: string): T | null;
  list<T>(collection: string): T[];
  set<T>(collection: string, id: string, value: T): T;
  patch<T extends Record<string, unknown>>(
    collection: string,
    id: string,
    patch: Partial<T>,
  ): T | null;
  remove(collection: string, id: string): boolean;
};

const COLLECTION_PATTERN = /^[a-z0-9-]+$/;

export function createDocumentStore(rootDir: string): DocumentStore {
  const root = resolve(rootDir);

  function collectionDir(collection: string): string {
    if (!COLLECTION_PATTERN.test(collection)) {
      throw new Error(`Invalid document collection: ${collection}`);
    }

    return join(root, collection);
  }

  function fileFor(collection: string, id: string): string {
    if (!id) throw new Error('Document id is required');

    return join(collectionDir(collection), `${encodeURIComponent(id)}.json`);
  }

  function read<T>(file: string): T | null {
    if (!existsSync(file)) return null;

    try {
      return JSON.parse(readFileSync(file, 'utf8')) as T;
    } catch {
      // A half-written or hand-edited document degrades to "missing" instead of
      // taking the whole request down.
      return null;
    }
  }

  return {
    get<T>(collection: string, id: string): T | null {
      return read<T>(fileFor(collection, id));
    },

    list<T>(collection: string): T[] {
      const dir = collectionDir(collection);
      if (!existsSync(dir)) return [];

      const rows: T[] = [];

      for (const name of readdirSync(dir)) {
        if (!name.endsWith('.json')) continue;

        const value = read<T>(join(dir, name));
        if (value !== null) rows.push(value);
      }

      return rows;
    },

    set<T>(collection: string, id: string, value: T): T {
      const dir = collectionDir(collection);
      const file = fileFor(collection, id);
      const temp = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;

      mkdirSync(dir, { recursive: true });
      writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
      renameSync(temp, file);

      return value;
    },

    patch<T extends Record<string, unknown>>(
      collection: string,
      id: string,
      patch: Partial<T>,
    ): T | null {
      const existing = read<T>(fileFor(collection, id));
      if (existing === null) return null;

      const next = { ...existing, ...patch } as T;
      this.set(collection, id, next);

      return next;
    },

    remove(collection: string, id: string): boolean {
      const file = fileFor(collection, id);
      if (!existsSync(file)) return false;

      rmSync(file);
      return true;
    },
  };
}

/** Throws a 404 when a document a handler requires is missing. */
export function requireDocument<T>(
  store: DocumentStore,
  collection: string,
  id: string,
  message: string,
): T {
  const value = store.get<T>(collection, id);

  if (value === null) throw ApiError.notFound(message);

  return value;
}
