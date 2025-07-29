// packages/cache/index.ts
import { createClient } from "redis";
import { env } from "./env";

export const redis = createClient({
  url: env.REDIS_URL,
});

redis.on("error", (err) => console.error("Redis Client Error", err));

// Ensure connection before using
async function getRedis() {
  if (!redis.isOpen) await redis.connect();
  return redis;
}

/**
 *
 * @param key
 * @param value
 * @param ttl  Time to live in seconds, default is 600 seconds (10 minutes)
 */
export const setCache = async (key: string, value: any, ttl = 600) => {
  await getRedis();
  const jsonValue = JSON.stringify(value);
  await redis.set(key, jsonValue, {
    EX: ttl, // TTL in seconds
  });
};

export const getCache = async <T = any>(key: string): Promise<T | null> => {
  await getRedis();
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
};

export const delCache = async (key: string) => {
  await getRedis();
  await redis.del(key);
};
