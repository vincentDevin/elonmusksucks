// apps/client/src/contexts/EventBusContext.tsx
// -----------------------------------------------------------------------------
// Type-safe EventBus system with priority handling for all 73+ Redis channels
// Foundation for complete event system integration with React 19 features
// -----------------------------------------------------------------------------

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import { useSocket } from './SocketContext';
import {
  REDIS_CHANNELS,
  EVENT_SYSTEM_CONFIG,
  getEventPriority,
  type RedisChannel,
  type EventPayload,
  type EventPriority,
  type EventSubscriptionOptions,
  type EventHandler,
  type EventUnsubscriber,
  type EventMetrics,
} from '../types/events';

/* ---------- Types ---------- */

// Internal event handler with metadata
interface InternalEventHandler<T = any> {
  fn: (payload: T) => void;
  priority: EventPriority;
  once: boolean;
  id: string;
}

interface EventBusContextType {
  // Type-safe subscription with automatic priority detection
  subscribe: <T extends RedisChannel>(
    event: T,
    handler: EventHandler<EventPayload<T>>,
    options?: EventSubscriptionOptions,
  ) => EventUnsubscriber;

  // Type-safe event emission
  emit: <T extends RedisChannel>(event: T, payload: EventPayload<T>) => void;

  // Connection and metrics
  isConnected: boolean;
  eventMetrics: EventMetrics;
  clearMetrics: () => void;

  // Advanced features
  subscribeBatch: <T extends RedisChannel>(
    events: T[],
    handler: EventHandler<EventPayload<T>>,
    options?: EventSubscriptionOptions,
  ) => EventUnsubscriber;

  getActiveEvents: () => RedisChannel[];
  getHandlerCount: (event?: RedisChannel) => number;
}

const EventBusContext = createContext<EventBusContextType | undefined>(undefined);

