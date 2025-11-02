// components/error-boundary.tsx
"use client"

import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Error logged to error boundary state for display
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, resetError }: { error?: Error; resetError: () => void }) {
  return (
    <div className="min-h-screen bg-background text-[#FFFBEB] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h1>
        <p className="text-neutral-300 mb-6">
          We encountered an unexpected error. Please try refreshing the page.
        </p>
        {error && (
          <details className="text-left mb-6 p-4 bg-neutral-800 rounded-sm border border-neutral-700">
            <summary className="cursor-pointer text-sm text-neutral-400 mb-2">
              Error Details
            </summary>
            <pre className="text-xs text-red-300 whitespace-pre-wrap">
              {error.message}
            </pre>
          </details>
        )}
        <div className="space-y-3">
          <button
            onClick={resetError}
            className="px-6 py-3 bg-[#ff0099] text-white font-semibold rounded-sm hover:bg-[#ff0099]/90 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 border border-neutral-600 text-neutral-300 font-semibold rounded-sm hover:bg-neutral-700 transition-colors ml-3"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  )
}

export default ErrorBoundary
