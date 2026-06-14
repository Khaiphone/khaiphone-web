interface CacheEntry<T> { data: T }
const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const e = store.get(key);
  return e ? (e.data as T) : null;
}

export function cacheSet<T>(key: string, data: T): void {
  store.set(key, { data });
}
