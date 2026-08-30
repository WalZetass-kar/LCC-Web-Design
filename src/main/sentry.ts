import * as Sentry from '@sentry/electron/main'

/**
 * Initialize Sentry for Electron main process.
 * Called from main process index.ts.
 */
export function initSentryMain(): void {
  const dsn = process.env.VITE_SENTRY_DSN
  if (!dsn || process.env.NODE_ENV !== 'production') return

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    release: `zetass-pos@${process.env.npm_package_version || '0.0.0'}`,
    tracesSampleRate: 0.05,
  })
}
