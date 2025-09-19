// apps/client/src/lib/hydrationWatermark.ts
// Hydration watermark system to prevent pre-boot event races
// SAFETY: Ensures events are only processed after React hydration completes

import React from 'react';

interface HydrationState {
  isHydrated: boolean;
  isHydrating: boolean;
  hydrationStartTime: number | null;
  hydrationCompleteTime: number | null;
  queuedEvents: Array<{
    eventName: string;
    payload: unknown;
    timestamp: number;
    id: string;
  }>;
}

class HydrationWatermark {
  private state: HydrationState = {
    isHydrated: false,
    isHydrating: false,
    hydrationStartTime: null,
    hydrationCompleteTime: null,
    queuedEvents: [],
  };

  private eventProcessors: Map<string, Set<(payload: unknown) => void>> = new Map();
  private hydrationPromise: Promise<void> | null = null;
  private hydrationResolve: (() => void) | null = null;

  constructor() {
    // Initialize hydration promise
    this.hydrationPromise = new Promise((resolve) => {
      this.hydrationResolve = resolve;
    });

    // Auto-detect hydration completion via multiple methods
    this.setupHydrationDetection();
  }

  /**
   * Set up multiple detection methods for hydration completion
   */
  private setupHydrationDetection() {
    // Method 1: Document ready state
    if (typeof document !== 'undefined') {
      if (document.readyState === 'complete') {
        // Already loaded
        this.startHydrationCheck();
      } else {
        // Wait for load
        window.addEventListener('load', () => this.startHydrationCheck());
      }
    }

    // Method 2: React hydration detection via DOM changes
    if (typeof window !== 'undefined') {
      // Use requestIdleCallback for non-blocking detection
      const checkHydration = () => {
        if (this.state.isHydrated) return;

        // Check if React has hydrated by looking for React fiber properties
        const rootElement = document.getElementById('root');
        if (
          (rootElement && (rootElement as any)._reactInternalFiber) ||
          (rootElement && (rootElement as any)._reactInternalInstance) ||
          (rootElement &&
            Object.keys(rootElement).some((key) => key.startsWith('__reactInternalInstance')))
        ) {
          this.completeHydration();
        } else {
          // Schedule next check
          if ('requestIdleCallback' in window) {
            requestIdleCallback(checkHydration);
          } else {
            setTimeout(checkHydration, 16); // ~60fps fallback
          }
        }
      };

      // Start checking after initial render
      setTimeout(checkHydration, 0);
    }
  }

  private startHydrationCheck() {
    if (this.state.isHydrating) return;

    this.state.isHydrating = true;
    this.state.hydrationStartTime = Date.now();

    console.log('[HydrationWatermark] Starting hydration detection');
  }

  /**
   * Mark hydration as complete and process queued events
   */
  private completeHydration() {
    if (this.state.isHydrated) return;

    this.state.isHydrated = true;
    this.state.isHydrating = false;
    this.state.hydrationCompleteTime = Date.now();

    const duration = this.state.hydrationCompleteTime - (this.state.hydrationStartTime || 0);
    console.log(
      `[HydrationWatermark] Hydration complete in ${duration}ms, processing ${this.state.queuedEvents.length} queued events`,
    );

    // Process queued events
    this.processQueuedEvents();

    // Resolve the hydration promise
    if (this.hydrationResolve) {
      this.hydrationResolve();
    }
  }

  /**
   * Force mark hydration as complete (for manual control)
   */
  public markHydrationComplete() {
    this.completeHydration();
  }

  /**
   * Wait for hydration to complete
   */
  public async waitForHydration(): Promise<void> {
    if (this.state.isHydrated) return;
    return this.hydrationPromise || Promise.resolve();
  }

  /**
   * Check if app is fully hydrated
   */
  public isHydrated(): boolean {
    return this.state.isHydrated;
  }

  /**
   * Process an event - either immediately or queue for post-hydration
   */
  public processEvent(eventName: string, payload: unknown) {
    if (this.state.isHydrated) {
      // Process immediately
      this.executeEventProcessors(eventName, payload);
    } else {
      // Queue for post-hydration processing
      const event = {
        eventName,
        payload,
        timestamp: Date.now(),
        id: `${eventName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      this.state.queuedEvents.push(event);

      console.log(
        `[HydrationWatermark] Queued event: ${eventName} (${this.state.queuedEvents.length} total queued)`,
      );
    }
  }

  /**
   * Register an event processor
   */
  public registerEventProcessor(eventName: string, processor: (payload: unknown) => void) {
    if (!this.eventProcessors.has(eventName)) {
      this.eventProcessors.set(eventName, new Set());
    }
    this.eventProcessors.get(eventName)!.add(processor);
  }

  /**
   * Unregister an event processor
   */
  public unregisterEventProcessor(eventName: string, processor: (payload: unknown) => void) {
    const processors = this.eventProcessors.get(eventName);
    if (processors) {
      processors.delete(processor);
      if (processors.size === 0) {
        this.eventProcessors.delete(eventName);
      }
    }
  }

  /**
   * Execute all registered processors for an event
   */
  private executeEventProcessors(eventName: string, payload: unknown) {
    const processors = this.eventProcessors.get(eventName);
    if (processors) {
      processors.forEach((processor) => {
        try {
          processor(payload);
        } catch (error) {
          console.error(`[HydrationWatermark] Error processing event ${eventName}:`, error);
        }
      });
    }
  }

  /**
   * Process all queued events in chronological order
   */
  private processQueuedEvents() {
    // Sort by timestamp to maintain event order
    const sortedEvents = this.state.queuedEvents.sort((a, b) => a.timestamp - b.timestamp);

    for (const event of sortedEvents) {
      console.log(`[HydrationWatermark] Processing queued event: ${event.eventName}`);
      this.executeEventProcessors(event.eventName, event.payload);
    }

    // Clear the queue
    this.state.queuedEvents = [];
  }

  /**
   * Get hydration metrics for debugging
   */
  public getMetrics() {
    return {
      isHydrated: this.state.isHydrated,
      isHydrating: this.state.isHydrating,
      hydrationDuration:
        this.state.hydrationCompleteTime && this.state.hydrationStartTime
          ? this.state.hydrationCompleteTime - this.state.hydrationStartTime
          : null,
      queuedEventsCount: this.state.queuedEvents.length,
      registeredEventTypes: Array.from(this.eventProcessors.keys()),
      activeProcessorCount: Array.from(this.eventProcessors.values()).reduce(
        (total, processors) => total + processors.size,
        0,
      ),
    };
  }
}

// Global singleton instance
export const hydrationWatermark = new HydrationWatermark();

// React hook for hydration-aware event processing
export function useHydrationAwareEvent<T = unknown>(
  eventName: string,
  handler: (payload: T) => void,
  deps: React.DependencyList = [],
): boolean {
  const [isReady, setIsReady] = React.useState(hydrationWatermark.isHydrated());

  React.useEffect(() => {
    // Register the handler
    const processor = (payload: unknown) => handler(payload as T);
    hydrationWatermark.registerEventProcessor(eventName, processor);

    // Wait for hydration if not already complete
    if (!hydrationWatermark.isHydrated()) {
      hydrationWatermark.waitForHydration().then(() => {
        setIsReady(true);
      });
    }

    return () => {
      hydrationWatermark.unregisterEventProcessor(eventName, processor);
    };
  }, [eventName, ...deps]);

  return isReady;
}

export default hydrationWatermark;
