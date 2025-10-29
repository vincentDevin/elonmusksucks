// apps/client/src/contexts/EventBusCoreContext.tsx
// -----------------------------------------------------------------------------
// PURE EventBus Core - No re-renders, stable event handling
// Split from EventBusContext to eliminate metrics-caused re-render performance issues
// -----------------------------------------------------------------------------

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  startTransition,
  type ReactNode,
} from 'react';
import { useSocket } from './SocketContext';
import { hydrationWatermark } from '../lib/hydrationWatermark';
import type {
  RedisChannel,
  EventPayload,
  EventPriority,
  EventSubscriptionOptions,
  EventHandler,
  EventUnsubscriber,
} from '@ems/types';

// Helper function to determine event priority based on channel name
function getEventPriority(channel: RedisChannel): EventPriority {
  const channelStr = channel as string;

  // High priority: critical real-time events
  if (
    channelStr.includes('balance:') ||
    channelStr.includes('error') ||
    channelStr.includes('pong:')
  ) {
    return 'high';
  }

  // Low priority: analytics, metrics, non-critical updates
  if (
    channelStr.includes('analytics') ||
    channelStr.includes('metrics') ||
    channelStr.includes('leaderboard')
  ) {
    return 'low';
  }

  // Default: normal priority
  return 'normal';
}

/* ---------- Types ---------- */

// Internal event handler with metadata (no metrics tracking here)
interface InternalEventHandler<T = any> {
  fn: (payload: T) => void;
  priority: EventPriority;
  once: boolean;
  id: string;
}

// PURE EventBus interface - stable, no frequent updates
interface EventBusCoreContextType {
  // Type-safe subscription with automatic priority detection
  subscribe: <T extends RedisChannel>(
    event: T,
    handler: EventHandler<EventPayload<T>>,
    options?: EventSubscriptionOptions,
  ) => EventUnsubscriber;

  // Type-safe event emission
  emit: <T extends RedisChannel>(event: T, payload: EventPayload<T>) => void;

  // Connection status (stable)
  isConnected: boolean;

  // Raw socket access for non-typed events (SOCKET_EVENTS)
  socket: ReturnType<typeof useSocket>;

  // Batch subscription
  subscribeBatch: <T extends RedisChannel>(
    events: T[],
    handler: EventHandler<EventPayload<T>>,
    options?: EventSubscriptionOptions,
  ) => EventUnsubscriber;

  // Utility functions (stable)
  getActiveEvents: () => RedisChannel[];
  getHandlerCount: (event?: RedisChannel) => number;
}

const EventBusCoreContext = createContext<EventBusCoreContextType | undefined>(undefined);

