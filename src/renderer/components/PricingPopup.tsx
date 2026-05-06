/**
 * ═══════════════════════════════════════════════════════════════════════
 * PRICING POPUP — Premium conversion-oriented pricing modal
 * ═══════════════════════════════════════════════════════════════════════
 *
 * 3-tier pricing (Daily / Monthly / Yearly) with:
 * - Highlighted recommended plan (Monthly)
 * - "Best Value" badge on Yearly
 * - Urgency countdown timer
 * - Micro-testimonial
 * - Usage progress indicator
 * - Smooth animations
 */

import { useState, useEffect, useMemo } from 'react'
import {
  X, Rocket, Crown, Zap, Star, Clock, Shield,
  ChevronRight, Check, Sparkles, Users, FileText,
  BarChart2, Database, TrendingUp, MessageCircle,
} from 'lucide-react'
import { useDemo } from '../contexts/DemoContext'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../utils/api'
import { openWhatsAppUpgrade } from '../utils/whatsapp'
import type { Identitas, SubscriptionPlan } from '../../shared/types'

// ─── Dynamic plan helpers ────────────────────────────────────────────────────

function getPlanIcon(name: string) {
  const n = name.toLowerCase()
  if (n.includes('hari') || n.includes('daily')) return <Zap size={20} />
  if (n.includes('tahun') || n.includes('year')) return <Star size={20} />
  return <Crown size={20} />
}

function getPlanPeriod(days: number): string {
  if (days === 1) return '/hari'
  if (days === 7) return '/minggu'
  if (days >= 28 && days <= 31) return '/bulan'
  if (days >= 360 && days <= 366) return '/tahun'
  return `/${days} hari`
}

