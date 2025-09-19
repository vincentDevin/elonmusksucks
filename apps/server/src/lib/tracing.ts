// apps/server/src/lib/tracing.ts
// Minimal distributed tracing for request flows

import { randomUUID } from 'crypto';
import type { TraceSpan, TraceContext } from '@ems/types';

interface ActiveSpan extends TraceSpan {
  startTime: number;
  children: string[];
}

class TracingCollector {
  private spans = new Map<string, ActiveSpan>();
  private activeContext: TraceContext | null = null;

  /**
   * Start a new root trace span
   */
  startRootSpan(operationName: string, metadata: Record<string, any> = {}): TraceSpan {
    const traceId = randomUUID();
    const spanId = randomUUID();

    const span: ActiveSpan = {
      traceId,
      spanId,
      operationName,
      metadata,
      startTime: Date.now(),
      children: [],
    };

    this.spans.set(spanId, span);
    this.activeContext = { traceId, parentSpanId: spanId };

    return span;
  }

  /**
   * Start a child span from current context
   */
  startChildSpan(operationName: string, metadata: Record<string, any> = {}): TraceSpan | null {
    if (!this.activeContext) return null;

    const spanId = randomUUID();
    const parentSpan = this.spans.get(this.activeContext.parentSpanId);

    const span: ActiveSpan = {
      traceId: this.activeContext.traceId,
      spanId,
      operationName,
      metadata,
      startTime: Date.now(),
      children: [],
    };

    this.spans.set(spanId, span);

    // Link to parent
    if (parentSpan) {
      parentSpan.children.push(spanId);
    }

    // Update active context
    this.activeContext = { ...this.activeContext, parentSpanId: spanId };

    return span;
  }

  /**
   * Finish a span and log the trace
   */
  finishSpan(spanId: string, success: boolean = true, error?: string): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    const duration = Date.now() - span.startTime;

    console.log(
      `[trace] ${span.traceId} ${span.operationName} ${duration}ms ${success ? 'SUCCESS' : 'ERROR'}`,
      {
        spanId: span.spanId,
        traceId: span.traceId,
        operation: span.operationName,
        duration,
        success,
        error,
        metadata: span.metadata,
      },
    );

    // Clean up completed span
    this.spans.delete(spanId);
  }

  /**
   * Get current trace context for propagation
   */
  getCurrentContext(): TraceContext | null {
    return this.activeContext;
  }

  /**
   * Set trace context (for propagation from upstream)
   */
  setContext(context: TraceContext): void {
    this.activeContext = context;
  }

  /**
   * Wrapper for tracing function execution
   */
  async trace<T>(
    operationName: string,
    fn: () => Promise<T>,
    metadata: Record<string, any> = {},
  ): Promise<T> {
    const span = this.activeContext
      ? this.startChildSpan(operationName, metadata)
      : this.startRootSpan(operationName, metadata);

    if (!span) return fn();

    try {
      const result = await fn();
      this.finishSpan(span.spanId, true);
      return result;
    } catch (error) {
      this.finishSpan(span.spanId, false, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
}

export const tracingCollector = new TracingCollector();
