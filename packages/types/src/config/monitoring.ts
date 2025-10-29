/**
 * Config Layer - Monitoring and Observability Configuration
 *
 * Logging, metrics, alerts, and performance monitoring configuration
 */

// ============================================================================
// Logging Configuration
// ============================================================================

/**
 * Logging Configuration
 */
export interface LoggingConfig {
  level: LogLevel;
  format: LogFormat;
  colorize: boolean;
  timestamp: boolean;
  prettyPrint: boolean;
  outputs: LogOutput[];
  filters?: LogFilter[];
  sampling?: LogSampling;
}

/**
 * Log Levels
 */
export const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  DEBUG: 'debug',
  VERBOSE: 'verbose',
  SILLY: 'silly',
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

/**
 * Log Formats
 */
export const LogFormat = {
  JSON: 'json',
  SIMPLE: 'simple',
  COMBINED: 'combined',
  CUSTOM: 'custom',
} as const;

export type LogFormat = (typeof LogFormat)[keyof typeof LogFormat];

/**
 * Log Output
 */
export interface LogOutput {
  type: 'console' | 'file' | 'http' | 'stream';
  level?: LogLevel;
  filename?: string; // For file output
  maxsize?: number; // For file output (bytes)
  maxFiles?: number; // For file rotation
  url?: string; // For HTTP output
  compress?: boolean; // For file rotation
}

/**
 * Log Filter
 */
export interface LogFilter {
  type: 'include' | 'exclude';
  pattern: string | RegExp;
  field?: string; // Log field to filter on
}

/**
 * Log Sampling
 */
export interface LogSampling {
  enabled: boolean;
  rate: number; // 0-1, percentage of logs to keep
  rules?: Array<{
    level: LogLevel;
    rate: number;
  }>;
}

// ============================================================================
// Metrics Configuration
// ============================================================================

/**
 * Metrics Configuration
 */
export interface MetricsConfig {
  enabled: boolean;
  prefix: string;
  interval: number; // Collection interval in milliseconds
  retention: number; // Data retention in milliseconds
  aggregation: MetricsAggregation;
  exporters: MetricsExporter[];
}

/**
 * Metrics Aggregation
 */
export interface MetricsAggregation {
  intervals: number[]; // Aggregation intervals in milliseconds
  functions: AggregationFunction[];
}

/**
 * Aggregation Functions
 */
export const AggregationFunction = {
  COUNT: 'count',
  SUM: 'sum',
  AVG: 'avg',
  MIN: 'min',
  MAX: 'max',
  P50: 'p50',
  P95: 'p95',
  P99: 'p99',
} as const;

export type AggregationFunction =
  (typeof AggregationFunction)[keyof typeof AggregationFunction];

/**
 * Metrics Exporter
 */
export interface MetricsExporter {
  type: 'prometheus' | 'statsd' | 'cloudwatch' | 'custom';
  endpoint?: string;
  interval?: number; // Export interval in milliseconds
  tags?: Record<string, string>;
}

// ============================================================================
// Performance Monitoring
// ============================================================================

/**
 * Performance Monitoring Configuration
 */
export interface PerformanceMonitoringConfig {
  enabled: boolean;
  sampling: PerformanceSampling;
  thresholds: PerformanceThresholds;
  tracking: PerformanceTracking;
}

/**
 * Performance Sampling
 */
export interface PerformanceSampling {
  rate: number; // 0-1, percentage of requests to sample
  adaptive: boolean; // Adjust rate based on load
  maxSamples: number; // Per interval
}

/**
 * Performance Thresholds
 */
export interface PerformanceThresholds {
  responseTime: {
    warn: number; // milliseconds
    critical: number; // milliseconds
  };
  databaseQuery: {
    warn: number; // milliseconds
    critical: number; // milliseconds
  };
  redisOperation: {
    warn: number; // milliseconds
    critical: number; // milliseconds
  };
  queueProcessing: {
    warn: number; // milliseconds
    critical: number; // milliseconds
  };
  memoryUsage: {
    warn: number; // percentage
    critical: number; // percentage
  };
  cpuUsage: {
    warn: number; // percentage
    critical: number; // percentage
  };
}

/**
 * Performance Tracking
 */
export interface PerformanceTracking {
  routes: boolean;
  database: boolean;
  redis: boolean;
  sockets: boolean;
  queues: boolean;
  externalAPIs: boolean;
}

// ============================================================================
// Database Monitoring
// ============================================================================

/**
 * Database Monitoring Configuration
 */
