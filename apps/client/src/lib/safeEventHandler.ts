// apps/client/src/lib/safeEventHandler.ts
// Utility to wrap event handlers with error handling and logging

interface SafeHandlerOptions {
  eventType?: string;
  userId?: number;
  critical?: boolean;
  fallbackValue?: any;
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error, context: any) => void;
}

/**
 * Wraps an event handler with error handling, logging, and optional retry logic
 */
export function safeEventHandler<T extends (...args: any[]) => any>(
  handler: T,
  options: SafeHandlerOptions = {},
): T {
  const {
    eventType = 'unknown',
    userId,
    critical = false,
    fallbackValue = undefined,
    maxRetries = 0,
    retryDelay = 1000,
    onError,
  } = options;

  return (async (...args: Parameters<T>) => {
    let lastError: Error | null = null;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        // Execute the original handler
        const result = await handler(...args);

        // Log successful critical operations
        if (critical && retryCount > 0) {
          console.log(`✅ [EventHandler] ${eventType} succeeded after ${retryCount} retries`);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Log the error with context
        const context = {
          eventType,
          userId,
          args: args.length > 0 ? args[0] : undefined, // Log first arg (usually payload)
          retryCount,
          timestamp: new Date().toISOString(),
        };

        if (process.env.NODE_ENV === 'development') {
          console.group(`🚨 [EventHandler Error] ${eventType}`);
          console.error('Error:', lastError.message);
          console.error('Context:', context);
          console.error('Stack:', lastError.stack);
          console.groupEnd();
        }

        // Call custom error handler
        if (onError) {
          onError(lastError, context);
        }

        // Check if we should retry
        if (retryCount < maxRetries) {
          const delay = retryDelay * Math.pow(2, retryCount); // Exponential backoff
          console.log(
            `🔄 Retrying ${eventType} in ${delay}ms (${retryCount + 1}/${maxRetries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          retryCount++;
          continue;
        }

        // If critical, throw to bubble up
        if (critical) {
          throw lastError;
        }

        // Return fallback value for non-critical errors
        console.warn(`⚠️ [EventHandler] ${eventType} failed, using fallback value`);
        return fallbackValue;
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError;
  }) as T;
}

/**
 * Creates a safe event handler factory with default options
 */
export function createSafeEventHandlerFactory(defaultOptions: SafeHandlerOptions) {
  return <T extends (...args: any[]) => any>(
    handler: T,
    overrideOptions?: Partial<SafeHandlerOptions>,
  ): T => {
    return safeEventHandler(handler, { ...defaultOptions, ...overrideOptions });
  };
}

/**
 * Batch wrap multiple event handlers with the same options
 */
export function safeEventHandlers<T extends Record<string, (...args: any[]) => any>>(
  handlers: T,
  options: SafeHandlerOptions = {},
): T {
  const safeHandlers: any = {};

  for (const [key, handler] of Object.entries(handlers)) {
    safeHandlers[key] = safeEventHandler(handler, {
      ...options,
      eventType: options.eventType ? `${options.eventType}.${key}` : key,
    });
  }

  return safeHandlers as T;
}
