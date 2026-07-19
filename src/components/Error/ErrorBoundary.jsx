import React from 'react';
import Button from '../Button/Button';

const IS_DEV = process.env.NODE_ENV !== 'production';

/**
 * App-wide error boundary. Catches render-time errors thrown by any
 * descendant and shows a friendly fallback so the user doesn't see a
 * blank screen.
 *
 * Two recovery actions are offered:
 *  - **Try again**: clears local boundary state. Works when the error
 *    was transient (e.g. a fetch race). Re-throws immediately if the
 *    underlying state is still corrupt.
 *  - **Reload page**: hard reload. Always recovers because it tears
 *    down the React tree.
 *
 * In development the actual error message + stack are shown so the
 * dev can fix it without pulling up devtools. In production we hide
 * those details and only show the friendly copy.
 *
 * If/when Sentry (or any error tracker) gets wired in, the
 * `componentDidCatch` hook is the place to call `Sentry.captureException`.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.handleReset = this.handleReset.bind(this);
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, errorInfo);
    this.setState({ errorInfo });
    // Hook for error tracking — wire Sentry/Rollbar here when added.
    if (typeof window !== 'undefined' && window.__APP_ERROR_REPORTER__) {
      try {
        window.__APP_ERROR_REPORTER__(error, errorInfo);
      } catch (_) {
        /* never let the reporter throw inside the boundary */
      }
    }
  }

  handleReset() {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  handleReload() {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, errorInfo } = this.state;
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-900">
        <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-500/15 dark:text-red-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Something went wrong
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            {this.props.fallbackMessage ||
              'We hit an unexpected error rendering this page. The issue has been logged and you can try again, or reload the page to start fresh.'}
          </p>

          {IS_DEV && error ? (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Dev details
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-slate-100 p-3 text-[11px] leading-snug text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {error.toString()}
                {errorInfo?.componentStack || ''}
              </pre>
            </details>
          ) : null}

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              type="button"
              variant="primary"
              pill
              size="normal"
              onClick={this.handleReset}
            >
              Try again
            </Button>
            <Button
              type="button"
              variant="outline"
              pill
              size="normal"
              onClick={this.handleReload}
            >
              Reload page
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
