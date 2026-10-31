import {
  EMPTY_NOTES,
  NOTES_PAYLOAD_VERSION,
  createNote,
  notesIn,
  notesNamespace,
  parseNotesPayload,
  withNote,
  withoutNote,
} from '../notes';

/**
 * Notes payload rules: versioning, corruption tolerance, stable ids, and
 * namespace isolation. These are the parts that must hold even if the storage
 * backend or the UI changes.
 */

const AYAH = { surah: 2, ayah: 255, absoluteNumber: 262 };
const NOTE = {
  id: 'n1',
  ayah: AYAH,
  text: ' memorize this ',
  createdAt: 1_700_000_000_000,
};

describe('notesNamespace', () => {
  it('namespaces accounts separately from the guest', () => {
    expect(notesNamespace('abc')).toBe('user:abc');
    expect(notesNamespace(null)).toBe('guest');
    expect(notesNamespace(undefined)).toBe('guest');
  });
});

describe('parseNotesPayload', () => {
  it('accepts a valid payload and drops invalid rows', () => {
    const payload = parseNotesPayload({
      version: NOTES_PAYLOAD_VERSION,
      byNamespace: {
        'user:a': [NOTE, { ...NOTE, id: 'n2', text: '   ' }, { id: 'n3' }],
        'user:b': [NOTE],
      },
    });

    expect(notesIn(payload, 'user:a')).toHaveLength(1);
    expect(notesIn(payload, 'user:a')[0]).toMatchObject({
      id: 'n1',
      text: ' memorize this ',
    });
    expect(notesIn(payload, 'user:b')).toHaveLength(1);
  });

  it('rejects a payload from another version instead of guessing', () => {
    expect(
      parseNotesPayload({
        version: NOTES_PAYLOAD_VERSION + 1,
        byNamespace: { guest: [NOTE] },
      }),
    ).toBe(EMPTY_NOTES);
  });

  it('returns the empty payload for junk, arrays and missing namespaces', () => {
    expect(parseNotesPayload(null)).toBe(EMPTY_NOTES);
    expect(parseNotesPayload('notes')).toBe(EMPTY_NOTES);
    expect(parseNotesPayload([])).toBe(EMPTY_NOTES);
    expect(parseNotesPayload({ version: NOTES_PAYLOAD_VERSION })).toBe(
      EMPTY_NOTES,
    );
    expect(
      parseNotesPayload({
        version: NOTES_PAYLOAD_VERSION,
        byNamespace: { guest: 'nope' },
      }),
    ).toEqual({ version: NOTES_PAYLOAD_VERSION, byNamespace: {} });
  });
});

describe('withNote / withoutNote', () => {
  it('inserts a note without touching another namespace', () => {
    const base = withNote(EMPTY_NOTES, 'user:a', NOTE);
    const next = withNote(base, 'user:b', { ...NOTE, id: 'n2' });

    expect(notesIn(next, 'user:a')).toHaveLength(1);
    expect(notesIn(next, 'user:b')).toHaveLength(1);
    expect(notesIn(base, 'user:b')).toHaveLength(0);
  });

  it('replaces by id, so a retried save cannot duplicate', () => {
    const once = withNote(EMPTY_NOTES, 'user:a', NOTE);
    const twice = withNote(once, 'user:a', {
      ...NOTE,
      text: 'edited',
    });

    expect(notesIn(twice, 'user:a')).toEqual([{ ...NOTE, text: 'edited' }]);
  });

  it('removes one note and ignores an unknown id', () => {
    const once = withNote(EMPTY_NOTES, 'guest', NOTE);

    expect(notesIn(withoutNote(once, 'guest', 'n1'), 'guest')).toHaveLength(0);
    expect(withoutNote(once, 'guest', 'missing')).toBe(once);
  });
});

describe('createNote', () => {
  it('trims text and builds a stable id from the injected clock/random', () => {
    const note = createNote(AYAH, '  revise  ', {
      now: () => 1_700_000_000_000,
      random: () => 0.5,
    });

    expect(note).toMatchObject({ ayah: AYAH, text: 'revise' });
    expect(note.createdAt).toBe(1_700_000_000_000);
    expect(note.id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
  });

  it('different random values produce different ids at the same millisecond', () => {
    const a = createNote(AYAH, 'a', { now: () => 1, random: () => 0.1 });
    const b = createNote(AYAH, 'b', { now: () => 1, random: () => 0.9 });

    expect(a.id).not.toBe(b.id);
  });
});
