/**
 * DEMO CONTEXT — Central state for demo mode + subscription conversion
 */

import {
  createContext, useContext, useState, useCallback,
  useEffect, useMemo, type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { secureStorage } from '../utils/secureStorage'
import { api } from '../utils/api'

export type SubscriptionType = 'daily' | 'monthly' | 'yearly' | null
export type PopupTriggerReason =
  | 'first_login' | 'usage_limit' | 'premium_feature'
  | 'session_start' | 'access_expiring' | 'manual'

export interface DemoState {
  is_demo: boolean
  subscription_type: SubscriptionType
  subscription_start: string | null
  subscription_end: string | null
  usage_limit: number
  usage_count: number
}

export interface DemoContextValue {
  state: DemoState
  isPricingOpen: boolean
  triggerReason: PopupTriggerReason | null
  openPricing: (reason: PopupTriggerReason) => void
  closePricing: () => void
  incrementUsage: () => void
  checkPremiumFeature: (featureName: string) => boolean
  isOverLimit: boolean
  remainingUsage: number
  premiumFeatures: string[]
  isSubscribed: boolean
}

const DEMO_USAGE_LIMIT = 10
const POPUP_COOLDOWN_MS = 10 * 60 * 1000
const LS_DEMO_STATE = 'pos_demo_state'
const LS_POPUP_DISMISSED = 'pos_popup_dismissed_at'
const LS_FIRST_LOGIN_SHOWN = 'pos_first_login_shown'

const PREMIUM_FEATURES = [
  'export_laporan', 'export_excel', 'export_pdf', 'multi_user',
  'backup_restore', 'advanced_reports', 'stock_opname',
  'debt_management', 'shift_management', 'returns', 'bulk_import',
]

const REMOTE_POPUP_BY_REASON: Record<PopupTriggerReason, { code: string; title: string; description: string }> = {
  first_login: {
    code: 'DEMO_LIMIT',
    title: 'Upgrade Akun',
    description: 'Pilih paket resmi dari server developer untuk membuka akses penuh.',
  },
  usage_limit: {
    code: 'TRANSACTION_LIMIT',
    title: 'Limit Demo Tercapai',
    description: 'Limit penggunaan akun demo sudah habis. Upgrade paket untuk melanjutkan.',
  },
  premium_feature: {
    code: 'FEATURE_LOCKED',
    title: 'Fitur Terkunci',
    description: 'Fitur ini belum aktif untuk paket Anda saat ini.',
  },
  session_start: {
    code: 'DEMO_LIMIT',
    title: 'Upgrade Akun',
    description: 'Pilih paket resmi dari server developer untuk membuka akses penuh.',
  },
  access_expiring: {
    code: 'ACCESS_EXPIRING',
    title: 'Akses Hampir Berakhir',
    description: 'Perpanjang lisensi agar aplikasi tetap aktif.',
  },
  manual: {
    code: 'DEMO_LIMIT',
    title: 'Upgrade / Perpanjang',
    description: 'Pilih paket resmi dari server developer.',
  },
}

function popupCodeForReason(reason: PopupTriggerReason): string {
  return REMOTE_POPUP_BY_REASON[reason]?.code ?? 'DEMO_LIMIT'
}

function fallbackPopupForReason(reason: PopupTriggerReason) {
  return REMOTE_POPUP_BY_REASON[reason] ?? REMOTE_POPUP_BY_REASON.manual
}

const DemoContext = createContext<DemoContextValue | null>(null)

function restoreDemoState(): Partial<DemoState> {
  try {
    const s = secureStorage.getItem(LS_DEMO_STATE)
    return s ? JSON.parse(s) : {}
  } catch { return {} }
}

function saveDemoState(state: DemoState): void {
  try { secureStorage.setJSON(LS_DEMO_STATE, state) } catch {}
}

function isCooldownElapsed(): boolean {
  try {
    const d = secureStorage.getItem(LS_POPUP_DISMISSED)
    if (!d) return true
    return Date.now() - parseInt(d, 10) >= POPUP_COOLDOWN_MS
  } catch { return true }
}

function markDismissed(): void {
  try { secureStorage.setItem(LS_POPUP_DISMISSED, String(Date.now())) } catch {}
}

function hasFirstLoginShown(username: string): boolean {
  try {
    const s = secureStorage.getItem(LS_FIRST_LOGIN_SHOWN)
    if (!s) return false
    const d = JSON.parse(s)
    return d.username === username && d.shown === true
  } catch { return false }
}

function markFirstLoginShown(username: string): void {
  try {
    secureStorage.setJSON(LS_FIRST_LOGIN_SHOWN, {
      username, shown: true, at: Date.now(),
    })
  } catch {}
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const { user, isDemo } = useAuth()

  const [state, setState] = useState<DemoState>(() => {
    const r = restoreDemoState()
    return {
      is_demo: isDemo,
      subscription_type: (r.subscription_type as SubscriptionType) ?? null,
      subscription_start: r.subscription_start ?? null,
      subscription_end: r.subscription_end ?? null,
      usage_limit: r.usage_limit ?? DEMO_USAGE_LIMIT,
      usage_count: r.usage_count ?? 0,
    }
  })

  const [isPricingOpen, setIsPricingOpen] = useState(false)
  const [triggerReason, setTriggerReason] = useState<PopupTriggerReason | null>(null)

  useEffect(() => { setState(p => ({ ...p, is_demo: isDemo })) }, [isDemo])
  useEffect(() => { saveDemoState(state) }, [state])
  useEffect(() => {
    if (!isPricingOpen || !triggerReason) return
    let cancelled = false

    const dispatchPopup = async () => {
      const fallback = fallbackPopupForReason(triggerReason)
      let popup: any = fallback
      const remote = await api<any>('license:getPublicPopup', popupCodeForReason(triggerReason))
      if (!cancelled && remote.success && remote.data) {
        popup = {
          ...fallback,
          ...remote.data,
        }
      }
      if (cancelled) return
      window.dispatchEvent(new CustomEvent('license:remote-popup', {
        detail: {
          force: false,
          popup: {
            ...popup,
            cta_text: popup.cta_text ?? 'Upgrade Sekarang',
            severity: popup.severity ?? 'warning',
            dismissible: popup.dismissible ?? true,
          },
        },
      }))
      setIsPricingOpen(false)
    }

    void dispatchPopup()
    return () => { cancelled = true }
  }, [isPricingOpen, triggerReason])

  // First login trigger
  useEffect(() => {
    if (!isDemo || !user) return
    const t = setTimeout(() => {
      if (!hasFirstLoginShown(user.nama_pengguna) && isCooldownElapsed()) {
        setTriggerReason('first_login')
        setIsPricingOpen(true)
        markFirstLoginShown(user.nama_pengguna)
      }
    }, 1500)
    return () => clearTimeout(t)
  }, [isDemo, user])

  // Trial/paid account nearing expiry trigger
  useEffect(() => {
    if (isDemo || !user) return
    const days = user.access_days_remaining
    if (days === null || days === undefined || days > 3) return

    const t = setTimeout(() => {
      if (isCooldownElapsed()) {
        setTriggerReason('access_expiring')
        setIsPricingOpen(true)
      }
    }, 1800)
    return () => clearTimeout(t)
  }, [isDemo, user?.nama_pengguna, user?.access_days_remaining])

  const isOverLimit = useMemo(
    () => state.is_demo && state.usage_count >= state.usage_limit,
    [state.is_demo, state.usage_count, state.usage_limit]
  )
  const remainingUsage = useMemo(
    () => Math.max(0, state.usage_limit - state.usage_count),
    [state.usage_limit, state.usage_count]
  )
  const isSubscribed = useMemo(() => {
    if (!state.is_demo) return true
    if (!state.subscription_type || !state.subscription_end) return false
    return new Date(state.subscription_end) > new Date()
  }, [state.is_demo, state.subscription_type, state.subscription_end])

  const openPricing = useCallback((reason: PopupTriggerReason) => {
    if (reason !== 'manual' && !isCooldownElapsed()) return
    setTriggerReason(reason)
    setIsPricingOpen(true)
  }, [])

  const closePricing = useCallback(() => {
    setIsPricingOpen(false)
    markDismissed()
  }, [])

  const incrementUsage = useCallback(() => {
    if (!isDemo) return
    setState(prev => {
      const n = prev.usage_count + 1
      if (n >= prev.usage_limit && isCooldownElapsed()) {
        setTimeout(() => { setTriggerReason('usage_limit'); setIsPricingOpen(true) }, 500)
      }
      return { ...prev, usage_count: n }
    })
  }, [isDemo])

  const checkPremiumFeature = useCallback((featureName: string): boolean => {
    if (!isDemo) return false
    if (!PREMIUM_FEATURES.includes(featureName)) return false
    if (isCooldownElapsed()) {
      setTimeout(() => { setTriggerReason('premium_feature'); setIsPricingOpen(true) }, 300)
    }
    return true
  }, [isDemo])

  const value: DemoContextValue = useMemo(() => ({
    state, isPricingOpen, triggerReason, openPricing, closePricing,
    incrementUsage, checkPremiumFeature, isOverLimit, remainingUsage,
    premiumFeatures: PREMIUM_FEATURES, isSubscribed,
  }), [state, isPricingOpen, triggerReason, openPricing, closePricing,
       incrementUsage, checkPremiumFeature, isOverLimit, remainingUsage, isSubscribed])

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo must be used within DemoProvider')
  return ctx
}
