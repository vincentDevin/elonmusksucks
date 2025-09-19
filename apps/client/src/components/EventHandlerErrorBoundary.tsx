// apps/client/src/components/EventHandlerErrorBoundary.tsx
// Specialized error boundary for event handlers with retry logic
import React, { useCallback, useState } from 'react';
import ErrorBoundary from './ErrorBoundary';

interface EventHandlerErrorBoundaryProps {
  children: React.ReactNode;
  eventType?: string;
  maxRetries?: number;
  onError?: (error: Error, eventType?: string) => void;
}

export const EventHandlerErrorBoundary: React.FC<EventHandlerErrorBoundaryProps> = ({
  children,
  eventType,
  maxRetries = 3,
  onError,
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  const handleError = useCallback(
    (error: Error, errorInfo: React.ErrorInfo) => {
      setLastError(error);

      // Log specific event handler error
      console.error(`[EventHandler Error${eventType ? ` - ${eventType}` : ''}]:`, {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        retryCount,
      });

      // Call custom error handler
      if (onError) {
        onError(error, eventType);
      }

      // Auto-retry logic for transient errors
      if (retryCount < maxRetries && isTransientError(error)) {
        setTimeout(
          () => {
            console.log(`🔄 Retrying event handler (${retryCount + 1}/${maxRetries})...`);
            setRetryCount((prev) => prev + 1);
            setLastError(null);
          },
          1000 * Math.pow(2, retryCount),
        ); // Exponential backoff
      }
    },
    [eventType, onError, retryCount, maxRetries],
  );

  const fallback = (
    <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
      <div className="flex items-center space-x-2">
        <span className="text-warning">⚡</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-warning">
            Event Handler Error {eventType && `(${eventType})`}
          </p>
          {lastError && (
            <p className="text-xs text-tertiary mt-1">
              {lastError.message}
              {retryCount > 0 && ` (Retry ${retryCount}/${maxRetries})`}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      context={`EventHandler${eventType ? `: ${eventType}` : ''}`}
      onError={handleError}
      fallback={fallback}
    >
      {children}
    </ErrorBoundary>
  );
};

// Helper to determine if an error is transient and worth retrying
function isTransientError(error: Error): boolean {
  const transientPatterns = [
    /network/i,
    /timeout/i,
    /fetch/i,
    /socket/i,
    /connection/i,
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
  ];

  return transientPatterns.some((pattern) => pattern.test(error.message));
}

export default EventHandlerErrorBoundary;
