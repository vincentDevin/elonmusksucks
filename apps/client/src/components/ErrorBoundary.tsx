// apps/client/src/components/ErrorBoundary.tsx
// Generic error boundary component with fallback UI and error logging
import React, { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
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
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
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
              </h3>
              <p className="text-sm text-tertiary mb-3">
                {this.state.error?.message || 'An unexpected error occurred'}
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
