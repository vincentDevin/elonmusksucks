// apps/client/src/components/ErrorBoundary.tsx
// Consolidated error boundary with optional retry logic
import React, { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  context?: string;

  // Retry functionality (for event handlers)
  enableRetry?: boolean;
  maxRetries?: number;
  eventType?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 [ErrorBoundary${this.props.context ? ` - ${this.props.context}` : ''}]`);
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({ errorInfo });

    // Auto-retry logic for event handlers (if enabled)
    if (
      this.props.enableRetry &&
      this.state.retryCount < (this.props.maxRetries || 3) &&
      this.isTransientError(error)
    ) {
      setTimeout(
        () => {
          console.log(
            `🔄 Retrying ${this.props.eventType || 'component'} (${this.state.retryCount + 1}/${this.props.maxRetries || 3})...`,
          );
          this.setState((prevState) => ({
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: prevState.retryCount + 1,
            isRetrying: true,
          }));
          // Reset isRetrying after a brief moment
          setTimeout(() => this.setState({ isRetrying: false }), 100);
        },
        1000 * Math.pow(2, this.state.retryCount),
      ); // Exponential backoff
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    });
  };

  // Helper to determine if an error is transient and worth retrying
  isTransientError = (error: Error): boolean => {
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
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default error UI
      return (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4 my-4">
          <div className="flex items-start space-x-3">
            <span className="text-error text-xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-error mb-1">
                {this.props.context ? `Error in ${this.props.context}` : 'Something went wrong'}
                {this.props.enableRetry && this.state.retryCount > 0 && (
                  <span className="text-xs font-normal text-tertiary ml-2">
                    (Retry {this.state.retryCount}/{this.props.maxRetries || 3})
                  </span>
                )}
              </h3>
              <p className="text-sm text-tertiary mb-3">
                {this.state.error?.message || 'An unexpected error occurred'}
                {this.state.isRetrying && <span className="text-warning ml-2">⚡ Retrying...</span>}
              </p>
              {process.env.NODE_ENV === 'development' && (
                <details className="text-xs text-tertiary mb-3">
                  <summary className="cursor-pointer hover:text-content">
                    Show error details
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                    {this.state.error?.stack}
                  </pre>
                </details>
              )}
              <button
                onClick={this.handleReset}
                className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary-hover transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// Convenience export for event handler error boundaries (backward compatibility)
export function EventHandlerErrorBoundary({
  children,
  eventType,
  maxRetries = 3,
  onError,
}: {
  children: React.ReactNode;
  eventType?: string;
  maxRetries?: number;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}) {
  return (
    <ErrorBoundary
      context={`EventHandler${eventType ? `: ${eventType}` : ''}`}
      onError={onError}
      enableRetry={true}
      maxRetries={maxRetries}
      eventType={eventType}
    >
      {children}
    </ErrorBoundary>
  );
}
