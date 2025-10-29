// apps/server/src/lib/metrics.ts
// Minimal metrics collection for socket handlers - p95/p99 latency tracking

import type { SocketHandlerMetrics, BullMQMetrics, AlertThreshold } from '@ems/types';

interface HistogramData {
  count: number;
  sum: number;
  buckets: Map<number, number>; // bucket upper bound -> count
}

// Simple histogram buckets for socket handler duration (ms)
const DURATION_BUCKETS = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

interface QueueMetrics {
  processed: number;
  failed: number;
  depth: number;
  oldestJobAge: number;
  lastUpdated: number;
}

class MetricsCollector {
  private histograms = new Map<string, HistogramData>();
  private counters = new Map<string, number>();
  private queueMetrics = new Map<string, QueueMetrics>();

  /**
   * Record socket handler execution time
   */
  recordHandlerDuration(handlerName: string, durationMs: number, success: boolean = true): void {
    const histogramKey = `socket.handler.duration_ms.${handlerName}`;
    const errorKey = `socket.handler.errors.${handlerName}`;

    // Update histogram
    let histogram = this.histograms.get(histogramKey);
    if (!histogram) {
      histogram = {
        count: 0,
        sum: 0,
        buckets: new Map(DURATION_BUCKETS.map((b) => [b, 0])),
      };
      this.histograms.set(histogramKey, histogram);
    }

    histogram.count++;
    histogram.sum += durationMs;

    // Update buckets
    for (const bucket of DURATION_BUCKETS) {
      if (durationMs <= bucket) {
        histogram.buckets.set(bucket, (histogram.buckets.get(bucket) || 0) + 1);
      }
    }

    // Update error counter
    if (!success) {
      this.counters.set(errorKey, (this.counters.get(errorKey) || 0) + 1);
    }
  }

  /**
   * Get handler metrics for monitoring/alerting
   */
  getHandlerMetrics(handlerName: string): SocketHandlerMetrics | null {
    const histogramKey = `socket.handler.duration_ms.${handlerName}`;
    const errorKey = `socket.handler.errors.${handlerName}`;

    const histogram = this.histograms.get(histogramKey);
    if (!histogram || histogram.count === 0) return null;

    // Calculate percentiles from buckets
    const p95Count = Math.ceil(histogram.count * 0.95);
    const p99Count = Math.ceil(histogram.count * 0.99);

    let p95 = 0;
    let p99 = 0;
    let runningCount = 0;

    for (const [bucket, count] of Array.from(histogram.buckets).sort(([a], [b]) => a - b)) {
      runningCount += count;
      if (p95 === 0 && runningCount >= p95Count) p95 = bucket;
      if (p99 === 0 && runningCount >= p99Count) p99 = bucket;
      if (p95 > 0 && p99 > 0) break;
    }

    return {
      handlerName,
      count: histogram.count,
      avgDuration: histogram.sum / histogram.count,
      p95Duration: p95,
      p99Duration: p99,
      errorCount: this.counters.get(errorKey) || 0,
      errorRate: histogram.count > 0 ? (this.counters.get(errorKey) || 0) / histogram.count : 0,
    };
  }

  /**
   * Wrapper for timing socket handler execution
   */
  timeHandler<T>(handlerName: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    return fn()
      .then((result) => {
        this.recordHandlerDuration(handlerName, Date.now() - start, true);
        return result;
      })
      .catch((error) => {
        this.recordHandlerDuration(handlerName, Date.now() - start, false);
        throw error;
      });
  }

  /**
   * Record BullMQ job completion
   */
  recordJobComplete(queueName: string, success: boolean): void {
    let metrics = this.queueMetrics.get(queueName);
    if (!metrics) {
      metrics = { processed: 0, failed: 0, depth: 0, oldestJobAge: 0, lastUpdated: Date.now() };
      this.queueMetrics.set(queueName, metrics);
    }

    metrics.processed++;
    if (!success) metrics.failed++;
    metrics.lastUpdated = Date.now();
  }

  /**
   * Update queue depth and age metrics
   */
  updateQueueDepth(queueName: string, depth: number, oldestJobAge: number): void {
    let metrics = this.queueMetrics.get(queueName);
    if (!metrics) {
      metrics = { processed: 0, failed: 0, depth: 0, oldestJobAge: 0, lastUpdated: Date.now() };
      this.queueMetrics.set(queueName, metrics);
    }

    metrics.depth = depth;
    metrics.oldestJobAge = oldestJobAge;
    metrics.lastUpdated = Date.now();
  }

  /**
   * Get BullMQ queue metrics for dashboard panels
   */
  getQueueMetrics(queueName: string): BullMQMetrics | null {
    const metrics = this.queueMetrics.get(queueName);
    if (!metrics) return null;

    const successRate =
      metrics.processed > 0 ? (metrics.processed - metrics.failed) / metrics.processed : 0;

    return {
      queueName,
      depth: metrics.depth,
      ageMs: metrics.oldestJobAge,
      processed: metrics.processed,
      failed: metrics.failed,
      successRate,
      lastUpdated: metrics.lastUpdated,
    };
  }

  /**
   * Check metrics against alert thresholds
   */
  checkAlertThresholds(): AlertThreshold[] {
    const alerts: AlertThreshold[] = [];

    // Check queue lag and depth thresholds
    this.queueMetrics.forEach((metrics, queueName) => {
      // Queue depth threshold: > 25 jobs
      if (metrics.depth > 25) {
        alerts.push({
          type: 'queue_depth_high',
          severity: 'critical',
          metric: `bullmq.queue.depth.${queueName}`,
          currentValue: metrics.depth,
          threshold: 25,
          message: `Queue ${queueName} depth (${metrics.depth}) exceeds threshold (25)`,
        });
      }

      // Queue age threshold: > 60 seconds
      if (metrics.oldestJobAge > 60000) {
        // 60 seconds in ms
        alerts.push({
          type: 'queue_age_high',
          severity: 'warning',
          metric: `bullmq.queue.age_ms.${queueName}`,
          currentValue: metrics.oldestJobAge,
          threshold: 60000,
          message: `Queue ${queueName} oldest job age (${Math.round(metrics.oldestJobAge / 1000)}s) exceeds threshold (60s)`,
        });
      }
    });

    // Check socket error rate thresholds
    this.histograms.forEach((histogram, handlerName) => {
      if (handlerName.includes('socket.handler.duration_ms')) {
        const errorKey = handlerName.replace('duration_ms', 'errors');
        const errorCount = this.counters.get(errorKey) || 0;
        const errorRate = histogram.count > 0 ? errorCount / histogram.count : 0;

        // Socket error rate threshold: > 2%
        if (errorRate > 0.02) {
          alerts.push({
            type: 'socket_error_rate_high',
            severity: 'warning',
            metric: `socket.handler.error_rate.${handlerName.split('.').pop()}`,
            currentValue: errorRate * 100,
            threshold: 2,
            message: `Socket handler error rate (${(errorRate * 100).toFixed(1)}%) exceeds threshold (2%)`,
          });
        }
      }
    });

    return alerts;
  }

  /**
   * Log active alerts
   */
  logActiveAlerts(): void {
    const alerts = this.checkAlertThresholds();
    if (alerts.length > 0) {
      console.warn(
        `[metrics] ${alerts.length} active alerts:`,
        alerts.map((a) => ({
          type: a.type,
          severity: a.severity,
          message: a.message,
        })),
      );
    }
  }
}

export const metricsCollector = new MetricsCollector();
