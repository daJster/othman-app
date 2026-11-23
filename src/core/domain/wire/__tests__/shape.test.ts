import {
  array,
  asDateKey,
  asInteger,
  asOneOf,
  asRecord,
  at,
  missingAsNull,
  optional,
  WireShapeError,
} from '@/core/domain/wire/shape';

/**
 * The guards are the boundary's only defence against a drifted payload. The
 * important property is not that they accept good data (anything typed does)
 * but that a bad field fails with its own path, so the error names the field.
 */

function shapeErrorFrom(run: () => unknown): WireShapeError {
  try {
    run();
  } catch (error) {
    if (error instanceof WireShapeError) return error;

    throw error;
  }

  throw new Error('expected a WireShapeError');
}

describe('at', () => {
  it('joins a field and an index onto a path', () => {
    expect(at('', 'meetings')).toBe('meetings');
    expect(at('meetings', 2)).toBe('meetings[2]');
    expect(at('meetings[2]', 'durationMinutes')).toBe(
      'meetings[2].durationMinutes',
    );
  });
});

describe('asInteger', () => {
  it('rejects a value outside its range and names the path', () => {
    const error = shapeErrorFrom(() => asInteger(0, 'surahNumber', 1, 114));

    expect(error.path).toBe('surahNumber');
    expect(error.message).toContain('surahNumber');
  });

  it('rejects a fraction and a non-number', () => {
    expect(() => asInteger(1.5, 'count')).toThrow(WireShapeError);
    expect(() => asInteger('3', 'count')).toThrow(WireShapeError);
  });
});

describe('asDateKey', () => {
  it('accepts a local YYYY-MM-DD day and rejects anything else', () => {
    expect(asDateKey('2026-04-02', 'date')).toBe('2026-04-02');
    expect(() => asDateKey('02/04/2026', 'date')).toThrow(WireShapeError);
  });
});

describe('asOneOf', () => {
  it('accepts a listed value and lists the options in the error', () => {
    const parse = asOneOf(['ar', 'en'] as const);

    expect(parse('ar', 'locale')).toBe('ar');

    const error = shapeErrorFrom(() => parse('fr', 'locale'));

    expect(error.path).toBe('locale');
    expect(error.expected).toBe('"ar" | "en"');
  });
});

describe('missingAsNull', () => {
  it('reads an absent or null field as null, and parses anything else', () => {
    const parse = missingAsNull((value: unknown, path: string) => {
      if (typeof value !== 'string') throw new WireShapeError(path, 'a string');

      return value;
    });

    expect(parse(undefined, 'bio')).toBeNull();
    expect(parse(null, 'bio')).toBeNull();
    expect(parse('hi', 'bio')).toBe('hi');
    expect(() => parse(42, 'bio')).toThrow(WireShapeError);
  });
});

describe('optional', () => {
  it('passes an absent field through as undefined, unlike missingAsNull', () => {
    const parse = optional((value: unknown, path: string) => {
      if (typeof value !== 'boolean')
        throw new WireShapeError(path, 'a boolean');

      return value;
    });

    expect(parse(undefined, 'canceled')).toBeUndefined();
    expect(parse(true, 'canceled')).toBe(true);
  });
});

describe('array', () => {
  it('reports the failing element by index', () => {
    const parse = array((value: unknown, path: string) => {
      if (typeof value !== 'number') throw new WireShapeError(path, 'a number');

      return value;
    });

    expect(parse([1, 2], 'list')).toEqual([1, 2]);

    const error = shapeErrorFrom(() => parse([1, 'x'], 'list'));

    expect(error.path).toBe('list[1]');
  });

  it('rejects a non-array container with the container path', () => {
    const error = shapeErrorFrom(() =>
      array((value: unknown) => value)({ not: 'a list' }, 'meetings'),
    );

    expect(error.path).toBe('meetings');
  });
});

describe('asRecord', () => {
  it('rejects arrays and null, which are objects to typeof', () => {
    expect(() => asRecord([], 'row')).toThrow(WireShapeError);
    expect(() => asRecord(null, 'row')).toThrow(WireShapeError);
    expect(asRecord({ a: 1 }, 'row')).toEqual({ a: 1 });
  });
});
