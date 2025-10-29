// apps/server/src/lib/redis.ts
// -----------------------------------------------------------------------------
// Central Redis client with sensible defaults for both dev and prod.
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

// ── Timeout configuration ────────────────────────────────────────────────────
// Prevent Redis connection from hanging indefinitely
const REDIS_CONNECT_TIMEOUT = 5000; // 5s to establish connection
// Note: No commandTimeout - during startup, legitimate operations (138 channel subscriptions,
// leaderboard refresh, etc.) can take >3s. Server-level timeouts handle hung requests.

if (REDIS_URL) {
  // Production / cloud env: URL may be redis:// or rediss://
  redisClient = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null, // MUST be null for BullMQ blocking commands
    enableOfflineQueue: true,
    retryStrategy,
    connectTimeout: REDIS_CONNECT_TIMEOUT,
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
    maxRetriesPerRequest: null, // MUST be null for BullMQ blocking commands
    enableOfflineQueue: true,
    retryStrategy,
    connectTimeout: REDIS_CONNECT_TIMEOUT,
  };
  redisClient = new IORedis(options);
}

// ── Diagnostics ─────────────────────────────────────────────────────────────
redisClient.on('connect', () => {
  console.log('[redis] connected →', REDIS_URL ? REDIS_URL : `${REDIS_HOST}:${REDIS_PORT}`);
  console.log(
    `[redis] Timeouts: connect=${REDIS_CONNECT_TIMEOUT}ms (no command timeout - server handles request timeouts)`,
  );
});
redisClient.on('reconnecting', () => {
  console.warn('[redis] reconnecting…');
});
redisClient.on('end', () => {
  console.warn('[redis] connection closed');
});
redisClient.on('error', (err: Error) => {
  console.error('[redis] error', err);
});

export default redisClient;
