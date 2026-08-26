import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Crown,
  ExternalLink,
  Flame,
  HelpCircle,
  Laptop,
  Loader2,
  Lock,
  MessageCircle,
  Package,
  Radio,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { api } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useDemo } from '../contexts/DemoContext'
import { sanitizeHtml } from '../utils/sanitizeHtml'
import { SUBSCRIPTION_UPGRADE_WA_NUMBER, normalizePhoneNumber } from '../utils/whatsapp'

export interface PublicPlan {
  id: string | number
  code: string
  name: string
  description?: string | null
  features?: string[] | null
  feature_flags?: Record<string, boolean> | null
  price: number
  currency?: string | null
  duration_days: number
  is_recommended?: boolean | number
  sort_order?: number | null
  is_active?: boolean | number
  max_devices?: number
  max_transactions_per_day?: number
  max_products?: number
  max_users?: number
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
  return `${currency} ${Number(plan.price || 0).toLocaleString('id-ID')}`
}

function buildWhatsAppUrl(phone: string | null | undefined, message: string): string {
  const target = normalizePhoneNumber(phone || SUBSCRIPTION_UPGRADE_WA_NUMBER)
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`
}

function getPlanPeriodLabel(plan: PublicPlan): string {
  if (plan.duration_days === 0) return 'Seumur Hidup'
  if (plan.duration_days <= 1) return '1 Hari'
  if (plan.duration_days >= 360) return '1 Tahun'
  if (plan.duration_days >= 28 && plan.duration_days <= 31) return '1 Bulan'
  return `${plan.duration_days} Hari`
}

function getDailyPriceText(plan: PublicPlan): string | null {
  if (plan.duration_days === 0) return 'Akses Permanen'
  if (plan.duration_days <= 1) return null
  const daily = Math.max(1, Math.round(Number(plan.price || 0) / plan.duration_days))
  return `Rp ${daily.toLocaleString('id-ID')} /hari`
}

// In-depth explanation of what you get for any plan
function getDetailedPlanBenefits(plan: PublicPlan): { title: string; subtitle: string }[] {
  const text = `${plan.name} ${plan.code} ${plan.description ?? ''}`.toLowerCase()
  const isLifetime = plan.duration_days === 0 || text.includes('lifetime') || text.includes('seumur')
  const isYearly = plan.duration_days >= 360 || text.includes('tahun') || text.includes('yearly')
  const isMonthly = (plan.duration_days >= 28 && plan.duration_days <= 31) || text.includes('bulan') || text.includes('monthly')

  // If developer specified custom features array in Developer Panel
  if (Array.isArray(plan.features) && plan.features.length > 0) {
    return plan.features.filter(Boolean).map(f => ({
      title: f,
      subtitle: 'Fitur aktif dan siap digunakan untuk operasional toko.',
    }))
  }

  // If description has bullet points
  const descLines = (plan.description ?? '')
    .split(/\r?\n|•/)
    .map(s => s.trim())
    .filter(s => s.length > 2)

  if (descLines.length >= 2) {
    return descLines.map(line => ({
      title: line,
      subtitle: 'Termasuk dalam paket lisensi yang dipilih.',
    }))
  }

  if (isLifetime) {
    return [
      { title: 'Sekali Beli Akses Seumur Hidup', subtitle: 'Akses tanpa batas waktu dan bebas biaya langganan bulanan.' },
      { title: 'Semua Fitur Kasir & Backoffice Pro Terbuka', subtitle: 'Transaksi kasir, manajemen stok, hutang/piutang, shift kasir, dan laporan laba rugi.' },
      { title: 'Export Laporan Lengkap (Excel & PDF)', subtitle: 'Unduh laporan penjualan, stok, kas, dan keuangan kapan saja.' },
      { title: 'Multi-Perangkat & Multi-User Kasir', subtitle: 'Bisa dipasang di beberapa perangkat toko dengan role kasir & admin.' },
      { title: 'Backup & Restore Database Aman', subtitle: 'Pencadangan database otomatis agar data toko Anda selalu terlindungi.' },
      { title: 'Garansi Update Versi Baru & Support Prioritas', subtitle: 'Dapatkan update fitur terbaru selamanya dan bantuan langsung dari developer.' },
    ]
  }

  if (isYearly) {
    return [
      { title: 'Masa Aktif 1 Tahun Penuh (Hemat 2+ Bulan)', subtitle: 'Paling hemat untuk operasional bisnis jangka panjang.' },
      { title: 'Semua Fitur Pro & Laporan Keuangan Lengkap', subtitle: 'Laporan laba rugi, arus kas, stok opname, dan histori transaksi.' },
      { title: 'Export Data Excel & PDF Tanpa Batas', subtitle: 'Cetak dan ekspor pembukuan untuk kebutuhan pembukuan toko.' },
      { title: 'Multi-User, Multi-Kasir & Manajemen Shift', subtitle: 'Kelola kasir shift pagi/malam dengan rekap kas akurat.' },
      { title: 'Gratis Pembaruan & Dukungan Teknis Prioritas', subtitle: 'Konsultasi dan bantuan teknis kapan saja via WhatsApp.' },
    ]
  }

  if (isMonthly) {
    return [
      { title: 'Masa Aktif 30 Hari Penuh', subtitle: 'Cocok untuk kebutuhan fleksibel operasional bisnis per bulan.' },
      { title: 'Transaksi Kasir & Cetak Struk Tanpa Batas', subtitle: 'Cetak struk kasir Bluetooth / USB dan kirim nota via WhatsApp.' },
      { title: 'Laporan Penjualan & Analitik Toko Lengkap', subtitle: 'Pantau omset, produk terlaris, dan keuntungan harian/bulanan.' },
      { title: 'Manajemen Stok & Stok Opname Realtime', subtitle: 'Peringatan stok menipis dan penyesuaian stok barang akurat.' },
      { title: 'Export Laporan Excel & PDF', subtitle: 'Laporan bisa diunduh langsung untuk rekapitulasi.' },
    ]
  }

  // Daily / Short term plan
  return [
    { title: `Masa Aktif ${plan.duration_days} Hari`, subtitle: 'Akses penuh untuk kebutuhan uji coba atau penggunaan berkala.' },
    { title: 'Transaksi Kasir POS Tanpa Batas', subtitle: 'Input transaksi kasir cepat dan cetak struk nota penjualan.' },
    { title: 'Manajemen Produk & Harga Jual', subtitle: 'Kelola kategori, barcode, harga modal HPP, dan harga jual.' },
    { title: 'Laporan Transaksi & Rekap Kasir', subtitle: 'Lihat ringkasan pemasukan kasir secara rapi.' },
  ]
}

function getPlanIconAndColor(plan: PublicPlan, index: number) {
  const text = `${plan.name} ${plan.code}`.toLowerCase()
  if (plan.duration_days === 0 || text.includes('lifetime') || text.includes('seumur')) {
    return { Icon: Star, color: 'text-amber-400', badgeBg: 'bg-amber-500/20 text-amber-300 ring-amber-500/30', gradient: 'from-amber-500 to-yellow-500' }
  }
  if (text.includes('tahun') || text.includes('year') || plan.duration_days >= 360) {
    return { Icon: Crown, color: 'text-emerald-400', badgeBg: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30', gradient: 'from-emerald-500 to-teal-500' }
  }
  if (text.includes('bulan') || text.includes('month') || (plan.duration_days >= 28 && plan.duration_days <= 31)) {
    return { Icon: Zap, color: 'text-violet-400', badgeBg: 'bg-violet-500/20 text-violet-300 ring-violet-500/30', gradient: 'from-violet-500 to-fuchsia-500' }
  }
  const icons = [
    { Icon: Zap, color: 'text-violet-400', badgeBg: 'bg-violet-500/20 text-violet-300 ring-violet-500/30', gradient: 'from-violet-500 to-fuchsia-500' },
    { Icon: Rocket, color: 'text-blue-400', badgeBg: 'bg-blue-500/20 text-blue-300 ring-blue-500/30', gradient: 'from-blue-500 to-cyan-500' },
    { Icon: Star, color: 'text-amber-400', badgeBg: 'bg-amber-500/20 text-amber-300 ring-amber-500/30', gradient: 'from-amber-500 to-yellow-500' },
  ]
  return icons[index % icons.length]
}

export default function RemoteLicensePopup() {
  const { user, logout } = useAuth()
  const { state: demoState, remainingUsage } = useDemo()

  const [state, setState] = useState<PopupState | null>(null)
  const [plans, setPlans] = useState<PublicPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('')
  const [creatingPlan, setCreatingPlan] = useState<string | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'midtrans' | 'whatsapp'>('midtrans')
  const [activeMidtransOrder, setActiveMidtransOrder] = useState<{ orderId: string; redirectUrl: string; planCode: string } | null>(null)

  // Listen to remote popup events
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

  // Close popup automatically if license gets updated to active paid in realtime
  useEffect(() => {
    const onLicenseUpdated = () => {
      if (state && !state.force) {
        setState(null)
      }
    }
    window.addEventListener('license:updated', onLicenseUpdated)
    return () => window.removeEventListener('license:updated', onLicenseUpdated)
  }, [state])

  // Polling active Midtrans order
  useEffect(() => {
    if (!activeMidtransOrder?.orderId) return
    const buyerEmail = user?.email || user?.nama_pengguna || ''

    const interval = setInterval(async () => {
      try {
        const r = await api<any>('license:checkMidtransPayment', activeMidtransOrder.orderId, buyerEmail, activeMidtransOrder.planCode)
        if (r.success && r.data?.status === 'ACTIVE') {
          setPaymentMessage('🎉 Pembayaran Midtrans Berhasil! Lisensi Anda telah aktif seketika.')
          window.dispatchEvent(new Event('license:sync-now'))
          setTimeout(() => {
            setState(null)
            setActiveMidtransOrder(null)
          }, 2000)
        }
      } catch {}
    }, 3000)

    return () => clearInterval(interval)
  }, [activeMidtransOrder, user])

  // Load public plans from backend / server
  useEffect(() => {
    if (!state) return
    let cancelled = false
    setPlansLoading(true)
    api<PublicPlan[]>('license:getPublicPlans').then(result => {
      if (cancelled) return
      if (result.success && Array.isArray(result.data)) {
        const sorted = [...result.data]
          .filter(p => p.is_active !== false && (p as any).is_active !== 0)
          .sort((a, b) => (Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)) || (Number(a.price || 0) - Number(b.price || 0)))

        setPlans(sorted)
        setSelectedPlanCode(current => current || sorted.find(p => p.is_recommended || p.duration_days === 0)?.code || sorted[0]?.code || '')
      }
    }).finally(() => {
      if (!cancelled) setPlansLoading(false)
    })
    return () => { cancelled = true }
  }, [state?.popup.code, state?.popup.title])

  if (!state) return null

  const { popup, force } = state
  const isDanger = popup.severity === 'danger' || popup.code === 'BLOCKED'
  const isBlocking = force || popup.dismissible === false
  const HeaderIcon = isDanger ? Lock : popup.severity === 'warning' ? AlertTriangle : Crown

  const usageLimit = Math.max(1, demoState.usage_limit || 10)
  const usageCount = Math.min(usageLimit, Math.max(0, demoState.usage_count || 0))
  const usagePercent = Math.round((usageCount / usageLimit) * 100)

  const close = () => {
    if (!isBlocking) setState(null)
  }

  const openUrl = (url: string) => {
    void api('app:openExternal', url)
    if (!isBlocking) setState(null)
  }

  const showPlans = !isDanger || ['EXPIRED', 'FEATURE_LOCKED', 'DEMO_LIMIT', 'ACCESS_EXPIRING', 'TRANSACTION_LIMIT', 'DEVICE_LIMIT', 'PRODUCT_LIMIT'].includes(String(popup.code ?? '').toUpperCase())

  const selectedPlan = plans.find(p => p.code === selectedPlanCode) || plans[0] || null
  const selectedBenefits = selectedPlan ? getDetailedPlanBenefits(selectedPlan) : []

  const handleCheckout = async (plan: PublicPlan) => {
    const buyerEmail = user?.email || user?.nama_pengguna || ''

    if (paymentMethod === 'midtrans') {
      setCreatingPlan(plan.code)
      setPaymentMessage(null)
      try {
        const r = await api<any>('license:createMidtransPayment', {
          email: buyerEmail,
          plan_code: plan.code,
          buyer_name: user?.nama_lengkap || user?.nama_pengguna || 'Pembeli Lisensi',
        })
        if (r.success && r.data) {
          setActiveMidtransOrder({
            orderId: r.data.orderId,
            redirectUrl: r.data.redirectUrl,
            planCode: plan.code,
          })
          setPaymentMessage('Sesi pembayaran Midtrans aktif. Silakan selesaikan pembayaran...')
          if (r.data.redirectUrl) {
            void api('app:openExternal', r.data.redirectUrl)
          }
        } else {
          setPaymentMessage(r.message || 'Gagal membuat sesi pembayaran Midtrans')
        }
      } catch (e: any) {
        setPaymentMessage(e?.message || 'Koneksi ke gateway pembayaran gagal')
      } finally {
        setCreatingPlan(null)
      }
      return
    }

    const durationText = plan.duration_days === 0
      ? 'Seumur Hidup (Akses Permanen Sekali Bayar)'
      : `${plan.duration_days} Hari Penuh`

    const message = [
      'Halo Admin Zetass POS, saya ingin membeli paket lisensi:',
      '',
      `📦 Paket: ${plan.name} (${plan.code || plan.id})`,
      `💰 Harga: ${formatPlanPrice(plan)} / ${getPlanPeriodLabel(plan)}`,
      `⏱️ Durasi: ${durationText}`,
      `👤 Akun: ${user?.nama_lengkap ?? user?.nama_pengguna ?? '-'}`,
      `📧 Email: ${user?.email ?? '-'}`,
      '',
      'Mohon nomor rekening pembayaran dan aktivasi lisensi resminya. Terima kasih!',
    ].join('\n')

    const directWaUrl = buildWhatsAppUrl(popup.whatsapp_number, message)

    setCreatingPlan(plan.code)
    setPaymentMessage(null)
    try {
      const result = await api<Invoice>('license:createManualPaymentRequest', {
        email: user?.email ?? undefined,
        customer_id: user?.remote_customer_id ?? undefined,
        plan_code: plan.code,
      })
      if (result.success && result.data) {
        setInvoice(result.data)
        setPaymentMessage('Permintaan lisensi dibuat! Membuka WhatsApp developer...')
        const targetUrl = result.data.payment_url || buildWhatsAppUrl(result.data.whatsapp_number || popup.whatsapp_number, result.data.whatsapp_message || message)
        void api('app:openExternal', targetUrl)
      } else {
        void api('app:openExternal', directWaUrl)
      }
    } catch {
      void api('app:openExternal', directWaUrl)
    } finally {
      setCreatingPlan(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[12000] flex items-center justify-center overflow-y-auto bg-slate-950/85 p-3 sm:p-4 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={close}
    >
      <div
        className="relative my-auto max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-[#090e1c] p-6 text-white shadow-2xl shadow-violet-950/70 ring-1 ring-white/10 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Soft Radial Ambient Glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-fuchsia-600/10 blur-3xl" />

        {/* Close Button */}
        {!isBlocking && (
          <button
            onClick={close}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition hover:bg-white/15 hover:text-white"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="relative space-y-6">
          {/* ─── Header: Modern & Sederhana ──────────────────────────── */}
          <div className="text-center space-y-2.5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-xl shadow-violet-500/25 ring-4 ring-violet-500/20">
              <HeaderIcon className="h-7 w-7" />
            </div>

            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              {popup.title || 'Upgrade Paket Lisensi POS'}
            </h2>

            {popup.description && (
              <p className="mx-auto max-w-xl text-xs text-slate-300 sm:text-sm leading-relaxed">
                {popup.description}
              </p>
            )}

            {popup.code && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-400 ring-1 ring-violet-500/20">
                <Sparkles className="h-3 w-3" />
                {popup.code}
              </div>
            )}
          </div>

          {/* Banner Image from Developer Panel */}
          {popup.image_url && (
            <div className="flex justify-center">
              <img
                src={popup.image_url}
                alt=""
                className="max-h-44 w-full max-w-xl rounded-2xl border border-white/10 object-cover shadow-lg"
              />
            </div>
          )}

          {/* Custom Pricing HTML from Developer Panel */}
          {popup.pricing_html && (
            <div
              className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-4 text-xs leading-relaxed text-slate-200 shadow-inner"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(popup.pricing_html) }}
            />
          )}

          {/* Demo Usage Progress Bar */}
          {demoState.is_demo && (
            <div className="mx-auto max-w-md rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300">Penggunaan Transaksi Demo</span>
                <span className="text-amber-400">{usageCount} / {usageLimit} Transaksi</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                Sisa <strong>{remainingUsage} transaksi</strong>. Pilih paket di bawah untuk mengaktifkan akses penuh tanpa batas.
              </p>
            </div>
          )}

          {/* ─── Pilihan Paket (Plan Selector Cards) ──────────────────── */}
          {showPlans && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pilih Paket Sesuai Kebutuhan Toko
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> Aktivasi Realtime Tanpa Relog
                </span>
              </div>

              {plansLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                  Memuat daftar paket dari developer panel...
                </div>
              ) : plans.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-xs text-slate-400">
                  Belum ada paket aktif. Hubungi admin WhatsApp untuk aktivasi.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {plans.map((plan, index) => {
                    const active = selectedPlanCode === plan.code
                    const isRecommended = Boolean(plan.is_recommended)
                    const visual = getPlanIconAndColor(plan, index)
                    const PlanIcon = visual.Icon
                    const daily = getDailyPriceText(plan)

                    return (
                      <div
                        key={plan.code || plan.id}
                        onClick={() => setSelectedPlanCode(plan.code)}
                        className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4.5 transition-all duration-200 ${
                          active
                            ? 'border-violet-400 bg-violet-950/40 shadow-xl shadow-violet-900/40 ring-2 ring-violet-500/50'
                            : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                        }`}
                      >
                        {isRecommended && (
                          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-500 px-3 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-md">
                            ★ REKOMENDASI
                          </div>
                        )}

                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${visual.gradient} text-white shadow-md`}>
                                <PlanIcon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{plan.code}</p>
                                <h4 className="text-sm font-extrabold text-white leading-snug">{plan.name}</h4>
                              </div>
                            </div>

                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${visual.badgeBg}`}>
                              {getPlanPeriodLabel(plan)}
                            </span>
                          </div>

                          <div className="mt-3.5">
                            <div className="text-xl font-black text-white">
                              {formatPlanPrice(plan)}
                            </div>
                            {daily && (
                              <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                                {daily}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold">
                          <span className={active ? 'text-violet-300' : 'text-slate-400'}>
                            {active ? '● Paket Terpilih' : 'Klik untuk memilih'}
                          </span>
                          <ChevronRight className={`h-4 w-4 transition ${active ? 'text-violet-400 translate-x-0.5' : 'text-slate-500'}`} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ─── Detail Penjelasan: Apa Saja Yang Didapatkan ──────── */}
              {selectedPlan && (
                <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/30 via-slate-900/60 to-slate-950/60 p-5 ring-1 ring-violet-500/20">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-violet-400" />
                      <h3 className="text-sm font-black text-white">
                        Apa Saja Yang Didapatkan Pada Paket <span className="text-violet-300">{selectedPlan.name}</span>:
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">
                      {formatPlanPrice(selectedPlan)} / {getPlanPeriodLabel(selectedPlan)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {selectedBenefits.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 rounded-xl bg-white/[0.02] p-2.5 ring-1 ring-white/5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        <div>
                          <p className="text-xs font-bold text-white leading-snug">{item.title}</p>
                          <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{item.subtitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Limits summary if configured */}
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/5 pt-3 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Laptop className="h-3.5 w-3.5 text-violet-400" />
                      <span>Device: <strong className="text-white">{selectedPlan.max_devices && selectedPlan.max_devices > 0 ? `${selectedPlan.max_devices} Perangkat` : 'Unlimited'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Transaksi: <strong className="text-white">{selectedPlan.max_transactions_per_day && selectedPlan.max_transactions_per_day > 0 ? `${selectedPlan.max_transactions_per_day}/hari` : 'Tanpa Batas'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-blue-400" />
                      <span>Produk: <strong className="text-white">{selectedPlan.max_products && selectedPlan.max_products > 0 ? `${selectedPlan.max_products} Item` : 'Tanpa Batas'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-amber-400" />
                      <span>User Kasir: <strong className="text-white">{selectedPlan.max_users && selectedPlan.max_users > 0 ? `${selectedPlan.max_users} Pengguna` : 'Multi-User'}</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Feedback / Invoice Alert ─────────────────────────────── */}
          {(paymentMessage || invoice) && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-100 shadow-lg">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold">{paymentMessage}</p>
                  {invoice?.invoice_number && (
                    <p className="font-mono text-[11px] text-emerald-300">Invoice: {invoice.invoice_number}</p>
                  )}
                  {invoice?.payment_url && (
                    <button
                      type="button"
                      onClick={() => openUrl(invoice.payment_url!)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Buka Chat WhatsApp Developer
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── Action Buttons & Payment Mode Selector ────────────────── */}
          <div className="border-t border-white/10 pt-4 space-y-3">
            {/* Payment Method Switcher */}
            {selectedPlan && (
              <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('midtrans')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
                    paymentMethod === 'midtrans'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Zap size={14} className="text-amber-400 fill-amber-400" />
                  <span>Bayar Otomatis (Midtrans)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('whatsapp')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
                    paymentMethod === 'whatsapp'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <MessageCircle size={14} className="text-white" />
                  <span>Manual (WhatsApp)</span>
                </button>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                {!isBlocking && (
                  <button
                    type="button"
                    onClick={close}
                    className="w-full sm:w-auto rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    Nanti Saja
                  </button>
                )}
                {force && (
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full sm:w-auto rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
                  >
                    Keluar Akun
                  </button>
                )}
              </div>

              {selectedPlan && (
                <button
                  type="button"
                  onClick={() => handleCheckout(selectedPlan)}
                  disabled={creatingPlan === selectedPlan.code}
                  className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-extrabold text-white shadow-xl transition disabled:opacity-50 ${
                    paymentMethod === 'midtrans'
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-violet-950/40'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-950/40'
                  }`}
                >
                  {creatingPlan === selectedPlan.code ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : paymentMethod === 'midtrans' ? (
                    <Zap className="h-4 w-4 fill-white" />
                  ) : (
                    <MessageCircle className="h-4 w-4" />
                  )}
                  {paymentMethod === 'midtrans'
                    ? `Bayar Otomatis ${selectedPlan.name} (Midtrans)`
                    : `Beli Paket ${selectedPlan.name} via WhatsApp`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