export interface DatabaseMonitoringConfig {
  enabled: boolean;
  logQueries: boolean;
  slowQueryThreshold: number; // milliseconds
  trackConnectionPool: boolean;
  trackQueryPerformance: boolean;
  sampleRate: number; // 0-1
}

// ============================================================================
// Error Tracking
// ============================================================================

/**
 * Error Tracking Configuration
 */
export interface ErrorTrackingConfig {
  enabled: boolean;
  service: 'sentry' | 'bugsnag' | 'rollbar' | 'custom';
  dsn?: string;
  environment: string;
  release?: string;
  sampleRate: number; // 0-1
  ignoreErrors?: Array<string | RegExp>;
  beforeSend?: (event: unknown) => unknown | null;
  integrations?: ErrorTrackingIntegration[];
}

/**
 * Error Tracking Integration
 */
export interface ErrorTrackingIntegration {
  name: string;
  config?: Record<string, unknown>;
}

// ============================================================================
// Alerting Configuration
// ============================================================================

/**
 * Alerting Configuration
 */
export interface AlertingConfig {
  enabled: boolean;
  channels: AlertChannel[];
  rules: AlertRule[];
  escalation: AlertEscalation;
  grouping: AlertGrouping;
}

/**
 * Alert Channel
 */
export interface AlertChannel {
  type: 'email' | 'slack' | 'pagerduty' | 'webhook' | 'custom';
  config: Record<string, unknown>;
  severities: AlertSeverity[];
}

/**
 * Alert Severity
 */
export const AlertSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
} as const;

export type AlertSeverity = (typeof AlertSeverity)[keyof typeof AlertSeverity];

/**
 * Alert Rule
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  condition: AlertCondition;
  severity: AlertSeverity;
  channels: string[]; // Channel IDs
  throttle?: number; // Minimum time between alerts in milliseconds
}

/**
 * Alert Condition
 */
export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  threshold: number;
  window: number; // Time window in milliseconds
  consecutiveBreaches?: number; // Number of consecutive breaches before alerting
}

/**
 * Alert Escalation
 */
export interface AlertEscalation {
  enabled: boolean;
  levels: Array<{
    delay: number; // milliseconds
    channels: string[];
  }>;
}

/**
 * Alert Grouping
 */
export interface AlertGrouping {
  enabled: boolean;
  window: number; // milliseconds
  maxGroupSize: number;
}

// ============================================================================
// Health Check Configuration
// ============================================================================

/**
 * Health Check Configuration
 */
export interface HealthCheckConfig {
  enabled: boolean;
  endpoint: string;
  interval: number; // milliseconds
  timeout: number; // milliseconds
  checks: HealthCheck[];
}

/**
 * Health Check
 */
export interface HealthCheck {
  name: string;
  type: 'database' | 'redis' | 'queue' | 'external_api' | 'custom';
  critical: boolean;
  timeout: number; // milliseconds
  config?: Record<string, unknown>;
}

// ============================================================================
// Tracing Configuration
// ============================================================================

/**
 * Distributed Tracing Configuration
 */
export interface TracingConfig {
  enabled: boolean;
  service: 'jaeger' | 'zipkin' | 'datadog' | 'custom';
  endpoint?: string;
  sampleRate: number; // 0-1
  tags?: Record<string, string>;
  propagation?: 'b3' | 'w3c' | 'jaeger';
}

// ============================================================================
// Profiling Configuration
// ============================================================================

/**
 * Profiling Configuration
 */
export interface ProfilingConfig {
  enabled: boolean;
  type: 'cpu' | 'heap' | 'both';
  sampleRate: number; // 0-1
  duration: number; // Profile duration in milliseconds
  outputPath?: string;
  uploadEndpoint?: string;
}

// ============================================================================
// Socket Handler Metrics
// ============================================================================

/**
 * Socket Handler Metrics
 */
export interface SocketHandlerMetrics {
  handlerName: string;
  count: number;
  totalDuration?: number;
  avgDuration: number;
  p95Duration: number;
  p99Duration: number;
  errors?: number;
  errorCount?: number;
  errorRate?: number;
  lastExecution?: string;
}

/**
 * BullMQ Metrics
 */
export interface BullMQMetrics {
  queueName: string;
  processed: number;
  failed: number;
  depth: number;
  oldestJobAge?: number;
  ageMs?: number;
  avgProcessingTime?: number;
  successRate?: number;
  lastUpdated: number;
}

/**
 * Alert Threshold
 */
export interface AlertThreshold {
  type?: string;
  metric: string;
  threshold: number;
  currentValue?: number;
  severity: AlertSeverity;
  message: string;
}
