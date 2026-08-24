/**
 * Cache abstraction. Default store is per-isolate memory; swap in Redis/Upstash
 * with `setCacheStore` without touching call sites.
 */
export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
}

class MemoryCacheStore implements CacheStore {
  private readonly entries = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const hit = this.entries.get(key);
    if (!hit) return null;
    if (hit.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return hit.value;
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    if (this.entries.size > 5_000) this.evict();
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  async deletePrefix(prefix: string): Promise<void> {
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) this.entries.delete(key);
    }
  }

  private evict(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
  }
}

let store: CacheStore = new MemoryCacheStore();

export function setCacheStore(next: CacheStore): void {
  store = next;
}

/** Logical namespaces with their default TTLs. */
export const CACHE_NAMESPACES = {
  users: 60_000,
  projects: 30_000,
  permissions: 120_000,
  sessions: 30_000,
  notifications: 15_000,
  pricing: 600_000,
  reference: 3_600_000,
} as const;

export type CacheNamespace = keyof typeof CACHE_NAMESPACES;

function cacheKey(namespace: CacheNamespace, key: string): string {
  return `${namespace}:${key}`;
}

export async function cacheGet<T>(namespace: CacheNamespace, key: string): Promise<T | null> {
  const raw = await store.get(cacheKey(namespace, key));
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(
  namespace: CacheNamespace,
  key: string,
  value: T,
  ttlMs = CACHE_NAMESPACES[namespace],
): Promise<void> {
  await store.set(cacheKey(namespace, key), JSON.stringify(value), ttlMs);
}

export async function cacheInvalidate(namespace: CacheNamespace, key?: string): Promise<void> {
  if (key) await store.delete(cacheKey(namespace, key));
  else await store.deletePrefix(`${namespace}:`);
}

/** Read-through helper: single source of truth for cache population. */
export async function cached<T>(
  namespace: CacheNamespace,
  key: string,
  loader: () => Promise<T>,
  ttlMs = CACHE_NAMESPACES[namespace],
): Promise<T> {
  const hit = await cacheGet<T>(namespace, key);
  if (hit !== null) return hit;
  const value = await loader();
  await cacheSet(namespace, key, value, ttlMs);
  return value;
}

export async function cacheHealthy(): Promise<boolean> {
  const probe = `__health:${Date.now()}`;
  await store.set(probe, "1", 5_000);
  const value = await store.get(probe);
  await store.delete(probe);
  return value === "1";
}
