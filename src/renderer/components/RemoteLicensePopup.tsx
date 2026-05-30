import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Lock, MessageCircle, X } from 'lucide-react'
import { api } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

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

export default function RemoteLicensePopup() {
  const { user, logout } = useAuth()
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

  const close = () => {
    if (!force && popup.dismissible !== false) setState(null)
  }

  const openUrl = (url: string) => {
    void api('app:openExternal', url)
    if (!force) setState(null)
  }

  const canRequestPayment = Boolean(user?.email || user?.remote_customer_id)
  const showPlans = !isDanger || ['EXPIRED', 'FEATURE_LOCKED', 'DEMO_LIMIT', 'ACCESS_EXPIRING', 'TRANSACTION_LIMIT', 'DEVICE_LIMIT'].includes(String(popup.code ?? '').toUpperCase())

  const requestPayment = async (plan: PublicPlan) => {
    if (!canRequestPayment) {
      setPaymentMessage('Login dengan akun pembeli dulu untuk membuat request pembayaran.')
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
      setPaymentMessage(result.message || 'Gagal membuat request pembayaran.')
      return
    }
    setInvoice(result.data)
    setPaymentMessage(result.message || 'Request pembayaran dibuat.')
    if (result.data.payment_url) void api('app:openExternal', result.data.payment_url)
  }

  const whatsappUrl = popup.whatsapp_number
    ? `https://wa.me/${popup.whatsapp_number}?text=${encodeURIComponent('Halo, saya perlu bantuan aktivasi lisensi MediaSoft POS.')}`
    : null

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {popup.image_url && (
          <img src={popup.image_url} alt="" className="h-40 w-full object-cover" />
        )}
        <div className="p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isDanger ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{popup.title}</h2>
                {popup.code && <p className="text-[11px] uppercase tracking-wide text-slate-400">{popup.code}</p>}
              </div>
            </div>
            {!force && popup.dismissible !== false && (
              <button onClick={close} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {popup.description && (
            <p className="whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">
              {popup.description}
            </p>
          )}

          {popup.pricing_html && (
            <div
              className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              dangerouslySetInnerHTML={{ __html: sanitize(popup.pricing_html) }}
            />
          )}

          {showPlans && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Paket Langganan</p>
                {plansLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              </div>
              {!plansLoading && plans.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Paket aktif belum tersedia dari server developer.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {plans.map(plan => (
                    <div key={plan.code} className={`rounded-lg border p-3 ${plan.is_recommended ? 'border-primary-300 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/20' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{plan.name}</p>
                          <p className="text-[11px] uppercase text-slate-400">{plan.code}</p>
                        </div>
                        {plan.is_recommended && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            Rekomendasi
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-lg font-extrabold text-slate-900 dark:text-white">Rp {Number(plan.price).toLocaleString('id-ID')}</p>
                      <p className="text-xs text-slate-500">{plan.duration_days} hari</p>
                      {plan.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{plan.description}</p>}
                      <button
                        type="button"
                        onClick={() => requestPayment(plan)}
                        disabled={creatingPlan === plan.code || Number(plan.price) <= 0}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                      >
                        {creatingPlan === plan.code ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                        Ajukan Paket
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {(paymentMessage || invoice) && (
                <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800 dark:border-green-900/60 dark:bg-green-900/20 dark:text-green-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div>
                      <p>{paymentMessage}</p>
                      {invoice?.invoice_number && <p className="mt-1 font-semibold">{invoice.invoice_number}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {force && (
              <button
                onClick={logout}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Keluar
              </button>
            )}
            {!force && popup.dismissible !== false && (
              <button
                onClick={close}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Nanti
              </button>
            )}
            {whatsappUrl && (
              <button
                onClick={() => openUrl(whatsappUrl)}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                WhatsApp
              </button>
            )}
            {popup.cta_url && (
              <button
                onClick={() => openUrl(popup.cta_url!)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
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
