import type {
  DatabaseMetricsResponse,
  ClearMetricsResponse,
  HealthCheckResponse,
  DatabaseStatus,
  RedisStatus,
} from '@ems/types';

/**
 * Maps database status to standardized DatabaseStatus DTO
 * Converts Date → ISO string
 */
export const toDatabaseStatus = (status: {
  connected: boolean;
  timestamp: Date;
}): DatabaseStatus => ({
  connected: status.connected,
  timestamp: status.timestamp.toISOString(),
});

/**
 * Maps redis status to standardized RedisStatus DTO
 */
export const toRedisStatus = (status: {
  connected: boolean;
  memory?: string;
  error?: string;
}): RedisStatus => ({
  connected: status.connected,
  memory: status.memory,
  error: status.error,
});

/**
 * Maps database metrics to standardized DatabaseMetricsResponse DTO
 * Handles Date → ISO string conversion for all timestamps
 */
export const toDatabaseMetricsResponse = (data: {
  metrics: {
    totalQueries: number;
    averageDuration: number;
    slowQueries: number;
    recentQueries: Array<{
      model?: string;
      action?: string;
      duration: number;
      timestamp: Date;
    }>;
  };
  dbStatus: {
    connected: boolean;
    timestamp: Date;
  };
  redisStatus: {
    connected: boolean;
    memory?: string;
    error?: string;
  };
  timestamp: Date;
}): DatabaseMetricsResponse => ({
  database: {
    totalQueries: data.metrics.totalQueries,
    averageExecutionTime: data.metrics.averageDuration,
    slowQueries: data.metrics.recentQueries.map((query) => ({
      query: query.model && query.action ? `${query.model}.${query.action}` : 'unknown',
      duration: query.duration,
      timestamp: query.timestamp.toISOString(),
    })),
    status: toDatabaseStatus(data.dbStatus),
  },
  redis: toRedisStatus(data.redisStatus),
  timestamp: data.timestamp.toISOString(),
});

/**
 * Maps clear metrics response to standardized ClearMetricsResponse DTO
 * Converts Date → ISO string
 */
export const toClearMetricsResponse = (data: {
  success: boolean;
  message: string;
  timestamp: Date;
}): ClearMetricsResponse => ({
  success: data.success,
  message: data.message,
  timestamp: data.timestamp.toISOString(),
});

/**
 * Maps health check result to standardized HealthCheckResponse DTO
 * Converts Date → ISO string
 */
export const toHealthCheckResponse = (data: {
  status: 'healthy' | 'unhealthy';
  checks: {
    database: boolean;
    redis: boolean;
  };
  timestamp: Date;
}): HealthCheckResponse => ({
  status: data.status,
  checks: data.checks,
  timestamp: data.timestamp.toISOString(),
});
