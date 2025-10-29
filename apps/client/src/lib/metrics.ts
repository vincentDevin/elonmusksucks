// Rollback: Delete this file and remove metrics import from axios.ts
// Dev-only performance metrics collection
interface RequestMetric {
  method: string;
  url: string;
  duration: number;
  status?: number;
  timestamp: number;
}

class DevMetrics {
  private requests: Map<string, RequestMetric[]> = new Map();
  private isDev = process.env.NODE_ENV === 'development';

  startRequest(id: string, method: string, url: string): void {
    if (!this.isDev) return;
    performance.mark(`request-start-${id}`);
  }

  endRequest(id: string, method: string, url: string, status?: number): void {
    if (!this.isDev) return;

    const endMark = `request-end-${id}`;
    const startMark = `request-start-${id}`;

    try {
      performance.mark(endMark);
      performance.measure(`request-${id}`, startMark, endMark);

      const measure = performance.getEntriesByName(`request-${id}`)[0];
      const duration = Math.round(measure.duration);

      const metric: RequestMetric = {
        method,
        url: this.sanitizeUrl(url),
        duration,
        status,
        timestamp: Date.now(),
      };

      // Store metrics by route for aggregation
      const routeKey = `${method} ${this.getRoutePattern(url)}`;
      const existing = this.requests.get(routeKey) || [];
      existing.push(metric);

      // Keep only last 20 requests per route
      if (existing.length > 20) {
        existing.splice(0, existing.length - 20);
      }

      this.requests.set(routeKey, existing);

      // Log request with timing
      console.log(
        `[API] ${method} ${this.sanitizeUrl(url)} - ${duration}ms (${status || 'pending'})`,
      );

      // Clean up performance entries
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(`request-${id}`);
    } catch (error) {
      // Ignore performance API errors
    }
  }

  getRequestSummary(): { [route: string]: { count: number; avgTime: number } } {
    if (!this.isDev) return {};

    const summary: { [route: string]: { count: number; avgTime: number } } = {};

    this.requests.forEach((metrics, route) => {
      const totalTime = metrics.reduce((sum, m) => sum + m.duration, 0);
      summary[route] = {
        count: metrics.length,
        avgTime: Math.round(totalTime / metrics.length),
      };
    });

    return summary;
  }

  private sanitizeUrl(url: string): string {
    // Remove query parameters and IDs for cleaner logging
    return url.replace(/\?.*$/, '').replace(/\/\d+/g, '/:id');
  }

  private getRoutePattern(url: string): string {
    // Convert specific URLs to patterns for grouping
    return this.sanitizeUrl(url);
  }
}

export const devMetrics = new DevMetrics();

// Expose summary for debugging
(window as any).__apiMetrics = () => {
  console.table(devMetrics.getRequestSummary());
};
