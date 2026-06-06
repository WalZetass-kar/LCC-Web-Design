import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  ExternalLink,
  Loader2,
  Lock,
  MessageCircle,
  Rocket,
  Star,
  X,
  Zap,
} from 'lucide-react'
import { api } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useDemo } from '../contexts/DemoContext'
import { SUBSCRIPTION_UPGRADE_WA_NUMBER, normalizePhoneNumber } from '../utils/whatsapp'

interface PublicPlan {
  id: string | number
  code: string
  name: string
  description?: string | null
  price: number
  currency?: string | null
  duration_days: number
  is_recommended?: boolean
}

interface Invoice {
  external_ref?: string
  invoice_number?: string
  payment_url?: string | null
  status?: string
  whatsapp_number?: string | null
  whatsapp_message?: string | null
}

interface RemotePopup {
  code?: string
  title: string
  description?: string | null
  cta_text?: string | null
  cta_url?: string | null
  whatsapp_number?: string | null
  image_url?: string | null
  pricing_html?: string | null
  severity?: 'info' | 'warning' | 'danger'
  dismissible?: boolean
}

interface PopupState {
  popup: RemotePopup
  force: boolean
}

function formatPlanPrice(plan: PublicPlan): string {
  const currency = !plan.currency || plan.currency.toUpperCase() === 'IDR' ? 'Rp' : plan.currency
  return `${currency} ${Number(plan.price).toLocaleString('id-ID')}`
}

