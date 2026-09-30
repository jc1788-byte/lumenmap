import { MemoryCacheDriver } from "./memory-driver";
import { FakeRedisClient, RedisCacheDriver } from "./redis-driver";
import type { CacheDriver, RedisLikeClient } from "./types";

export type CacheBackendName = "memory" | "redis";

let activeDriver: CacheDriver | null = null;
let sharedRedisClient: RedisLikeClient | null = null;
let warnedFallback = false;

export function resolveCacheBackend(
  value: string | undefined = process.env.CACHE_BACKEND,
): CacheBackendName {
  const normalized = (value ?? "memory").trim().toLowerCase();
  return normalized === "redis" || normalized === "kv" ? "redis" : "memory";
}

/**
 * Select the active cache driver from env.
 * `CACHE_BACKEND=redis|kv` uses a Redis-like client (shared FakeRedis by default,
 * or an injected client). If Redis is requested but unavailable, falls back to
 * in-memory and logs once.
 */
export function getCacheDriver(): CacheDriver {
  if (activeDriver) return activeDriver;

  const backend = resolveCacheBackend();
  if (backend === "redis") {
    try {
      activeDriver = new RedisCacheDriver(getSharedRedisClient());
      return activeDriver;
    } catch (error) {
      if (!warnedFallback) {
        warnedFallback = true;
        const message =
          error instanceof Error ? error.message : "redis unavailable";
        console.warn(
          `[cache] CACHE_BACKEN=redis unavailable (${message}); falling back to in-memory`,
        );
      }
      activeDriver = new MemoryCacheDriver();
      return activeDriver;
    }
  }

  activeDriver = new MemoryCacheDriver();
  return activeDriver;
}

export function getSharedRedisClient(): RedisLikeClient {
  if (!sharedRedisClient) {
    // Process-local Redis/KV shim. Replace via setRedisClient() for real drivers.
    sharedRedisClient = new FakeRedisClient();
  }
  return sharedRedisClient;
}

/** Inject a Redis-like client (tests / Upstash shim / ioredis wrapper). */
export function setRedisClient(client: RedisLikeClient | null): void {
  sharedRedisClient = client;
  activeDriver = null;
  warnedFallback = false;
}

/** Force a specific driver (tests). Pass null to re-resolve from env. */
export function setCacheDriver(driver: CacheDriver | null): void {
  activeDriver = driver;
  warnedFallback = false;
}

export function resetCacheDriverState(): void {
  activeDriver = null;
  sharedRedisClient = null;
  warnedFallback = false;
}
