import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CreditCard, ExternalLink, MessageCircle, RefreshCw } from 'lucide-react'
import { api } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

interface PublicPlan {
  id: string
  code: string
  name: string
  description?: string | null
  price: number
  currency: string
  duration_days: number
  is_recommended?: boolean
}

interface Invoice {
  id: string
  invoice_number: string
  external_ref: string
  payment_url: string | null
  whatsapp_number?: string | null
  whatsapp_message?: string | null
  amount: number
  currency: string
  status: string
  provider: string
  expires_at: string | null
  created_at: string
}

function isLifetimePlan(plan: PublicPlan) {
  const text = `${plan.code} ${plan.name}`.toLowerCase()
  return plan.duration_days === 0 || text.includes('lifetime') || text.includes('seumur')
}

function getBuyerVisiblePlans(plans: PublicPlan[]) {
  const lifetimePlans = plans.filter(isLifetimePlan)
  return lifetimePlans.length > 0 ? lifetimePlans : plans
}

export default function PaymentInvoice() {
  const { user } = useAuth()
  const toast = useToast()
  const [plans, setPlans] = useState<PublicPlan[]>([])
  const [selectedCode, setSelectedCode] = useState('')
  const [email, setEmail] = useState(user?.email ?? '')
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api<PublicPlan[]>('license:getPublicPlans').then(r => {
      if (cancelled) return
      if (r.success) {
        const rows = getBuyerVisiblePlans(r.data ?? [])
        setPlans(rows)
        setSelectedCode(current => current || rows.find(p => p.is_recommended || isLifetimePlan(p))?.code || rows[0]?.code || '')
      } else {
        toast(r.message || 'Gagal memuat paket pembayaran', 'error')
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [toast])

  const selectedPlan = useMemo(
    () => plans.find(plan => plan.code === selectedCode) ?? null,
    [plans, selectedCode],
  )

  async function createInvoice() {
    if (!selectedPlan) return toast('Paket wajib dipilih', 'error')
    if (!email.trim()) return toast('Email akun pembeli wajib diisi', 'error')
    setCreating(true)
    const r = await api<Invoice>('license:createManualPaymentRequest', {
      email: email.trim(),
      plan_code: selectedPlan.code,
    })
    setCreating(false)
    if (!r.success || !r.data) return toast(r.message || 'Gagal membuat request pembayaran', 'error')
    setInvoice(r.data)
    toast('Request pembayaran dibuat', 'success')
    if (r.data.payment_url) void api('app:openExternal', r.data.payment_url)
  }

  useEffect(() => {
    if (!invoice?.external_ref || invoice.status === 'paid') return
    const interval = window.setInterval(async () => {
      const r = await api<Invoice>('license:getPaymentStatus', invoice.external_ref)
      if (!r.success || !r.data) return
      const next = r.data
      setInvoice(prev => prev ? { ...prev, ...next } : next)
      if (next.status === 'paid') {
        toast('Pembayaran sudah diapprove. Lisensi akan disinkronkan.', 'success')
        if (user?.nama_pengguna) await api('license:syncBuyerLicense', user.nama_pengguna)
      }
    }, 15_000)
    return () => window.clearInterval(interval)
  }, [invoice?.external_ref, invoice?.status, toast, user?.nama_pengguna])

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-white">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="heading-1">Pembayaran Lisensi</h1>
          <p className="text-caption">Ajukan aktivasi sekali beli seumur hidup melalui WhatsApp developer.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Paket Sekali Beli</h2>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Memuat paket...</p>
          ) : plans.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Belum ada paket aktif dari server.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {plans.map(plan => {
                const active = selectedCode === plan.code
                return (
                  <button
                    key={plan.code}
                    type="button"
                    onClick={() => setSelectedCode(plan.code)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      active
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">{plan.code}</p>
                        <h3 className="mt-1 font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                      </div>
                      {(plan.is_recommended || isLifetimePlan(plan)) && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          Sekali beli
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-xl font-extrabold text-slate-900 dark:text-white">
                      Rp {Number(plan.price).toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs text-slate-500">{plan.duration_days} hari</p>
                    {plan.description && <p className="mt-3 text-xs leading-5 text-slate-500">{plan.description}</p>}
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <aside className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">Request Manual</h2>
          <label className="mt-4 block text-xs font-semibold text-slate-500">Email akun pembeli</label>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            placeholder="nama@email.com"
          />

          {selectedPlan && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
              <p className="font-semibold text-slate-800 dark:text-white">{selectedPlan.name}</p>
              <p className="mt-1 text-slate-500">Rp {Number(selectedPlan.price).toLocaleString('id-ID')}</p>
            </div>
          )}

          <button
            onClick={createInvoice}
            disabled={creating || !selectedPlan}
            className="mt-4 w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {creating ? 'Membuat request...' : 'Chat Developer'}
          </button>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            Sistem membuat request `pending` di Supabase, lalu membuka WhatsApp. Developer mengaktifkan lisensi seumur hidup setelah pembayaran dikonfirmasi.
          </p>

          {invoice && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/60 dark:bg-green-900/20 dark:text-green-200">
              <div className="flex items-start gap-2">
                {invoice.status === 'paid' ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <MessageCircle className="mt-0.5 h-4 w-4" />}
                <div>
                  <p className="font-bold">{invoice.invoice_number || invoice.external_ref}</p>
                  <p className="mt-1">Status: {invoice.status}</p>
                </div>
              </div>
              {invoice.expires_at && <p>Expired: {new Date(invoice.expires_at).toLocaleString('id-ID')}</p>}
              {invoice.payment_url && (
                <button
                  onClick={() => void api('app:openExternal', invoice.payment_url!)}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Chat WhatsApp
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
