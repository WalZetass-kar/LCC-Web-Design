import * as Sentry from '@sentry/react'

const isDev = import.meta.env.DEV
const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined

/**
 * Initialize Sentry for renderer process.
 * Only runs in production and when VITE_SENTRY_DSN is configured.
 */
export function initSentry(): void {
  if (isDev || !dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: `zetass-pos@${import.meta.env.VITE_APP_VERSION ?? '0.0.0'}`,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['Authorization']
      }
      return event
    },
  })
}

/**
 * Set user context after login.
 */
export function setSentryUser(username: string, role?: string): void {
  Sentry.setUser({ username, role })
}

/**
 * Clear user context on logout.
 */
export function clearSentryUser(): void {
  Sentry.setUser(null)
}

/**
 * Capture a handled exception with extra context.
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context)
    Sentry.captureException(error)
  })
}

export { Sentry }
