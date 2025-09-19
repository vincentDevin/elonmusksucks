import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';
import type { SlowQueryRecord } from '@ems/types';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(__dirname, '../../../', envFile) });

// ── DATABASE CONNECTION POOLING CONFIGURATION ─────────────────────────────────
// Optimized connection pool settings for production performance
const connectionLimit = process.env.DATABASE_CONNECTION_LIMIT
  ? parseInt(process.env.DATABASE_CONNECTION_LIMIT)
  : 10;

// Build connection URL with pooling parameters
const getDatabaseUrl = () => {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) throw new Error('DATABASE_URL is not set');

  // Add connection pooling parameters to the URL
  const url = new URL(baseUrl);
  url.searchParams.set('connection_limit', connectionLimit.toString());
  url.searchParams.set('pool_timeout', '10'); // 10 seconds timeout
  url.searchParams.set('connect_timeout', '10'); // 10 seconds connection timeout
  url.searchParams.set('pgbouncer', 'true'); // Enable PgBouncer mode if available

  return url.toString();
};

// ── PRISMA CLIENT CONFIGURATION ───────────────────────────────────────────────
// Configure Prisma with optimal settings for production
const prismaLogLevel: Prisma.LogLevel[] =
  process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'info', 'warn', 'error'];

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
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

        // Log slow queries
        if (duration > SLOW_QUERY_THRESHOLD) {
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

// Verify database connection on startup
prisma
  .$connect()
  .then(() => {
    isConnected = true;
    console.log('[DATABASE] Successfully connected to PostgreSQL');
    console.log(`[DATABASE] Connection pool size: ${connectionLimit}`);
  })
  .catch((error) => {
    console.error('[DATABASE] Failed to connect:', error);
    process.exit(1);
  });

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
