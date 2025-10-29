// Prometheus Metrics Service for ems-api
// Defines and exports all custom application metrics for monitoring

import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// ============================================================================
// Default Metrics (CPU, Memory, Event Loop, etc.)
// ============================================================================
// Enable default Node.js metrics collection
collectDefaultMetrics({
  prefix: 'ems_api_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // GC duration buckets
});

// ============================================================================
// HTTP Metrics
// ============================================================================

export const httpRequestDuration = new Histogram({
  name: 'ems_api_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});

export const httpRequestTotal = new Counter({
  name: 'ems_api_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpErrorsTotal = new Counter({
  name: 'ems_api_http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'status_code', 'error_type'],
});

// ============================================================================
// Database Metrics
// ============================================================================

export const dbQueryDuration = new Histogram({
  name: 'ems_api_db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const dbQueryTotal = new Counter({
  name: 'ems_api_db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'model', 'status'],
});

export const dbSlowQueries = new Counter({
  name: 'ems_api_db_slow_queries_total',
  help: 'Total number of slow queries (>100ms)',
  labelNames: ['operation', 'model'],
});

export const dbConnectionPoolSize = new Gauge({
  name: 'ems_api_db_connection_pool_size',
  help: 'Current database connection pool size',
  labelNames: ['state'], // 'active', 'idle', 'total'
});

export const dbErrorsTotal = new Counter({
  name: 'ems_api_db_errors_total',
  help: 'Total number of database errors',
  labelNames: ['operation', 'model', 'error_type'],
});

// ============================================================================
// Redis Metrics
// ============================================================================

export const redisOperationDuration = new Histogram({
  name: 'ems_api_redis_operation_duration_seconds',
  help: 'Duration of Redis operations',
  labelNames: ['command'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

export const redisOperationsTotal = new Counter({
  name: 'ems_api_redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['command', 'status'],
});

export const redisConnectionPoolSize = new Gauge({
  name: 'ems_api_redis_connection_pool_size',
  help: 'Current Redis connection pool size',
  labelNames: ['state'], // 'connected', 'ready'
});

export const redisPubSubEventsTotal = new Counter({
  name: 'ems_api_redis_pubsub_events_total',
  help: 'Total Redis pub/sub events published',
  labelNames: ['channel'],
});

export const redisErrorsTotal = new Counter({
  name: 'ems_api_redis_errors_total',
  help: 'Total number of Redis errors',
  labelNames: ['command', 'error_type'],
});

// ============================================================================
// Socket.IO Metrics
// ============================================================================

export const socketConnectionsActive = new Gauge({
  name: 'ems_api_socket_connections_active',
  help: 'Current number of active Socket.IO connections',
});

export const socketConnectionsTotal = new Counter({
  name: 'ems_api_socket_connections_total',
  help: 'Total Socket.IO connections (cumulative)',
  labelNames: ['event'], // 'connect', 'disconnect'
});

export const socketEventDuration = new Histogram({
  name: 'ems_api_socket_event_duration_seconds',
  help: 'Duration of Socket.IO event handlers',
  labelNames: ['event', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

export const socketEventsTotal = new Counter({
  name: 'ems_api_socket_events_total',
  help: 'Total Socket.IO events processed',
  labelNames: ['event', 'status'],
});

export const socketRoomsActive = new Gauge({
  name: 'ems_api_socket_rooms_active',
  help: 'Current number of active Socket.IO rooms',
});

export const socketErrorsTotal = new Counter({
  name: 'ems_api_socket_errors_total',
  help: 'Total Socket.IO errors',
  labelNames: ['event', 'error_type'],
});

// ============================================================================
// BullMQ Worker Metrics
// ============================================================================

export const queueJobsProcessed = new Counter({
  name: 'ems_api_queue_jobs_processed_total',
  help: 'Total jobs processed by queue',
  labelNames: ['queue', 'status'], // 'completed', 'failed'
});

export const queueJobDuration = new Histogram({
  name: 'ems_api_queue_job_duration_seconds',
  help: 'Duration of queue job processing',
  labelNames: ['queue', 'job_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
});

export const queueDepth = new Gauge({
  name: 'ems_api_queue_depth',
  help: 'Current queue depth (jobs waiting/active/delayed)',
  labelNames: ['queue', 'state'], // 'waiting', 'active', 'delayed'
});

export const queueOldestJobAge = new Gauge({
  name: 'ems_api_queue_oldest_job_age_seconds',
  help: 'Age of oldest job in queue',
  labelNames: ['queue'],
});

export const queueErrorsTotal = new Counter({
  name: 'ems_api_queue_errors_total',
  help: 'Total queue processing errors',
  labelNames: ['queue', 'error_type'],
});

// ============================================================================
// Application Business Metrics
// ============================================================================

export const activePredictions = new Gauge({
  name: 'ems_api_active_predictions',
  help: 'Current number of active predictions',
});

export const activeUsers = new Gauge({
  name: 'ems_api_active_users',
  help: 'Current number of active users (authenticated socket connections)',
});

export const betsPlacedTotal = new Counter({
  name: 'ems_api_bets_placed_total',
  help: 'Total bets placed',
  labelNames: ['prediction_type'], // 'BINARY', 'MULTIPLE', 'OVER_UNDER'
});

export const parlaysPlacedTotal = new Counter({
  name: 'ems_api_parlays_placed_total',
  help: 'Total parlays placed',
  labelNames: ['num_predictions'], // '2', '3', '4', '5+'
});

export const muskBucksVolume = new Counter({
  name: 'ems_api_muskbucks_volume_total',
  help: 'Total MuskBucks transacted',
  labelNames: ['transaction_type'], // 'bet', 'payout', 'pong_wager', 'registration_bonus'
});

export const predictionResolutionsTotal = new Counter({
  name: 'ems_api_prediction_resolutions_total',
  help: 'Total prediction resolutions',
  labelNames: ['outcome'], // 'resolved', 'canceled'
});

export const achievementsUnlockedTotal = new Counter({
  name: 'ems_api_achievements_unlocked_total',
  help: 'Total achievements unlocked',
  labelNames: ['category'], // 'BETTING', 'PONG', 'FINANCIAL', etc.
});

export const chatMessagesTotal = new Counter({
  name: 'ems_api_chat_messages_total',
  help: 'Total chat messages sent',
  labelNames: ['status'], // 'sent', 'rate_limited', 'moderated'
});

// ============================================================================
// Event System Metrics
// ============================================================================

export const eventBusEventsTotal = new Counter({
  name: 'ems_api_event_bus_events_total',
  help: 'Total events processed by event bus',
  labelNames: ['channel', 'status'],
});

export const eventBusProcessingDuration = new Histogram({
  name: 'ems_api_event_bus_processing_duration_seconds',
  help: 'Duration of event processing',
  labelNames: ['channel'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

export const eventBusPoolSize = new Gauge({
  name: 'ems_api_event_bus_pool_size',
  help: 'Current event bus connection pool size',
  labelNames: ['state'], // 'active', 'idle', 'total'
});

// ============================================================================
// Health & System Metrics
// ============================================================================

export const healthCheckStatus = new Gauge({
  name: 'ems_api_health_check_status',
  help: 'Health check status (1=healthy, 0=unhealthy)',
  labelNames: ['component'], // 'database', 'redis', 'overall'
});

export const uptimeSeconds = new Gauge({
  name: 'ems_api_uptime_seconds',
  help: 'Application uptime in seconds',
});

// Track application start time
const startTime = Date.now();

// Update uptime metric every minute
setInterval(() => {
  const uptimeSecs = (Date.now() - startTime) / 1000;
  uptimeSeconds.set(uptimeSecs);
}, 60000);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Helper function to wrap async operations with duration tracking
 */
export function timeOperation<T>(
  histogram: Histogram<string>,
  labels: Record<string, string>,
  operation: () => Promise<T>,
): Promise<T> {
  const end = histogram.startTimer(labels);
  return operation()
    .then((result) => {
      end();
      return result;
    })
    .catch((error) => {
      end();
      throw error;
    });
}

/**
 * Helper function to update gauge with error handling
 */
export function safeSetGauge(
  gauge: Gauge<string>,
  value: number,
  labels?: Record<string, string>,
): void {
  try {
    if (labels) {
      gauge.set(labels, value);
    } else {
      gauge.set(value);
    }
  } catch (error) {
    console.warn('[prometheusMetrics] Error setting gauge:', error);
  }
}

/**
 * Helper function to increment counter with error handling
 */
export function safeIncCounter(
  counter: Counter<string>,
  value: number = 1,
  labels?: Record<string, string>,
): void {
  try {
    if (labels) {
      counter.inc(labels, value);
    } else {
      counter.inc(value);
    }
  } catch (error) {
    console.warn('[prometheusMetrics] Error incrementing counter:', error);
  }
}

// ============================================================================
// Export Registry
// ============================================================================

/**
 * Prometheus registry containing all metrics
 * Used by /metrics endpoint to generate Prometheus-format output
 */
export { register };

/**
 * Get current metrics as Prometheus-format string
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Clear all metrics (useful for testing)
 */
export function clearMetrics(): void {
  register.clear();
}

// Log initialization
console.log(
  '[prometheusMetrics] Metrics initialized with',
  register.getMetricsAsArray().length,
  'metrics',
);
