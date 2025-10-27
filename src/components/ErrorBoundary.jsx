import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // Update state
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Log to error tracking service in production
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    // Clear all storage and reload
    localStorage.clear();
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorCount } = this.state;
      
      // If error persists after multiple resets, suggest reload
      const shouldSuggestReload = errorCount > 2;

      return (
        <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-red-100 rounded-full p-4">
                <AlertTriangle className="h-12 w-12 text-red-600" />
              </div>
            </div>

            {/* Error Title */}
            <h1 className="text-2xl font-bold text-gray-800 text-center mb-4">
              Oops! Something went wrong
            </h1>

            {/* Error Message */}
            <p className="text-gray-600 text-center mb-6">
              {shouldSuggestReload
                ? "The error keeps happening. Try reloading the page."
                : "We encountered an unexpected error. Don't worry, your encrypted data is safe."}
            </p>

            {/* Error Details (Development Only) */}
            {import.meta.env.DEV && error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 max-h-40 overflow-auto">
                <p className="text-xs font-mono text-red-800 break-all">
                  {error.toString()}
                </p>
                {errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-700 cursor-pointer">
                      Stack trace
                    </summary>
                    <pre className="text-xs text-red-800 mt-2 whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {!shouldSuggestReload ? (
                <>
                  <button
                    onClick={this.handleReset}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-600 transition flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-5 w-5" />
                    Try Again
                  </button>

                  <button
                    onClick={this.handleReload}
                    className="w-full bg-gray-200 text-gray-800 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
                  >
                    Reload Page
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={this.handleReload}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-600 transition flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-5 w-5" />
                    Reload Page
                  </button>

                  <button
                    onClick={this.handleGoHome}
                    className="w-full bg-gray-200 text-gray-800 py-3 rounded-xl font-semibold hover:bg-gray-300 transition flex items-center justify-center gap-2"
                  >
                    <Home className="h-5 w-5" />
                    Start Fresh
                  </button>
                </>
              )}
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 text-center mt-6">
              If this problem persists, try clearing your browser cache or contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
