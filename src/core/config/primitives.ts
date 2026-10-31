/**
 * Primitives every config table in this folder is built on.
 *
 * Why this exists: the original source (`src/data/configData.ts`) exposed
 * factory functions (`createShaykhListConfig`, `createQuranPageScaleConfig`,
 * `createDefaultNavConfig`, ...) that rebuilt their whole payload on every
 * call, and most call sites invoked them inside a render body. Hoisting the
 * data to module scope and wrapping it in `defineTable` removes the repeated
 * allocation at the source and makes every lookup O(1) instead of
 * `Array#find`.
 *
 * Two shapes are provided:
 *
 *   defineTable   keyed data (readers, editions, nav per role, statuses).
 *                 Freezes deeply, exposes `ids` for iteration, and `get`
 *                 typed by the literal key union so typos fail to compile.
 *
 *   defineConfig  singleton data (attendee list). Deep-freezes only.
 */

/** Minimum shape accepted as a config row. */
export type ConfigRow = object;

/** Immutable keyed data, indexed once at module load. */
export interface ConfigTable<
  Row extends ConfigRow,
  Id extends string = string,
> {
  /** Key order is the declaration order of the source data. */
  readonly ids: readonly Id[];
  readonly rows: Readonly<Record<Id, Row>>;
  /**
   * Typed by the literal key union, so an unknown id is a compile error.
   * Callers holding a widened `string` should use `find`.
   */
  get(id: Id): Row;
  find(id: string): Row | undefined;
  /**
   * Deliberately widened to `string`: probing with a value that came from
   * storage or the network is the whole point, and `find` covers the read.
   */
  has(id: string): boolean;
  /** Same table, but `get` resolves unknown ids to `defaultId`. */
  withDefault(defaultId: Id): ResolvedConfigTable<Row, Id>;
}

/** A `ConfigTable` with a guaranteed fallback, for optional ids. */
export interface ResolvedConfigTable<
  Row extends ConfigRow,
  Id extends string = string,
> {
  readonly defaultId: Id;
  readonly ids: readonly Id[];
  readonly rows: Readonly<Record<Id, Row>>;
  get(id?: string | null): Row;
  has(id: string): boolean;
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested);
  }

  return value;
}

/** Deep-freezes a singleton config object. */
export function defineConfig<const T extends ConfigRow>(config: T): T {
  return deepFreeze(config);
}

/**
 * Freezes keyed config data and builds the key -> row index once.
 *
 * Annotate the argument with the row type (`Record<Id, Row>`) rather than
 * using `satisfies`: an annotated argument keeps `Row` a single type instead
 * of a union of every row literal, which is what makes `table.get(id).prop`
 * accessible without narrowing.
 */
export function defineTable<
  const Rows extends Readonly<Record<string, ConfigRow>>,
>(
  rows: Rows,
): ConfigTable<Rows[keyof Rows] & ConfigRow, Extract<keyof Rows, string>> {
  const frozen = deepFreeze(rows);
  const ids = Object.keys(frozen) as Extract<keyof Rows, string>[];

  type Row = Rows[keyof Rows] & ConfigRow;

  const index = new Map<string, Row>(ids.map((id) => [id, frozen[id] as Row]));

  return {
    ids,
    rows: frozen,
    get: (id) => index.get(id) as Row,
    find: (id) => index.get(id),
    has: (id) => index.has(id),
    withDefault: (defaultId) => {
      const fallback = index.get(defaultId) as Row;

      return {
        defaultId,
        ids,
        rows: frozen,
        get: (id) => {
          const row = id == null ? undefined : index.get(id);
          return row ?? fallback;
        },
        has: (id) => index.has(id),
      };
    },
  };
}
