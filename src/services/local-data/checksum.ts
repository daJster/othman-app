/**
 * Content checksum for cached server data.
 *
 * The local cache answers "is this the data the server has?" without keeping a
 * second copy of the bytes to compare. Each persisted entry stores the checksum
 * of its payload; a sync recomputes the checksum of the fresh response and
 * compares. Equal means *unchanged*: no cache write, no re-render, no storage
 * churn.
 *
 * Two rules make the comparison trustworthy:
 *
 *  - **Stable key order.** JSON.stringify follows insertion order, so the same
 *    account row decoded in a different order would look changed. Keys are
 *    sorted recursively before hashing.
 *  - **JSON semantics.** A `Date` hashes as its ISO string, because that is what
 *    survives the storage round-trip; otherwise every hydrated entry would
 *    mismatch the fresh object it came from.
 *
 * The hash is FNV-1a (32 bit) concatenated with djb2 (32 bit). Neither is a
 * cryptographic digest — this is change detection, not tamper proofing — but the
 * pair makes accidental collisions vanishingly unlikely for payloads this size.
 * If the backend ever exposes ETags, the same seam can carry them instead.
 */

/** Canonical JSON: sorted object keys, JSON-compatible `Date` and `undefined`. */
export function stableStringify(value: unknown): string {
  if (value === null) return 'null';

  const type = typeof value;

  if (type === 'string') return JSON.stringify(value);
  if (type === 'number' || type === 'boolean') return String(value);
  // Matches JSON: `undefined` in an array becomes null and is omitted in objects.
  if (type === 'undefined' || type === 'function') return 'null';
  if (value instanceof Date) return JSON.stringify(value.toISOString());

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const parts: string[] = [];

  for (const key of Object.keys(record).sort()) {
    const item = record[key];

    if (item === undefined || typeof item === 'function') continue;

    parts.push(`${JSON.stringify(key)}:${stableStringify(item)}`);
  }

  return `{${parts.join(',')}}`;
}

/** Stable content hash. Equal payloads always produce the same string. */
export function checksum(value: unknown): string {
  const text = stableStringify(value);
  let fnv = 0x811c9dc5;
  let djb = 5381;

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);

    fnv = Math.imul(fnv ^ code, 0x01000193) >>> 0;
    djb = (Math.imul(djb, 33) ^ code) >>> 0;
  }

  return `${fnv.toString(16).padStart(8, '0')}${djb
    .toString(16)
    .padStart(8, '0')}`;
}
