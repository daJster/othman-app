import type {
  CircleItem,
  CircleRepository,
  CircleService,
} from './circle.types';

/**
 * Cache-first circle service.
 *
 * The meetings domain layer solves the same problem with a per-day cache; the
 * circle is one small list read once per session, so it keeps a single cached
 * copy plus the in-flight promise. Two components asking on the same tick share
 * one read instead of racing two.
 *
 * `invalidate()` clears the copy; the next `list()` re-reads. Nothing here
 * knows the repository is mock data.
 */
export function createCircleService(
  repository: CircleRepository,
): CircleService {
  let cached: CircleItem[] | null = null;
  let inflight: Promise<CircleItem[]> | null = null;

  return {
    async list(): Promise<CircleItem[]> {
      if (cached) {
        return cached;
      }

      inflight ??= repository
        .list()
        .then((items) => {
          cached = items;
          return items;
        })
        .finally(() => {
          inflight = null;
        });

      return inflight;
    },

    invalidate(): void {
      cached = null;
    },
  };
}