/* ---------- Provider ---------- */
export function EventBusCoreProvider({ children }: { children: ReactNode }) {
  const socket = useSocket();

  // Event handler registry - using refs for stability (no state updates)
  const handlersRef = useRef<Map<RedisChannel, Set<InternalEventHandler>>>(new Map());
  const socketListenersRef = useRef<Map<RedisChannel, (payload: any) => void>>(new Map());

  // Connection status (minimal updates)
  const isConnected = useMemo(() => socket?.connected ?? false, [socket?.connected]);

  // Subscribe to an event with type safety and automatic priority detection
  const subscribe = useCallback(
    <T extends RedisChannel>(
      event: T,
      handler: EventHandler<EventPayload<T>>,
      options: EventSubscriptionOptions = {},
    ): EventUnsubscriber => {
      const { once = false, priority = getEventPriority(event) } = options;
      const handlerId = `${event}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Wrap handler with error handling (NO metrics here - that's in separate context)
      const wrappedHandler: InternalEventHandler<EventPayload<T>> = {
        fn: (payload: EventPayload<T>) => {
          try {
            handler(payload);
          } catch (error) {
            console.error(`[EventBusCore] Error in handler for ${event}:`, error);
          }
        },
        priority,
        once,
        id: handlerId,
      };

      // Register handler for this event
      if (!handlersRef.current.has(event)) {
        handlersRef.current.set(event, new Set());

        // Create socket listener for this event (single listener per event)
        const socketListener = (payload: any) => {
          // HYDRATION SAFETY: Route events through watermark to prevent pre-boot races
          if (hydrationWatermark.isHydrated()) {
            // Process immediately if hydrated
            processEventHandlers(event, payload);
          } else {
            // Queue for post-hydration processing
            hydrationWatermark.registerEventProcessor(event, (queuedPayload: any) => {
              processEventHandlers(event, queuedPayload);
            });
            hydrationWatermark.processEvent(event, payload);
          }
        };

        // Extract event processing logic for reuse in hydration watermark
        const processEventHandlers = (eventName: string, payload: any) => {
          // Process handlers by priority
          const handlers = handlersRef.current.get(eventName as RedisChannel);
          if (!handlers || handlers.size === 0) return;

          // Sort handlers by priority (this is where React 19 startTransition will help)
          const sortedHandlers = Array.from(handlers).sort((a, b) => {
            const priorityOrder: Record<EventPriority, number> = { high: 0, normal: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          });

          // React 19 Optimization: Execute handlers with startTransition-based priority scheduling
          // This replaces setTimeout delays with React's concurrent features for better performance
          const handlersToRemove: InternalEventHandler[] = [];

          sortedHandlers.forEach((handler) => {
            // React 19 startTransition-based priority scheduling
            switch (handler.priority) {
              case 'high':
                // High priority: Execute immediately (blocking, urgent UI updates)
                handler.fn(payload);
                break;

              case 'normal':
                // Normal priority: Use startTransition (non-blocking, normal updates)
                startTransition(() => {
                  handler.fn(payload);
                });
                break;

              case 'low':
                // Low priority: Use startTransition (non-blocking, background updates)
                startTransition(() => {
                  handler.fn(payload);
                });
                break;

              default:
                // Default to normal priority
                startTransition(() => {
                  handler.fn(payload);
                });
                break;
            }

            // Mark for removal if it's a once handler
            if (handler.once) {
              handlersToRemove.push(handler);
            }
          });

          // Remove once handlers
          if (handlersToRemove.length > 0) {
            handlersToRemove.forEach((handler) => {
              handlers.delete(handler);
            });

            // Clean up if no more handlers
            if (handlers.size === 0) {
              const storedListener = socketListenersRef.current.get(event);
              if (storedListener) {
                socket.off(event, storedListener as any);
                socketListenersRef.current.delete(event);
              }
              handlersRef.current.delete(event);
            }
          }
        };

        // Register with socket - CORRECT: Listening for server broadcasts (from Redis)
        socket.on(event, socketListener as any);
        socketListenersRef.current.set(event, socketListener);
      }

      const handlers = handlersRef.current.get(event)!;
      handlers.add(wrappedHandler);

      // Return unsubscribe function
      return () => {
        const currentHandlers = handlersRef.current.get(event);
        if (currentHandlers) {
          currentHandlers.delete(wrappedHandler);

          // Clean up if no more handlers
          if (currentHandlers.size === 0) {
            const socketListener = socketListenersRef.current.get(event);
            if (socketListener) {
              socket.off(event, socketListener as any);
              socketListenersRef.current.delete(event);
            }
            handlersRef.current.delete(event);
          }
        }
      };
    },
    [socket],
  );

  // Batch subscription for multiple events
  const subscribeBatch = useCallback(
    <T extends RedisChannel>(
      events: T[],
      handler: EventHandler<EventPayload<T>>,
      options: EventSubscriptionOptions = {},
    ): EventUnsubscriber => {
      const unsubscribers = events.map((event) => subscribe(event, handler, options));

      return () => {
        unsubscribers.forEach((unsub) => unsub());
      };
    },
    [subscribe],
  );

  // Emit an event with type safety - CORRECT: Client → Server via Socket.IO
  const emit = useCallback(
    <T extends RedisChannel>(event: T, payload: EventPayload<T>) => {
      socket.emit(event, payload);
    },
    [socket],
  );

  // Get active events
  const getActiveEvents = useCallback((): RedisChannel[] => {
    return Array.from(handlersRef.current.keys());
  }, []);

  // Get handler count
  const getHandlerCount = useCallback((event?: RedisChannel): number => {
    if (event) {
      return handlersRef.current.get(event)?.size || 0;
    }
    let totalCount = 0;
    handlersRef.current.forEach((handlers) => {
      totalCount += handlers.size;
    });
    return totalCount;
  }, []);

  // Clean up all listeners on unmount
  useEffect(() => {
    return () => {
      // Clean up all socket listeners
      socketListenersRef.current.forEach((listener, event) => {
        socket.off(event, listener);
      });
      socketListenersRef.current.clear();
      handlersRef.current.clear();
    };
  }, [socket]);

  // Context value - STABLE (no frequent updates)
  const value = useMemo<EventBusCoreContextType>(
    () => ({
      subscribe,
      emit,
      isConnected,
      socket,
      subscribeBatch,
      getActiveEvents,
      getHandlerCount,
    }),
    [subscribe, emit, isConnected, socket, subscribeBatch, getActiveEvents, getHandlerCount],
  );

  return <EventBusCoreContext.Provider value={value}>{children}</EventBusCoreContext.Provider>;
}

/* ---------- Hook ---------- */
export function useEventBusCore() {
  const context = useContext(EventBusCoreContext);
  if (context === undefined) {
    throw new Error('useEventBusCore must be used within an EventBusCoreProvider');
  }
  return context;
}

// Compatibility hook for existing useSocketEvent pattern
export function useSocketEvent<T extends RedisChannel>(
  event: T,
  handler: EventHandler<EventPayload<T>>,
  options?: EventSubscriptionOptions,
): void {
  const { subscribe } = useEventBusCore();

  useEffect(() => {
    const unsubscribe = subscribe(event, handler, options);
    return unsubscribe;
  }, [subscribe, event, handler, options]);
}
