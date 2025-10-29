// apps/client/src/hooks/useOptimisticUpdate.ts
// Enhanced optimistic updates using React 19's useOptimistic hook
// Provides instant UI feedback with automatic rollback on errors

import { useOptimistic, useCallback, useRef, useEffect } from 'react';
import { useEventBusCore } from '../contexts/EventBusCoreContext';
import type { RedisChannel } from '@ems/types';

interface OptimisticOptions<T> {
  // Unique identifier for this optimistic update
  updateId?: string;
  // Timeout in ms before considering the update failed
  timeout?: number;
  // Event channel to listen for success confirmation
  successEvent?: RedisChannel;
  // Event channel to listen for failure
  failureEvent?: RedisChannel;
  // Whether to automatically rollback on timeout
  autoRollback?: boolean;
  // Custom rollback handler
  onRollback?: (error?: Error) => void;
  // Custom success handler
  onSuccess?: (finalValue: T) => void;
}

/**
 * Enhanced optimistic update hook for React 19
 * Provides instant UI updates with automatic rollback on failure
 */
export function useOptimisticUpdate<T>(initialValue: T, options: OptimisticOptions<T> = {}) {
  const { successEvent, failureEvent, onRollback, onSuccess } = options;

  const { subscribe } = useEventBusCore();
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const updateIdRef = useRef<string | undefined>(undefined);

  // Use React 19's useOptimistic hook
  const [optimisticValue, setOptimisticValue] = useOptimistic(initialValue);

  // Track pending state
  const [isPending, setIsPending] = useOptimistic(false);

  // Track error state
  const [error, setError] = useOptimistic<Error | undefined>(undefined);

  /**
   * Perform an optimistic update
   */
  const updateOptimistically = useCallback(
    async (
      newValue: T,
      asyncOperation: () => Promise<T>,
      updateOptions?: Partial<OptimisticOptions<T>>,
    ) => {
      const mergedOptions = { ...options, ...updateOptions };
      const updateId = mergedOptions.updateId || `${Date.now()}-${Math.random()}`;
      updateIdRef.current = updateId;

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set optimistic value immediately
      setOptimisticValue(newValue);
      setIsPending(true);
      setError(undefined);

      // Set timeout for auto-rollback if configured
      if (mergedOptions.autoRollback && mergedOptions.timeout) {
        timeoutRef.current = setTimeout(() => {
          if (updateIdRef.current === updateId && isPending) {
            console.warn('[OptimisticUpdate] Timeout reached, rolling back');
            handleRollback(new Error('Update timeout'));
          }
        }, mergedOptions.timeout);
      }

      try {
        // Execute the async operation
        const finalValue = await asyncOperation();

        // Clear timeout on success
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Update with final server value
        setOptimisticValue(finalValue);
        setIsPending(false);
        setError(undefined);

        // Call success handler
        if (mergedOptions.onSuccess) {
          mergedOptions.onSuccess(finalValue);
        }

        return finalValue;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        // Clear timeout on error
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        handleRollback(error);
        throw error;
      }
    },
    [options, optimisticValue, isPending],
  );

  /**
   * Handle rollback on error or timeout
   */
  const handleRollback = useCallback(
    (error?: Error) => {
      console.error('[OptimisticUpdate] Rolling back due to:', error?.message);

      // Revert to initial value
      setOptimisticValue(initialValue);
      setIsPending(false);
      setError(error);

      // Call rollback handler
      if (onRollback) {
        onRollback(error);
      }
    },
    [initialValue, onRollback],
  );

  /**
   * Listen for success/failure events if configured
   */
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    if (successEvent) {
      unsubscribers.push(
        subscribe(successEvent, (payload: any) => {
          if (updateIdRef.current && payload.updateId === updateIdRef.current) {
            console.log('[OptimisticUpdate] Success event received:', payload);

            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }

            setOptimisticValue(payload.value || optimisticValue);
            setIsPending(false);
            setError(undefined);

            if (onSuccess) {
              onSuccess(payload.value);
            }
          }
        }),
      );
    }

    if (failureEvent) {
      unsubscribers.push(
        subscribe(failureEvent, (payload: any) => {
          if (updateIdRef.current && payload.updateId === updateIdRef.current) {
            console.error('[OptimisticUpdate] Failure event received:', payload);
            handleRollback(new Error(payload.error || 'Update failed'));
          }
        }),
      );
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [successEvent, failureEvent, subscribe, optimisticValue, onSuccess, handleRollback]);

  return {
    // Current optimistic value
    value: optimisticValue,
    // Whether an update is pending
    isPending,
    // Any error from the last update
    error,
    // Function to trigger optimistic update
    updateOptimistically,
    // Manual rollback function
    rollback: () => handleRollback(),
    // Reset to initial value
    reset: () => {
      setOptimisticValue(initialValue);
      setIsPending(false);
      setError(undefined);
    },
  };
}

/**
 * Hook for optimistic list operations (add, remove, update items)
 */
export function useOptimisticList<T extends { id: string | number }>(
  initialItems: T[],
  options?: OptimisticOptions<T[]>,
) {
  const optimistic = useOptimisticUpdate(initialItems, options);

  const addItem = useCallback(
    (item: T, asyncAdd: () => Promise<T[]>) => {
      const newItems = [...optimistic.value, item];
      return optimistic.updateOptimistically(newItems, asyncAdd);
    },
    [optimistic],
  );

  const removeItem = useCallback(
    (itemId: string | number, asyncRemove: () => Promise<T[]>) => {
      const newItems = optimistic.value.filter((item) => item.id !== itemId);
      return optimistic.updateOptimistically(newItems, asyncRemove);
    },
    [optimistic],
  );

  const updateItem = useCallback(
    (itemId: string | number, updates: Partial<T>, asyncUpdate: () => Promise<T[]>) => {
      const newItems = optimistic.value.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item,
      );
      return optimistic.updateOptimistically(newItems, asyncUpdate);
    },
    [optimistic],
  );

  return {
    ...optimistic,
    items: optimistic.value,
    addItem,
    removeItem,
    updateItem,
  };
}
