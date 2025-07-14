// apps/server/src/lib/redis.ts
import 'dotenv/config';
import IORedis, { type RedisOptions } from 'ioredis';

// Load environment variables
const { REDIS_URL, REDIS_HOST = '127.0.0.1', REDIS_PORT = '6379', REDIS_PASSWORD } = process.env;

// Initialize Redis client; allow URL in production or host/port locally
let redisClient: IORedis;

if (REDIS_URL) {
  // Production or configured URL
  redisClient = new IORedis(REDIS_URL);
} else {
  // Local development configuration
  const options: RedisOptions = {
    host: REDIS_HOST,
    port: Number.parseInt(REDIS_PORT, 10) || 6379,
    ...(REDIS_PASSWORD ? { password: REDIS_PASSWORD } : {}),
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
  };
  redisClient = new IORedis(options);
}

// Diagnostics
redisClient.on('connect', () => {
  console.log('[redis] connected on', REDIS_URL ? REDIS_URL : `${REDIS_HOST}:${REDIS_PORT}`);
});

redisClient.on('error', (err: Error) => {
  console.error('[redis] error', err);
});

export default redisClient;
