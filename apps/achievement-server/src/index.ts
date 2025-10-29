// apps/achievement-server/src/index.ts
// -----------------------------------------------------------------------------
// Achievement Server - Dedicated microservice for achievement processing
// Subscribes to Redis events and processes achievement unlocks asynchronously
// -----------------------------------------------------------------------------

import 'dotenv/config';
import http from 'http';
import { PrismaClient } from '@prisma/client';
import { setupAchievementRedisHandlers } from './handlers/achievementEventHandler';
import env from './config/env';
import redis from './config/redis';
import { register as metricsRegister } from 'prom-client';

// Initialize Prisma client
const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Track startup time
const startTime = Date.now();

// ── Health Check & Metrics Server ───────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // CORS headers for metrics
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === '/health') {
    try {
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;

      // Check Redis connection
      const redisPing = await redis.ping();

      if (redisPing !== 'PONG') {
        throw new Error('Redis ping failed');
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'healthy',
          uptime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          checks: {
            database: 'ok',
            redis: 'ok',
          },
        }),
      );
    } catch (error) {
      console.error('[AchievementServer] Health check failed:', error);
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }),
      );
    }
    return;
  }

  // Metrics endpoint for Prometheus
  if (req.url === '/metrics') {
    res.writeHead(200, { 'Content-Type': metricsRegister.contentType });
    res.end(await metricsRegister.metrics());
    return;
  }

  // Default 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

// ── Startup Sequence ────────────────────────────────────────────────────────
async function start() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║         Achievement Server Starting                            ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Test database connection
    console.log('[AchievementServer] Testing database connection...');
    await prisma.$connect();
    console.log('[AchievementServer] ✅ Database connected');

    // Test Redis connection
    console.log('[AchievementServer] Testing Redis connection...');
    const redisPing = await redis.ping();
    if (redisPing !== 'PONG') {
      throw new Error('Redis connection failed');
    }
    console.log('[AchievementServer] ✅ Redis connected');

    // Set up achievement Redis handlers (subscribes to 75+ channels)
    console.log('[AchievementServer] Setting up Redis event subscribers...');
    const achievementSub = setupAchievementRedisHandlers();
    console.log('[AchievementServer] ✅ Redis subscribers active');

    // Start HTTP server for health checks and metrics
    server.listen(env.PORT, () => {
      console.log(`[AchievementServer] ✅ Health check server listening on port ${env.PORT}`);
      console.log(`[AchievementServer]    - Health: http://localhost:${env.PORT}/health`);
      console.log(`[AchievementServer]    - Metrics: http://localhost:${env.PORT}/metrics`);
    });

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║    Achievement Server Ready - Processing Events                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n[AchievementServer] ${signal} received, shutting down gracefully...`);

      // Close HTTP server
      server.close(() => {
        console.log('[AchievementServer] HTTP server closed');
      });

      // Disconnect Redis
      achievementSub.disconnect();
      redis.disconnect();
      console.log('[AchievementServer] Redis connections closed');

      // Disconnect Prisma
      await prisma.$disconnect();
      console.log('[AchievementServer] Database connection closed');

      console.log('[AchievementServer] ✅ Shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('[AchievementServer] ❌ Uncaught Exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[AchievementServer] ❌ Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('UNHANDLED_REJECTION');
    });
  } catch (error) {
    console.error('\n❌ Achievement Server failed to start:', error);
    process.exit(1);
  }
}

// Start the server
start();
