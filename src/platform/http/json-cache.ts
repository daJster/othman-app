const MAX_CACHE_ENTRIES = 50;
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CachedEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CachedEntry<unknown>>();

export function setCachedJson<T>(
  url: string,
  data: T,
  ttlMs = DEFAULT_TTL_MS,
): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }

  cache.set(url, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

export function getCachedJson<T>(url: string): T | undefined {
  const entry = cache.get(url);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(url);
    return undefined;
  }
  return entry.data as T;
}

export function clearJsonCache(url?: string): void {
  if (url) {
    cache.delete(url);
    return;
  }
  cache.clear();
}
