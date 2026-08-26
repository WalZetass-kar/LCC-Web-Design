import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Monitor, ShoppingCart, CheckCircle2, QrCode, Sparkles, Store, CreditCard, Tag } from 'lucide-react'
import { formatRupiah } from '../utils/format'
import { SkeletonPage } from '../components/Skeleton'

interface DisplayItem {
  nama_barang: string
  qty: number
  harga_jual: number
  disc: number
}

interface CustomerDisplayData {
  items: DisplayItem[]
  subtotal: number
  total: number
  storeName: string
  qrisImage?: string | null
  qrisString?: string | null
  paymentMethod?: string | null
  status?: 'idle' | 'scanning' | 'paying_qris' | 'success'
  paidAmount?: number
  kembalian?: number
}

export default function CustomerDisplay() {
  const [data, setData] = useState<CustomerDisplayData>({
    items: [],
    subtotal: 0,
    total: 0,
    storeName: 'Zetass Pos',
    status: 'idle',
  })
  const [loading, setLoading] = useState(true)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const clockTimer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(clockTimer)
  }, [])

  useEffect(() => {
    // 1. BroadcastChannel for fast tab/window sync
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('customer_display_channel')
      bc.onmessage = (event) => {
        if (event.data) setData(prev => ({ ...prev, ...event.data }))
      }
    } catch {}

    // 2. Window Message listener
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'customer-display-update') {
        setData(prev => ({ ...prev, ...e.data.payload }))
      }
    }
    window.addEventListener('message', handler)

    // 3. LocalStorage storage event listener
    const storageHandler = (e: StorageEvent) => {
      if (e.key === 'customer_display_data' && e.newValue) {
        try {
          setData(JSON.parse(e.newValue))
        } catch {}
      }
    }
    window.addEventListener('storage', storageHandler)

    // Initial load
    const stored = localStorage.getItem('customer_display_data')
    if (stored) {
      try { setData(JSON.parse(stored)) } catch {}
    }
    setLoading(false)

    // Fallback polling interval
    const interval = setInterval(() => {
      const currentStored = localStorage.getItem('customer_display_data')
      if (currentStored) {
        try {
          const parsed = JSON.parse(currentStored)
          setData(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(parsed)) return parsed
            return prev
          })
        } catch {}
      }
    }, 800)

    return () => {
      if (bc) bc.close()
      window.removeEventListener('message', handler)
      window.removeEventListener('storage', storageHandler)
      clearInterval(interval)
    }
  }, [])

  const lastItem = data.items[data.items.length - 1]

  if (loading) return <SkeletonPage rows={6} />

  // Celebration screen on successful payment
  if (data.status === 'success') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 relative overflow-hidden select-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-xl relative z-10"
        >
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-5 ring-8 ring-emerald-500/10">
            <CheckCircle2 size={44} className="animate-bounce" />
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight mb-1">Pembayaran Berhasil!</h2>
          <p className="text-sm text-slate-400 font-medium mb-6">Terima kasih telah berbelanja di {data.storeName}</p>

          <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 space-y-2.5 text-left mb-6">
            <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
              <span>Total Belanja</span>
              <span className="text-sm font-bold text-white">{formatRupiah(data.total)}</span>
            </div>
            {data.paidAmount !== undefined && data.paidAmount > 0 && (
              <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
                <span>Jumlah Bayar</span>
                <span className="text-xs font-bold text-slate-200">{formatRupiah(data.paidAmount)}</span>
              </div>
            )}
            {data.kembalian !== undefined && (
              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800 font-bold">
                <span className="text-emerald-400">Kembalian</span>
                <span className="text-base text-emerald-400 font-black">{formatRupiah(data.kembalian)}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 font-semibold flex items-center justify-center gap-1.5">
            <Sparkles size={14} className="text-amber-400" />
            <span>Sampai jumpa kembali!</span>
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col select-none">
      {/* Header */}
      <header className="h-16 px-6 sm:px-8 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/30">
            <Store size={22} />
          </div>
          <div>
            <h1 className="font-extrabold text-base sm:text-lg text-white leading-tight tracking-tight">{data.storeName}</h1>
            <p className="text-[11px] text-slate-400 font-medium">Customer Display</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-200">
            {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-[11px] text-slate-400 font-medium">
            {time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left Column: Scanned Item List */}
        <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-slate-950">
          {/* Header Row */}
          <div className="px-6 py-3 bg-slate-900/40 border-b border-slate-800/60 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Daftar Produk ({data.items.length})</span>
            <span>Total</span>
          </div>

          {/* Item Scrollable List */}
          <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2.5 scrollbar-thin">
            {data.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 py-16">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mb-3">
                  <ShoppingCart size={32} className="opacity-40 text-slate-400" />
                </div>
                <p className="text-base font-bold text-slate-400">Selamat Datang!</p>
                <p className="text-xs text-slate-500 mt-1 font-medium">Barang belanjaan Anda akan tampil di sini</p>
              </div>
            ) : (
              data.items.map((item, idx) => {
                const discAmount = (item.harga_jual * (item.disc || 0)) / 100
                const itemTotal = (item.harga_jual - discAmount) * item.qty
                const isLast = idx === data.items.length - 1

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      isLast
                        ? 'bg-red-950/20 border-red-900/50 shadow-sm'
                        : 'bg-slate-900/40 border-slate-800/60'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-100 truncate">{item.nama_barang}</span>
                        {item.disc > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-[10px] font-bold">
                            -{item.disc}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">
                        {item.qty} × {formatRupiah(item.harga_jual)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-white">{formatRupiah(itemTotal)}</p>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: QRIS Display & Total Summary */}
        <div className="w-full lg:w-[420px] xl:w-[460px] bg-slate-900/50 flex flex-col justify-between shrink-0 p-6 sm:p-8">
          {/* QRIS / Active Payment Mode */}
          {data.status === 'paying_qris' || data.qrisImage ? (
            <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-3xl border border-slate-800 shadow-xl mb-6 text-center">
              <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <QrCode size={15} />
                <span>Pindai QRIS untuk Bayar</span>
              </p>
              {data.qrisImage ? (
                <div className="p-3 bg-white rounded-2xl shadow-lg mb-3">
                  <img src={data.qrisImage} alt="QRIS" className="w-48 h-48 object-contain" />
                </div>
              ) : (
                <div className="w-48 h-48 rounded-2xl bg-slate-900 flex flex-col items-center justify-center text-slate-400 mb-3 border border-slate-800">
                  <QrCode size={40} className="animate-pulse mb-2 text-red-500" />
                  <span className="text-xs font-bold">Membuat QRIS...</span>
                </div>
              )}
              <p className="text-[11px] text-slate-400 font-medium">
                Mendukung BCA, GoPay, OVO, Dana, ShopeePay & Semua Mobile Banking
              </p>
            </div>
          ) : lastItem ? (
            /* Highlight of last scanned item */
            <div className="p-5 bg-gradient-to-br from-red-950/40 via-slate-900 to-slate-950 rounded-3xl border border-red-900/30 mb-6">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1">Item Baru Ditambahkan</span>
              <p className="text-xl font-black text-white truncate">{lastItem.nama_barang}</p>
              <div className="flex items-end justify-between mt-2">
                <span className="text-xs text-slate-400 font-medium">{lastItem.qty} × {formatRupiah(lastItem.harga_jual)}</span>
                <span className="text-2xl font-black text-red-500">
                  {formatRupiah((lastItem.harga_jual - (lastItem.harga_jual * (lastItem.disc || 0)) / 100) * lastItem.qty)}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-slate-950/60 rounded-3xl border border-slate-800/80 mb-6 text-center text-slate-500 flex flex-col items-center justify-center">
              <CreditCard size={32} className="opacity-30 mb-2" />
              <p className="text-xs font-bold">Siap Melayani Transaksi</p>
            </div>
          )}

          {/* Grand Total Box */}
          <div className="bg-slate-950 rounded-3xl p-6 border border-slate-800 shadow-2xl">
            <div className="space-y-2 mb-4 text-xs font-semibold text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal ({data.items.length} item)</span>
                <span className="text-slate-200">{formatRupiah(data.subtotal)}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-end justify-between">
              <div>
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Total Tagihan</span>
                <span className="text-3xl sm:text-4xl font-black text-red-500 tracking-tight">
                  {formatRupiah(data.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