function getPlanBadge(plan: SubscriptionPlan): string | null {
  if (plan.is_recommended) return '⭐ Rekomendasi'
  return null
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatPrice(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID')
}

// ─── Trigger Messages ─────────────────────────────────────────────────

const TRIGGER_MESSAGES: Record<string, { title: string; subtitle: string }> = {
  first_login: {
    title: 'Selamat Datang di MediaSoft POS! 🎉',
    subtitle: 'Anda menggunakan akun demo. Upgrade untuk akses penuh tanpa batasan.',
  },
  usage_limit: {
    title: 'Batas Transaksi Demo Tercapai ⚠️',
    subtitle: 'Anda telah mencapai batas maksimum transaksi demo. Upgrade sekarang!',
  },
  premium_feature: {
    title: 'Fitur Premium 🔒',
    subtitle: 'Fitur ini hanya tersedia untuk pengguna berlangganan.',
  },
  session_start: {
    title: 'Upgrade Akun Anda 🚀',
    subtitle: 'Anda sedang menggunakan akun demo dengan fitur terbatas.',
  },
  manual: {
    title: 'Upgrade Akun Anda 🚀',
    subtitle: 'Pilih paket yang sesuai untuk bisnis Anda.',
  },
}

// ─── Component ────────────────────────────────────────────────────────

export default function PricingPopup() {
  const {
    isPricingOpen, closePricing, triggerReason,
    state, isOverLimit, remainingUsage,
  } = useDemo()
  const { user } = useAuth()

  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [ownerPhone, setOwnerPhone] = useState<string | null>(null)
  const [storeName, setStoreName] = useState<string | null>(null)

  // Fetch active plans + owner info on mount
  useEffect(() => {
    api<SubscriptionPlan[]>('plan:getActive').then(r => {
      if (r.success && r.data?.length) {
        setPlans(r.data)
        // Auto-select recommended plan, or first
        const rec = r.data.find(p => p.is_recommended)
        setSelectedPlan(rec?.id ?? r.data[0].id)
      }
    })
    api<Identitas>('identitas:get').then(r => {
      if (r.success && r.data) {
        setOwnerPhone(r.data.nomorwaowner)
        setStoreName(r.data.namatoko)
      }
    })
  }, [])

  // Animation on open
  useEffect(() => {
    if (isPricingOpen) {
      setIsAnimating(true)
      // Set a 30-min countdown for urgency
      setCountdown(30 * 60)
      const t = setTimeout(() => setIsAnimating(false), 600)
      return () => clearTimeout(t)
    }
  }, [isPricingOpen])

  // Countdown timer
  useEffect(() => {
    if (!isPricingOpen || countdown <= 0) return
    const iv = setInterval(() => setCountdown(p => Math.max(0, p - 1)), 1000)
    return () => clearInterval(iv)
  }, [isPricingOpen, countdown])

  const countdownStr = useMemo(() => {
    const m = Math.floor(countdown / 60)
    const s = countdown % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }, [countdown])

  const msgs = TRIGGER_MESSAGES[triggerReason ?? 'manual']
  const usagePercent = Math.min(100,
    Math.round((state.usage_count / state.usage_limit) * 100)
  )

  const handleSelectPlan = (planId: number) => {
    setSelectedPlan(planId)
  }

  const selectedPlanData = plans.find(p => p.id === selectedPlan) ?? plans.find(p => p.is_recommended) ?? plans[0]

  const handleUpgrade = () => {
    // Track intent analytics (localStorage for now)
    try {
      const analytics = JSON.parse(localStorage.getItem('pos_analytics') || '[]')
      analytics.push({
        event: 'plan_clicked',
        plan: selectedPlan,
        trigger: triggerReason,
        at: new Date().toISOString(),
      })
      localStorage.setItem('pos_analytics', JSON.stringify(analytics.slice(-50)))
    } catch {}

    // Open WhatsApp with pre-filled upgrade message
    if (selectedPlanData) {
      openWhatsAppUpgrade({
        phone: ownerPhone,
        planName: selectedPlanData.name,
        planPrice: formatPrice(selectedPlanData.price),
        planPeriod: getPlanPeriod(selectedPlanData.duration_days),
        userName: user?.nama_lengkap ?? user?.nama_pengguna ?? 'Demo User',
        storeName,
        email: null,
      })
    }

    closePricing()
  }

  if (!isPricingOpen) return null

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-purple-900/30 to-slate-900/70 backdrop-blur-lg pricing-backdrop-animate"
        onClick={closePricing}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-4xl max-h-[95vh] overflow-y-auto
        bg-white dark:bg-slate-900 rounded-3xl shadow-2xl
        border border-white/20 dark:border-slate-700/50
        ${isAnimating ? 'pricing-modal-enter' : ''}
        scrollbar-thin`}
      >
        {/* Close button */}
        <button
          onClick={closePricing}
          className="absolute top-4 right-4 z-10 p-2 rounded-xl
            bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur
            hover:bg-slate-200 dark:hover:bg-slate-700
            text-slate-500 hover:text-slate-700 dark:hover:text-slate-200
            transition-all duration-200"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="px-6 sm:px-8 pt-8 pb-4 text-center">
          {/* Animated icon */}
          <div className="inline-flex items-center justify-center w-16 h-16
            rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600
            shadow-xl shadow-purple-500/30 mb-4 pricing-icon-pulse"
          >
            <Rocket size={28} className="text-white" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold
            bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600
            bg-clip-text text-transparent mb-2"
          >
            {msgs.title}
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            {msgs.subtitle}
          </p>

          {/* Usage progress bar */}
          {state.is_demo && (
            <div className="mt-4 max-w-xs mx-auto">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-500 dark:text-slate-400">
                  Transaksi demo
                </span>
                <span className={`font-bold ${isOverLimit ? 'text-red-500' : 'text-amber-500'}`}>
                  {state.usage_count}/{state.usage_limit}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isOverLimit
                      ? 'bg-gradient-to-r from-red-500 to-red-400'
                      : usagePercent >= 70
                        ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                        : 'bg-gradient-to-r from-violet-500 to-purple-400'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              {remainingUsage > 0 && !isOverLimit && (
                <p className="text-xs text-slate-400 mt-1">
                  Sisa {remainingUsage} transaksi demo
                </p>
              )}
            </div>
          )}

          {/* Urgency countdown */}
          {countdown > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2
              rounded-full bg-gradient-to-r from-amber-50 to-orange-50
              dark:from-amber-900/20 dark:to-orange-900/20
              border border-amber-200/50 dark:border-amber-700/30"
            >
              <Clock size={14} className="text-amber-500 animate-pulse" />
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                Penawaran spesial berakhir dalam {countdownStr}
              </span>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="px-4 sm:px-8 pb-4">
          <div className={`grid grid-cols-1 gap-4 ${plans.length === 2 ? 'md:grid-cols-2' : plans.length >= 3 ? 'md:grid-cols-3' : ''}`}>
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id
              const isRecommended = plan.is_recommended
              const badge = getPlanBadge(plan)
              const period = getPlanPeriod(plan.duration_days)
              const pricePerDay = Math.round(plan.price / plan.duration_days)

              return (
                <button
                  key={plan.id}
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`relative flex flex-col p-5 rounded-2xl text-left
                    transition-all duration-300 border-2 group
                    ${isSelected
                      ? isRecommended
                        ? 'border-purple-500 bg-gradient-to-b from-purple-50 to-violet-50/50 dark:from-purple-900/20 dark:to-violet-900/10 shadow-xl shadow-purple-500/15 scale-[1.02]'
                        : 'border-violet-400 bg-violet-50/50 dark:bg-violet-900/10 shadow-lg'
                      : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md'
                    }
                    ${isRecommended ? 'md:-mt-2 md:mb-0 md:pb-7' : ''}
                  `}
                >
                  {/* Badge */}
                  {badge && (
                    <span className={`absolute -top-3 left-1/2 -translate-x-1/2
                      px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap
                      ${isRecommended
                        ? 'bg-gradient-to-r from-purple-600 to-violet-500 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-gradient-to-r from-amber-500 to-orange-400 text-white shadow-lg shadow-amber-500/30'
                      }`}
                    >
                      {badge}
                    </span>
                  )}

                  {/* Plan icon + name */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2.5 rounded-xl ${
                      isSelected
                        ? 'bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    } transition-all`}>
                      {getPlanIcon(plan.name)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white">
                        {plan.name}
                      </h3>
                      <span className="text-xs text-slate-400">{plan.duration_days} hari</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white">
                      {formatPrice(plan.price)}
                    </span>
                    <span className="text-sm text-slate-400 ml-1">{period}</span>
                    {plan.duration_days > 1 && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        ≈ {formatPrice(pricePerDay)}/hari
                      </p>
                    )}
                  </div>

                  {/* Features list */}
                  <ul className="space-y-2 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check size={14} className={`shrink-0 mt-0.5 ${
                          isSelected ? 'text-purple-500' : 'text-emerald-500'
                        }`} />
                        <span className="text-slate-600 dark:text-slate-300">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Selection indicator */}
                  <div className={`mt-4 py-2.5 rounded-xl text-center text-sm font-semibold transition-all
                    ${isSelected
                      ? 'bg-gradient-to-r from-purple-600 to-violet-500 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-purple-50 dark:group-hover:bg-purple-900/20 group-hover:text-purple-600'
                    }`}
                  >
                    {isSelected ? '✓ Dipilih' : 'Pilih Paket'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Features highlights strip */}
        <div className="px-4 sm:px-8 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: <Shield size={16} />, label: 'Keamanan Data' },
              { icon: <Users size={16} />, label: 'Multi User' },
              { icon: <BarChart2 size={16} />, label: 'Laporan Lengkap' },
              { icon: <Database size={16} />, label: 'Backup Otomatis' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2.5
                rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <span className="text-purple-500">{f.icon}</span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="px-4 sm:px-8 pb-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-purple-50
            dark:from-violet-900/10 dark:to-purple-900/10
            border border-violet-100 dark:border-violet-800/30"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br
                from-violet-400 to-purple-500 flex items-center justify-center
                text-white font-bold text-sm shrink-0"
              >
                AS
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300 italic">
                  "Setelah upgrade, penjualan kami naik 40% karena fitur laporan
                  dan stok otomatis. Sangat worth it!"
                </p>
                <p className="text-xs text-slate-400 mt-1.5 font-medium">
                  — Andi Saputra, Toko Sejahtera
                </p>
                <div className="flex gap-0.5 mt-1">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={12} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Footer */}
        <div className="px-4 sm:px-8 pb-8 flex flex-col items-center gap-3">
          <button
            onClick={handleUpgrade}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl
              bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-500
              hover:from-emerald-700 hover:via-green-700 hover:to-emerald-600
              text-white font-bold text-sm sm:text-base
              shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40
              transition-all duration-300 active:scale-[0.98]
              flex items-center justify-center gap-2.5 group"
            title="Anda akan diarahkan ke WhatsApp admin"
          >
            <MessageCircle size={20} className="group-hover:animate-bounce" />
            <span>Upgrade via WhatsApp</span>
            <ChevronRight size={16} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <MessageCircle size={11} />
            Chat langsung dengan admin — pesan otomatis terisi
          </p>
          <button
            onClick={closePricing}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl
              text-sm text-slate-400 hover:text-slate-600
              dark:hover:text-slate-300 transition-colors font-medium"
          >
            Nanti saja
          </button>
        </div>

        {/* Trust badges */}
        <div className="px-4 sm:px-8 pb-6 flex items-center justify-center gap-4
          text-xs text-slate-400 dark:text-slate-500"
        >
          <span className="flex items-center gap-1">
            <Shield size={12} /> SSL Secured
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <TrendingUp size={12} /> 1000+ Toko
          </span>
          <span>•</span>
          <span>Garansi 30 Hari</span>
        </div>
      </div>
    </div>
  )
}