/* ---------- Provider ---------- */
export function EventBusProvider({ children }: { children: ReactNode }) {
  const socket = useSocket();
  const [eventMetrics, setEventMetrics] = useState<EventMetrics>({
    eventsReceived: 0,
    eventsProcessed: 0,
    errors: 0,
    averageProcessingTime: 0,
    lastEventTime: null,
  });

  // Event handler registry with priority queuing
  const handlersRef = useRef<Map<RedisChannel, Set<InternalEventHandler>>>(new Map());
  const socketListenersRef = useRef<Map<RedisChannel, (payload: any) => void>>(new Map());
  const metricsRef = useRef<EventMetrics>(eventMetrics);

  // Update metrics ref when state changes
  useEffect(() => {
    metricsRef.current = eventMetrics;
  }, [eventMetrics]);

  // Subscribe to an event with type safety and automatic priority detection
  const subscribe = useCallback(
    <T extends RedisChannel>(
      event: T,
      handler: EventHandler<EventPayload<T>>,
      options: EventSubscriptionOptions = {},
    ): EventUnsubscriber => {
      const { once = false, priority = getEventPriority(event) } = options;
      const handlerId = `${event}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Wrap handler with metrics, error handling, and deduplication
      const wrappedHandler: InternalEventHandler<EventPayload<T>> = {
        fn: (payload: EventPayload<T>) => {
          const startTime = performance.now();

          try {
            handler(payload);

            // Update metrics efficiently
            const processingTime = performance.now() - startTime;
            setEventMetrics((prev) => {
              const newCount = prev.eventsProcessed + 1;
              return {
                eventsProcessed: newCount,
                eventsReceived: prev.eventsReceived,
                errors: prev.errors,
                averageProcessingTime:
                  prev.averageProcessingTime === 0
                    ? processingTime
                    : (prev.averageProcessingTime * (newCount - 1) + processingTime) / newCount,
                lastEventTime: Date.now(),
              };
            });
          } catch (error) {
            console.error(`[EventBus] Error in handler for ${event}:`, error);
            setEventMetrics((prev) => ({
              ...prev,
              errors: prev.errors + 1,
            }));
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
          // Update receive metrics
          setEventMetrics((prev) => ({
            ...prev,
            eventsReceived: prev.eventsReceived + 1,
            lastEventTime: Date.now(),
          }));

          // Process handlers by priority
          const handlers = handlersRef.current.get(event);
          if (!handlers || handlers.size === 0) return;

          // Sort handlers by priority
          const sortedHandlers = Array.from(handlers).sort((a, b) => {
            const priorityOrder = { high: 0, normal: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          });

          // Execute handlers with appropriate timing
          const handlersToRemove: InternalEventHandler[] = [];

          sortedHandlers.forEach((handler) => {
            const timeoutDelay = (() => {
              switch (handler.priority) {
                case 'high':
                  return EVENT_SYSTEM_CONFIG.HIGH_PRIORITY_TIMEOUT;
                case 'normal':
                  return EVENT_SYSTEM_CONFIG.NORMAL_PRIORITY_TIMEOUT;
                case 'low':
                  return EVENT_SYSTEM_CONFIG.LOW_PRIORITY_TIMEOUT;
                default:
                  return EVENT_SYSTEM_CONFIG.NORMAL_PRIORITY_TIMEOUT;
              }
            })();

            if (timeoutDelay === 0) {
              // Execute immediately
              handler.fn(payload);
            } else {
              // Execute with delay
              setTimeout(() => handler.fn(payload), timeoutDelay);
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
              socket.off(event, socketListener);
              socketListenersRef.current.delete(event);
              handlersRef.current.delete(event);
            }
          }
        };

        // Register with socket
        socket.on(event, socketListener);
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
              socket.off(event, socketListener);
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

  // Emit an event with type safety
  const emit = useCallback(
    <T extends RedisChannel>(event: T, payload: EventPayload<T>) => {
      socket.emit(event, payload);
    },
    [socket],
  );

  // Clear metrics
  const clearMetrics = useCallback(() => {
    setEventMetrics({
      eventsReceived: 0,
      eventsProcessed: 0,
      errors: 0,
      averageProcessingTime: 0,
      lastEventTime: null,
    });
  }, []);

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
      socketListenersRef.current.forEach((listener, event) => {
        socket.off(event, listener);
      });
      socketListenersRef.current.clear();
      handlersRef.current.clear();
    };
  }, [socket]);

  // Memoized context value for performance
  const value = useMemo<EventBusContextType>(
    () => ({
      subscribe,
      subscribeBatch,
      emit,
      isConnected: socket.connected,
      eventMetrics,
      clearMetrics,
      getActiveEvents,
      getHandlerCount,
    }),
    [
      subscribe,
      subscribeBatch,
      emit,
      socket.connected,
      eventMetrics,
      clearMetrics,
      getActiveEvents,
      getHandlerCount,
    ],
  );

  return <EventBusContext.Provider value={value}>{children}</EventBusContext.Provider>;
}

/* ---------- Hook ---------- */
export function useEventBus() {
  const context = useContext(EventBusContext);
  if (!context) {
    throw new Error('useEventBus must be used within an EventBusProvider');
  }
  return context;
}

/* ---------- Convenience Hooks ---------- */

// Type-safe event subscription hook
export function useSocketEvent<T extends RedisChannel>(
  event: T,
  handler: EventHandler<EventPayload<T>>,
  options?: EventSubscriptionOptions,
) {
  const { subscribe } = useEventBus();

  useEffect(() => {
    const unsubscribe = subscribe(event, handler, options);
    return unsubscribe;
  }, [event, handler, options, subscribe]);
}

// Batch event subscription hook
export function useSocketEvents<T extends RedisChannel>(
  events: T[],
  handler: EventHandler<EventPayload<T>>,
  options?: EventSubscriptionOptions,
) {
  const { subscribeBatch } = useEventBus();

  useEffect(() => {
    const unsubscribe = subscribeBatch(events, handler, options);
    return unsubscribe;
  }, [events, handler, options, subscribeBatch]);
}

// Event metrics hook
export function useEventMetrics() {
  const { eventMetrics, clearMetrics, getActiveEvents, getHandlerCount } = useEventBus();

  return {
    metrics: eventMetrics,
    clearMetrics,
    activeEvents: getActiveEvents(),
    totalHandlers: getHandlerCount(),
    getHandlerCount,
  };
}

/* ---------- Event Category Hooks ---------- */

// Financial events hook
export function useFinancialEvents(handler: EventHandler<any>, options?: EventSubscriptionOptions) {
  const financialEvents = [
    REDIS_CHANNELS.BALANCE_MILESTONE_REACHED,
    REDIS_CHANNELS.BANKRUPTCY_DETECTED,
    REDIS_CHANNELS.MASSIVE_GAIN_DETECTED,
    REDIS_CHANNELS.MASSIVE_LOSS_DETECTED,
    REDIS_CHANNELS.COMEBACK_DETECTED,
    REDIS_CHANNELS.PAYOUT_COMPLETED,
  ];

  useSocketEvents(financialEvents, handler, options);
}

// Social events hook
export function useSocialEvents(handler: EventHandler<any>, options?: EventSubscriptionOptions) {
  const socialEvents = [
    REDIS_CHANNELS.USER_FOLLOWED,
    REDIS_CHANNELS.POST_CREATED,
    REDIS_CHANNELS.POST_REACTION,
    REDIS_CHANNELS.COMMENT_CREATED,
    REDIS_CHANNELS.EMOJI_USED,
  ];

  useSocketEvents(socialEvents, handler, options);
}

// Leaderboard events hook
export function useLeaderboardEvents(
  handler: EventHandler<any>,
  options?: EventSubscriptionOptions,
) {
  const leaderboardEvents = [
    REDIS_CHANNELS.LEADERBOARD_ALL_TIME,
    REDIS_CHANNELS.LEADERBOARD_DAILY,
    REDIS_CHANNELS.LEADERBOARD_RANK_CHANGE,
    REDIS_CHANNELS.LEADERBOARD_RANK_UPDATE,
    REDIS_CHANNELS.LEADERBOARD_POSITION_REACHED,
    REDIS_CHANNELS.LEADERBOARD_COMEBACK_MAJOR,
  ];

  useSocketEvents(leaderboardEvents, handler, options);
}

// Timeline events hook
export function useTimelineEvents(handler: EventHandler<any>, options?: EventSubscriptionOptions) {
  const timelineEvents = [
    REDIS_CHANNELS.TIMELINE_ARTICLES_NEW,
    REDIS_CHANNELS.FEED_ARTICLE_NEW,
    REDIS_CHANNELS.FEED_TWEET_NEW,
    REDIS_CHANNELS.FEED_SOURCE_CREATED,
  ];

  useSocketEvents(timelineEvents, handler, options);
}
