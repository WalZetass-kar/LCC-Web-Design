import { useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useDemo } from '../contexts/DemoContext'
import { getDemoBlockedMessage } from '../utils/demo'

interface DemoGuardResult {
  /** Whether the current user is in demo mode */
  isDemo: boolean

  /**
   * Attempt an action — if demo mode, show toast + optionally trigger popup.
   * Returns true if blocked, false if action can proceed.
   */
  guardAction: (actionDescription?: string) => boolean

  /**
   * Wrap an async handler with demo guard.
   * If demo mode, shows toast and does nothing.
   */
  guardedHandler: (actionDescription: string, handler: () => void | Promise<void>) => () => void

  /**
   * Check if accessing a premium feature — triggers pricing popup.
   * Returns true if blocked (demo user accessing premium feature).
   */
  guardPremiumFeature: (featureName: string, friendlyName?: string) => boolean

  /**
   * Track a successful action (call after transaction completes).
   * Increments usage counter and may trigger popup at limit.
   */
  trackUsage: () => void

  /** Open pricing popup manually */
  showPricing: () => void

  /** Whether user has exceeded their demo usage limit */
  isOverLimit: boolean

  /** Remaining actions before hitting the limit */
  remainingUsage: number
}

export function useDemoGuard(): DemoGuardResult {
  const { isDemo } = useAuth()
  const toast = useToast()
  const {
    openPricing, incrementUsage, checkPremiumFeature,
    isOverLimit, remainingUsage,
  } = useDemo()

  const guardAction = useCallback((actionDescription?: string): boolean => {
    if (isDemo) {
      toast(getDemoBlockedMessage(actionDescription), 'error')
      return true // Blocked
    }
    return false // Proceed
  }, [isDemo, toast])

  const guardedHandler = useCallback(
    (actionDescription: string, handler: () => void | Promise<void>) => {
      return () => {
        if (isDemo) {
          toast(getDemoBlockedMessage(actionDescription), 'error')
          return
        }
        handler()
      }
    },
    [isDemo, toast]
  )

  const guardPremiumFeature = useCallback(
    (featureName: string, friendlyName?: string): boolean => {
      if (!isDemo) return false
      const blocked = checkPremiumFeature(featureName)
      if (blocked) {
        toast(
          `🔒 Fitur "${friendlyName ?? featureName}" hanya tersedia untuk pengguna dengan lisensi aktif.`,
          'error'
        )
      }
      return blocked
    },
    [isDemo, checkPremiumFeature, toast]
  )

  const trackUsage = useCallback(() => {
    incrementUsage()
  }, [incrementUsage])

  const showPricing = useCallback(() => {
    openPricing('manual')
  }, [openPricing])

  return {
    isDemo,
    guardAction,
    guardedHandler,
    guardPremiumFeature,
    trackUsage,
    showPricing,
    isOverLimit,
    remainingUsage,
  }
}