function buildWhatsAppUrl(phone: string | null | undefined, message: string): string {
  const target = normalizePhoneNumber(phone || SUBSCRIPTION_UPGRADE_WA_NUMBER)
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`
}

function getPlanPeriod(plan: PublicPlan): string {
  if (plan.duration_days <= 1) return '/hari'
  if (plan.duration_days >= 360) return '/tahun'
  if (plan.duration_days >= 28 && plan.duration_days <= 31) return '/bulan'
  return `/${plan.duration_days} hari`
}

function getDailyPrice(plan: PublicPlan): string | null {
  if (plan.duration_days <= 1) return null
  const daily = Math.max(1, Math.round(Number(plan.price) / plan.duration_days))
  return `= Rp ${daily.toLocaleString('id-ID')}/hari`
}

function getPlanVisual(plan: PublicPlan, index: number) {
  const text = `${plan.name} ${plan.code}`.toLowerCase()
  if (text.includes('hari') || text.includes('daily') || index === 0) {
    return { Icon: Zap, accent: 'from-violet-500 to-fuchsia-500', glow: 'shadow-violet-500/30' }
  }
  if (text.includes('tahun') || text.includes('year') || index >= 2) {
    return { Icon: Star, accent: 'from-amber-400 to-orange-500', glow: 'shadow-amber-500/30' }
  }
  return { Icon: Crown, accent: 'from-slate-700 to-slate-800', glow: 'shadow-slate-900/20' }
}

function getPlanFeatures(plan: PublicPlan, index: number): string[] {
  const fromDescription = (plan.description ?? '')
    .split(/\r?\n|,|•|;/)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 7)

  const defaults = plan.duration_days >= 360 || index >= 2
    ? ['Semua fitur Bulanan', 'Multi-user unlimited', 'Stok opname', 'Manajemen hutang', 'Shift management', 'API access', 'Support prioritas']
    : plan.duration_days >= 28 || index === 1
      ? ['Semua fitur Harian', 'Multi-user 3 akun', 'Export Excel & PDF', 'Laporan lanjutan', 'Backup otomatis', 'Support prioritas']
      : ['Transaksi tak terbatas', 'Export laporan dasar', 'Support email']

  if (fromDescription.length >= 3) return fromDescription
  if (fromDescription.length > 0) {
    return [...fromDescription, ...defaults.filter(item => !fromDescription.includes(item))].slice(0, 7)
  }

  if (plan.duration_days >= 360 || index >= 2) {
    return defaults
  }
  if (plan.duration_days >= 28 || index === 1) {
    return defaults
  }
  return defaults
}

function isLifetimePlan(plan: PublicPlan) {
  const text = `${plan.code} ${plan.name}`.toLowerCase()
  return plan.duration_days === 0 || text.includes('lifetime') || text.includes('seumur')
}

function getBuyerVisiblePlans(plans: PublicPlan[]) {
  const lifetimePlans = plans.filter(isLifetimePlan)
  return lifetimePlans.length > 0 ? lifetimePlans : plans
}

export default function RemoteLicensePopup() {
  const { user, logout } = useAuth()
  const { state: demoState, remainingUsage } = useDemo()
  const [state, setState] = useState<PopupState | null>(null)
  const [plans, setPlans] = useState<PublicPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [creatingPlan, setCreatingPlan] = useState<string | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null)

  useEffect(() => {
    const onPopup = (event: Event) => {
      const detail = (event as CustomEvent).detail ?? {}
      if (detail.popup?.title) {
        setState({
          popup: detail.popup,
          force: !!detail.force || detail.popup.dismissible === false,
        })
      }
    }
    window.addEventListener('license:remote-popup', onPopup)
    return () => window.removeEventListener('license:remote-popup', onPopup)
  }, [])

  useEffect(() => {
    if (!state) return
    let cancelled = false
    setPlansLoading(true)
    api<PublicPlan[]>('license:getPublicPlans').then(result => {
      if (cancelled) return
      setPlans(result.success ? result.data ?? [] : [])
    }).finally(() => {
      if (!cancelled) setPlansLoading(false)
    })
    return () => { cancelled = true }
  }, [state?.popup.code, state?.popup.title])

  if (!state) return null

  const { popup, force } = state
  const isDanger = popup.severity === 'danger' || popup.code === 'BLOCKED'
  const isBlocking = force || popup.dismissible === false
  const Icon = isDanger || isBlocking ? Lock : AlertTriangle
  const usageLimit = Math.max(1, demoState.usage_limit || 10)
  const usageCount = Math.min(usageLimit, Math.max(0, demoState.usage_count || 0))
  const usagePercent = Math.round((usageCount / usageLimit) * 100)

  const close = () => {
    if (!force && popup.dismissible !== false) setState(null)
  }

  const openUrl = (url: string) => {
    void api('app:openExternal', url)
    if (!force) setState(null)
  }

  const canRequestPayment = Boolean(user?.email || user?.remote_customer_id)
  const showPlans = !isDanger || ['EXPIRED', 'FEATURE_LOCKED', 'DEMO_LIMIT', 'ACCESS_EXPIRING', 'TRANSACTION_LIMIT', 'DEVICE_LIMIT'].includes(String(popup.code ?? '').toUpperCase())
  const visiblePlans = getBuyerVisiblePlans(plans)
  const fallbackWhatsappMessage = [
    'Halo Admin, saya ingin membeli lisensi seumur hidup Zetass Pos.',
    '',
    `Nama akun: ${user?.nama_lengkap ?? user?.nama_pengguna ?? '-'}`,
    `Email: ${user?.email ?? '-'}`,
    '',
    'Mohon info paket, pembayaran, dan aktivasinya.',
  ].join('\n')
  const supportWhatsappUrl = buildWhatsAppUrl(popup.whatsapp_number, fallbackWhatsappMessage)

  const requestPayment = async (plan: PublicPlan) => {
    if (!canRequestPayment) {
      setPaymentMessage('Login dengan akun pembeli dulu untuk membuat request persetujuan lisensi.')
      return
    }
    setCreatingPlan(plan.code)
    setPaymentMessage(null)
    const result = await api<Invoice>('license:createManualPaymentRequest', {
      email: user?.email ?? undefined,
      customer_id: user?.remote_customer_id ?? undefined,
      plan_code: plan.code,
    })
    setCreatingPlan(null)
    if (!result.success || !result.data) {
      const fallbackUrl = buildWhatsAppUrl(popup.whatsapp_number, [
        'Halo Admin, saya ingin membeli lisensi seumur hidup Zetass Pos.',
        '',
        `Paket: ${plan.name} (${plan.code})`,
        `Harga: ${formatPlanPrice(plan)}`,
        `Durasi: ${plan.duration_days} hari`,
        `Nama akun: ${user?.nama_lengkap ?? user?.nama_pengguna ?? '-'}`,
        `Email: ${user?.email ?? '-'}`,
        '',
        'Mohon info pembayaran dan aktivasi lisensi seumur hidupnya.',
      ].join('\n'))
      setPaymentMessage(result.message || 'Gagal membuat request otomatis. Membuka WhatsApp admin.')
      void api('app:openExternal', fallbackUrl)
      return
    }
    setInvoice(result.data)
    setPaymentMessage(result.message || 'Request persetujuan lisensi dibuat.')
    const paymentUrl = result.data.payment_url
      || buildWhatsAppUrl(result.data.whatsapp_number || popup.whatsapp_number, result.data.whatsapp_message || fallbackWhatsappMessage)
    void api('app:openExternal', paymentUrl)
  }

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-md">
      <div className="relative max-h-[92vh] w-full max-w-[780px] overflow-y-auto rounded-2xl border border-violet-500/20 bg-[#0b1426]/95 px-6 py-6 text-white shadow-2xl shadow-violet-950/50 ring-1 ring-white/5 sm:px-7">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.20),transparent_42%),radial-gradient(circle_at_0%_100%,rgba(124,58,237,0.18),transparent_36%)]" />

        {!force && popup.dismissible !== false && (
          <button
            onClick={close}
            className="absolute right-4 top-4 z-10 rounded-xl bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="relative">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30">
            {isDanger || isBlocking ? <Icon className="h-7 w-7" /> : <Rocket className="h-7 w-7" />}
          </div>

          <div className="mt-4 text-center">
            <h2 className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-purple-400 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
              {popup.title || 'Upgrade Akun Anda'} <span className="text-violet-300">🚀</span>
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {popup.description || 'Pilih lisensi sekali beli untuk bisnis Anda'}
            </p>
            {popup.code && <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-300/60">{popup.code}</p>}
          </div>

          {popup.image_url && (
            <img
              src={popup.image_url}
              alt=""
              className="mx-auto mt-4 max-h-40 w-full max-w-xl rounded-2xl border border-white/10 object-cover shadow-lg shadow-slate-950/30"
            />
          )}

          {demoState.is_demo && (
            <div className="mx-auto mt-4 max-w-[270px]">
              <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>Transaksi demo</span>
                <span className="font-bold text-amber-400">{usageCount}/{usageLimit}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="mt-2 text-center text-[11px] text-slate-500">
                Sisa {remainingUsage} transaksi demo
              </p>
            </div>
          )}

          <div className="mt-4 flex justify-center">
            <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[11px] font-bold text-amber-300 shadow-lg shadow-amber-900/20">
              Sekali beli seumur hidup via WhatsApp admin
            </div>
          </div>

          {popup.pricing_html && (
            <div
              className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200"
              dangerouslySetInnerHTML={{ __html: sanitize(popup.pricing_html) }}
            />
          )}

          {showPlans && (
            <div className="mt-4">
              {!plansLoading && visiblePlans.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-center">
                  <p className="text-sm font-semibold text-slate-200">Paket aktif belum tersedia dari server developer.</p>
                  <p className="mt-1 text-xs text-slate-500">Tetap bisa chat admin WA untuk info harga terbaru.</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  {visiblePlans.map((plan, index) => {
                    const visual = getPlanVisual(plan, index)
                    const PlanIcon = visual.Icon
                    const recommended = plan.is_recommended || isLifetimePlan(plan) || index === 1
                    const daily = getDailyPrice(plan)
                    return (
                      <div
                        key={plan.code}
                        className={`relative flex min-h-[350px] flex-col overflow-visible rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-violet-400/70 ${
                          recommended
                            ? 'border-violet-400/70 bg-slate-900/70 shadow-xl shadow-violet-950/30'
                            : 'border-slate-700/80 bg-slate-950/30'
                        }`}
                      >
                        {recommended && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1 text-[10px] font-bold text-white shadow-lg shadow-violet-500/30">
                            ★ Rekomendasi
                          </div>
                        )}

                        <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${visual.accent} text-white shadow-lg ${visual.glow}`}>
                          <PlanIcon className="h-5 w-5" />
                        </div>

                        <p className="truncate text-sm font-bold text-white">{plan.name}</p>
                        <p className="mt-5 text-3xl font-extrabold leading-none text-white">{formatPlanPrice(plan)}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          <span>{getPlanPeriod(plan)}</span>
                          {daily && <span className="ml-1 block sm:inline">{daily}</span>}
                        </p>

                        <ul className="mt-5 flex-1 space-y-3 text-xs text-slate-300">
                          {getPlanFeatures(plan, index).map(feature => (
                            <li key={feature} className="flex items-start gap-2">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>

                        <button
                          type="button"
                          onClick={() => requestPayment(plan)}
                          disabled={creatingPlan === plan.code || Number(plan.price) <= 0}
                          className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            recommended
                              ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25 hover:from-violet-600 hover:to-fuchsia-600'
                              : 'bg-white/10 hover:bg-white/15'
                          }`}
                        >
                          {creatingPlan === plan.code ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                          Beli via WhatsApp
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
              {plansLoading && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat paket...
                </div>
              )}

              {(paymentMessage || invoice) && (
                <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    <div>
                      <p>{paymentMessage}</p>
                      {invoice?.invoice_number && <p className="mt-1 font-semibold">{invoice.invoice_number}</p>}
                      {(invoice?.payment_url || invoice?.whatsapp_number) && (
                        <button
                          type="button"
                          onClick={() => openUrl(invoice.payment_url || buildWhatsAppUrl(invoice.whatsapp_number || popup.whatsapp_number, invoice.whatsapp_message || fallbackWhatsappMessage))}
                          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-600"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Chat WhatsApp Admin
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {force && (
              <button
                onClick={logout}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
              >
                Keluar
              </button>
            )}
            {!force && popup.dismissible !== false && (
              <button
                onClick={close}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10"
              >
                Nanti
              </button>
            )}
            {supportWhatsappUrl && (
              <button
                onClick={() => openUrl(supportWhatsappUrl)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-950/30 hover:bg-emerald-600"
              >
                <MessageCircle className="h-4 w-4" />
                Chat Admin WA
              </button>
            )}
            {popup.cta_url && (
              <button
                onClick={() => openUrl(popup.cta_url!)}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-sm font-bold text-white hover:bg-violet-600"
              >
                <ExternalLink className="h-4 w-4" />
                {popup.cta_text || 'Buka'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function sanitize(html: string): string {
  return html
    .replace(/<\s*(script|iframe|object|embed|style)[\s\S]*?>[\s\S]*?<\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|style)[^>]*?\/?>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
}
