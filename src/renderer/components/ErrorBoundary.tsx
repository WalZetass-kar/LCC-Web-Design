import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Mail } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary Component
 * Catches React errors and displays a fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error Boundary caught an error:', error, errorInfo)
    }

    // Log error to backend
    this.logErrorToBackend(error, errorInfo)

    this.setState({
      error,
      errorInfo,
    })
  }

  logErrorToBackend(error: Error, errorInfo: ErrorInfo) {
    try {
      // Send error to backend for logging
      window.api.invoke('log-error', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Failed to log error to backend:', err)
    }
  }

  handleReload = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
    window.location.reload()
  }

  handleReportIssue = () => {
    const { error, errorInfo } = this.state
    
    const errorReport = `
Error: ${error?.message}

Stack Trace:
${error?.stack}

Component Stack:
${errorInfo?.componentStack}

Timestamp: ${new Date().toISOString()}
    `.trim()

    // Copy to clipboard
    navigator.clipboard.writeText(errorReport).then(() => {
      alert('Error report copied to clipboard. Please send it to the administrator.')
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              Oops! Something went wrong
            </h1>

            {/* Description */}
            <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
              We're sorry, but something unexpected happened. Don't worry, your data is safe.
            </p>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Error Details:
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 font-mono break-all">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                      Stack Trace
                    </summary>
                    <pre className="text-xs text-gray-600 dark:text-gray-400 mt-2 overflow-auto max-h-40">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Reload Application
              </button>
              
              <button
                onClick={this.handleReportIssue}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
              >
                <Mail className="w-5 h-5" />
                Report Issue
              </button>
            </div>

            {/* Help Text */}
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
              If the problem persists, please contact support with the error report.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Higher-order component to wrap components with Error Boundary
 * @param Component - Component to wrap
 * @param fallback - Optional fallback UI
 * @returns Wrapped component
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  )
}
