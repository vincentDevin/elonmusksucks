// apps/achievement-server/src/config/redis.ts
// -----------------------------------------------------------------------------
// Redis client for achievement server
//  • Supports REDIS_URL (incl. rediss:// for TLS) or host/port/pass env vars.
//  • Adds retry strategy and reconnection logging.
// -----------------------------------------------------------------------------

import 'dotenv/config';
import IORedis, { type RedisOptions } from 'ioredis';

const {
  REDIS_URL,
  REDIS_HOST = '127.0.0.1',
  REDIS_PORT = '6379',
  REDIS_PASSWORD,
  REDIS_USERNAME,
} = process.env;

// ── Retry strategy: exponential back-off capped at 2 seconds ────────────────
const retryStrategy = (times: number) => Math.min(times * 50, 2000);

let redisClient: IORedis;

if (REDIS_URL) {
  // Production / cloud env: URL may be redis:// or rediss://
  redisClient = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
    retryStrategy,
    // Allow TLS without extra certs if the URL is rediss://
    tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  });
} else {
  // Local dev fallback with authentication support
  const options: RedisOptions = {
    host: REDIS_HOST,
    port: Number.parseInt(REDIS_PORT, 10) || 6379,
    password: REDIS_PASSWORD,
    username: REDIS_USERNAME, // ACL username if provided
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
    retryStrategy,
  };
  redisClient = new IORedis(options);
}

// ── Diagnostics ─────────────────────────────────────────────────────────────
redisClient.on('connect', () => {
  console.log(
    '[AchievementServer:Redis] connected →',
    REDIS_URL ? REDIS_URL : `${REDIS_HOST}:${REDIS_PORT}`,
  );
});
redisClient.on('reconnecting', () => {
  console.warn('[AchievementServer:Redis] reconnecting…');
});
redisClient.on('end', () => {
  console.warn('[AchievementServer:Redis] connection closed');
});
redisClient.on('error', (err: Error) => {
  console.error('[AchievementServer:Redis] error', err);
});

export default redisClient;
