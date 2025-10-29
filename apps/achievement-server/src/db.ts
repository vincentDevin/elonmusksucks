import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';
import type { SlowQueryRecord } from '@ems/types';
import {
  dbQueryDuration,
  dbQueryTotal,
  dbSlowQueries,
  dbErrorsTotal,
  safeIncCounter,
} from './lib/prometheusMetrics';

// Load environment variables based on NODE_ENV
// In production (Fly.io), environment variables are injected directly, no .env file needed
if (process.env.NODE_ENV !== 'production') {
  const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
  dotenv.config({ path: path.resolve(__dirname, '../../../', envFile) });
}

// ── DATABASE CONNECTION POOLING CONFIGURATION ─────────────────────────────────
// Optimized connection pool settings for production performance
// Note: For Fly Managed Postgres, connection parameters are configured via environment variables
// DATABASE_URL: Uses pgbouncer for connection pooling (port 5432)
// DIRECT_URL: Direct connection bypassing pgbouncer (port 5433) - used for migrations
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// ── PRISMA CLIENT CONFIGURATION ───────────────────────────────────────────────
// Configure Prisma with optimal settings for production
const prismaLogLevel: Prisma.LogLevel[] =
  process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'info', 'warn', 'error'];

const prisma = new PrismaClient({
  log: prismaLogLevel,
  errorFormat: 'colorless',
});

// ── QUERY PERFORMANCE MONITORING ──────────────────────────────────────────────
// Track slow queries and log performance metrics
interface QueryMetrics {
  model?: string;
  action?: string;
  duration: number;
  timestamp: Date;
}

const SLOW_QUERY_THRESHOLD = parseInt(process.env.SLOW_QUERY_MS || '100'); // 100ms default
const queryMetrics: QueryMetrics[] = [];
const MAX_METRICS_HISTORY = 1000; // Keep last 1000 queries for analysis
const topSlowQueries: SlowQueryRecord[] = []; // Track top 5 slowest queries
const MAX_SLOW_QUERIES = 5;

// Performance monitoring middleware using new $extends API
const prismaWithMiddleware = prisma.$extends({
  query: {
    $allOperations: async ({ model, operation, args, query }) => {
      const before = Date.now();

      try {
        const result = await query(args);
        const duration = Date.now() - before;

        // Track metrics
        const metric: QueryMetrics = {
          model,
          action: operation,
          duration,
          timestamp: new Date(),
        };

        // Store metrics (circular buffer)
        queryMetrics.push(metric);
        if (queryMetrics.length > MAX_METRICS_HISTORY) {
          queryMetrics.shift();
        }

        // ── PROMETHEUS METRICS ────────────────────────────────────────────────
        // Record Prometheus metrics for Grafana dashboards
        const durationSeconds = duration / 1000;
        const modelName = model || 'unknown';
        const operationName = operation || 'unknown';

        // Track query duration
        dbQueryDuration.observe({ operation: operationName, model: modelName }, durationSeconds);

        // Track query count
        safeIncCounter(dbQueryTotal, 1, {
          operation: operationName,
          model: modelName,
          status: 'success',
        });

        // Log slow queries
        if (duration > SLOW_QUERY_THRESHOLD) {
          // Track slow query count in Prometheus
          safeIncCounter(dbSlowQueries, 1, {
            operation: operationName,
            model: modelName,
          });
          const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          console.warn(`[SLOW QUERY] ${model}.${operation} took ${duration}ms [${traceId}]`);

          // Track top slow queries
          const slowQuery: SlowQueryRecord = {
            traceId,
            model: model || 'unknown',
            action: operation || 'unknown',
            duration,
            timestamp: new Date().toISOString(),
            params:
              process.env.NODE_ENV === 'development'
                ? JSON.stringify(args).substring(0, 200)
                : undefined,
          };

          // Add to top slow queries (keep top 5 slowest)
          topSlowQueries.push(slowQuery);
          topSlowQueries.sort((a, b) => b.duration - a.duration);
          if (topSlowQueries.length > MAX_SLOW_QUERIES) {
            topSlowQueries.pop();
          }

          // In production, you might want to send this to monitoring service
          if (process.env.NODE_ENV === 'production') {
            // TODO: Send to Sentry, DataDog, or other monitoring service
            console.error('[SLOW QUERY ALERT]', {
              traceId,
              model,
              action: operation,
              duration,
              // Don't log args in production for security reasons
              args: undefined,
            });
          }
        }

        // Log all queries in development
        if (process.env.NODE_ENV === 'development' && process.env.LOG_QUERIES === 'true') {
          console.log(`[QUERY] ${model}.${operation} - ${duration}ms`);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - before;
        const modelName = model || 'unknown';
        const operationName = operation || 'unknown';

        // Track database errors in Prometheus
        const errorType = error instanceof Error ? error.name : 'UnknownError';
        safeIncCounter(dbErrorsTotal, 1, {
          operation: operationName,
          model: modelName,
          error_type: errorType,
        });

        // Also count as failed query
        safeIncCounter(dbQueryTotal, 1, {
          operation: operationName,
          model: modelName,
          status: 'error',
        });

        console.error(`[QUERY ERROR] ${model}.${operation} failed after ${duration}ms`, error);
        throw error;
      }
    },
  },
});

// Export both the original client (for repositories) and extended client (for monitoring)
export { prisma }; // Original client for repositories
export { prismaWithMiddleware }; // Extended client with middleware

// ── CONNECTION HEALTH MONITORING ──────────────────────────────────────────────
// Monitor connection pool health and database connectivity
let isConnected = false;

// Prisma connects lazily on first query - no need for eager connection
// This allows the app to start even if DB is temporarily unavailable
const poolSize = process.env.DATABASE_CONNECTION_LIMIT || '3';
console.log('[DATABASE] Prisma client initialized (lazy connection)');
console.log(`[DATABASE] Connection pool size: ${poolSize}`);

// Graceful shutdown handling
const gracefulShutdown = async () => {
  console.log('[DATABASE] Closing database connections...');
  await prisma.$disconnect();
  console.log('[DATABASE] Database connections closed');
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// ── EXPORTED UTILITIES ────────────────────────────────────────────────────────
// Export performance monitoring utilities
export const getQueryMetrics = () => ({
  totalQueries: queryMetrics.length,
  averageDuration:
    queryMetrics.length > 0
      ? queryMetrics.reduce((sum, m) => sum + m.duration, 0) / queryMetrics.length
      : 0,
  slowQueries: queryMetrics.filter((m) => m.duration > SLOW_QUERY_THRESHOLD).length,
  recentQueries: queryMetrics.slice(-10),
});

export const clearQueryMetrics = () => {
  queryMetrics.length = 0;
};

export const getTopSlowQueries = (): SlowQueryRecord[] => {
  return [...topSlowQueries]; // Return copy to prevent external modification
};

export const isDbConnected = () => isConnected;

export default prisma;
