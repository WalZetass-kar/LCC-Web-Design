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
      className="fixed inset-0 z-[12000] flex items-center justify-center overflow-y-auto bg-slate-950/80 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={close}
    >
      <div
        className="relative my-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900 text-white shadow-2xl ring-1 ring-white/10 p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        {!isBlocking && (
          <button
            onClick={close}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="space-y-5">
          {/* ─── 1. Header Sederhana & Ramah ─────────────────────────── */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 shadow-lg mb-1">
              <Crown className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-2xl">
              {popup.title || 'Pilih Paket Lisensi POS'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-normal">
              {popup.description || 'Aktifkan akses penuh kasir, kelola stok akurat, dan ekspor laporan keuangan toko tanpa batas.'}
            </p>
          </div>

          {/* ─── 2. Demo Warning (Jika Akun Demo) ────────────────────── */}
          {demoState.is_demo && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>Batas Penggunaan Demo: <strong>{remainingUsage} transaksi tersisa</strong></span>
              </div>
              <span className="text-[11px] text-amber-200/80">Upgrade untuk akses tak terbatas</span>
            </div>
          )}

          {/* ─── 3. Kartu Pilihan Paket (Simpel & Menjelaskan) ────────── */}
          {showPlans && (
            <div className="space-y-3">
              {plansLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                  Memuat paket...
                </div>
              ) : plans.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-xs text-slate-400">
                  Belum ada paket aktif. Hubungi WhatsApp admin untuk info lisensi.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  {plans.map((plan, index) => {
                    const active = selectedPlanCode === plan.code
                    const isRecommended = Boolean(plan.is_recommended)
                    const isLifetime = plan.duration_days === 0
                    const benefits = [
                      'Transaksi Kasir Tanpa Batas',
                      'Laporan Penjualan & Laba Rugi',
                      'Cetak Struk & Kirim WhatsApp',
                      isLifetime ? 'Sekali Bayar Seumur Hidup' : 'Update Fitur Terbaru',
                    ]

                    return (
                      <div
                        key={plan.code || plan.id}
                        onClick={() => setSelectedPlanCode(plan.code)}
                        className={`relative flex flex-col justify-between rounded-2xl p-4.5 cursor-pointer transition-all duration-200 border ${
                          active
                            ? 'border-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/60'
                            : 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {isRecommended && (
                          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-950 shadow">
                            ★ Rekomendasi
                          </div>
                        )}

                        <div>
                          {/* Nama & Durasi */}
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-sm font-extrabold text-white">{plan.name}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                              {getPlanPeriodLabel(plan)}
                            </span>
                          </div>

                          {/* Harga */}
                          <div className="mt-3">
                            <span className="text-xl font-black text-white">
                              {formatPlanPrice(plan)}
                            </span>
                            {plan.duration_days > 1 && (
                              <span className="text-[11px] text-slate-400 font-medium block">
                                / {getPlanPeriodLabel(plan)}
                              </span>
                            )}
                          </div>

                          {/* Fitur Utama Singkat */}
                          <ul className="mt-3.5 space-y-1.5 border-t border-white/10 pt-3">
                            {benefits.map((b, bIdx) => (
                              <li key={bIdx} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Indikator Pilih */}
                        <div className="mt-4 pt-2.5 border-t border-white/5 text-center">
                          <span className={`text-[11px] font-bold ${active ? 'text-amber-400' : 'text-slate-500'}`}>
                            {active ? '✓ Dipilih' : 'Klik untuk Pilih'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── 4. Metode Pembayaran & Tombol Beli ────────────────────── */}
          {selectedPlan && (
            <div className="space-y-3 pt-1 border-t border-slate-800">
              {/* Switcher Metode */}
              <div className="flex items-center justify-center gap-2 p-1 rounded-2xl bg-slate-950/60 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('midtrans')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    paymentMethod === 'midtrans'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap size={14} className="fill-current" />
                  <span>Bayar Otomatis (QRIS / VA / E-Wallet)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('whatsapp')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    paymentMethod === 'whatsapp'
                      ? 'bg-emerald-600 text-white shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageCircle size={14} />
                  <span>Manual via WhatsApp</span>
                </button>
              </div>

              {/* Status Message */}
              {paymentMessage && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>{paymentMessage}</span>
                </div>
              )}

              {/* Tombol Aksi Bawah */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={close}
                  className="w-full sm:w-auto text-xs text-slate-400 hover:text-white px-3 py-2 transition"
                >
                  Nanti Saja
                </button>

                <button
                  type="button"
                  onClick={() => handleCheckout(selectedPlan)}
                  disabled={creatingPlan === selectedPlan.code}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-2xl text-sm font-black transition shadow-lg ${
                    paymentMethod === 'midtrans'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 shadow-amber-500/20'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/20'
                  }`}
                >
                  {creatingPlan === selectedPlan.code ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : paymentMethod === 'midtrans' ? (
                    <Zap className="h-4 w-4 fill-current" />
                  ) : (
                    <MessageCircle className="h-4 w-4" />
                  )}
                  {paymentMethod === 'midtrans'
                    ? `Beli ${selectedPlan.name} • ${formatPlanPrice(selectedPlan)}`
                    : `Beli via WhatsApp (${selectedPlan.name})`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
