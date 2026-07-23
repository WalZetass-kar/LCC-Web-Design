import { useEffect, useState } from 'react'
import { Monitor, ShoppingCart, X } from 'lucide-react'
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
}

export default function CustomerDisplay() {
  const [data, setData] = useState<CustomerDisplayData>({
    items: [],
    subtotal: 0,
    total: 0,
    storeName: 'Zetass Pos',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'customer-display-update') {
        setData(e.data.payload)
      }
    }
    window.addEventListener('message', handler)

    const stored = localStorage.getItem('customer_display_data')
    if (stored) {
      try { setData(JSON.parse(stored)) } catch {}
    }
    setLoading(false)

    return () => window.removeEventListener('message', handler)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const stored = localStorage.getItem('customer_display_data')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (parsed !== data) setData(parsed)
        } catch {}
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [data])

  const lastItem = data.items[data.items.length - 1]

  if (loading) return <SkeletonPage rows={6} />

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Monitor size={24} className="text-primary-400" />
          <span className="text-xl font-bold">{data.storeName}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </header>

      {/* Last scanned item - prominent display */}
      {lastItem && (
        <div className="px-6 py-8 bg-gradient-to-r from-primary-600/20 to-primary-500/10 border-b border-white/5">
          <p className="text-sm text-primary-300 uppercase tracking-wider font-bold mb-1">Item Terakhir</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold">{lastItem.nama_barang}</p>
              <p className="text-slate-400 mt-1">
                {lastItem.qty} x {formatRupiah(lastItem.harga_jual)}
                {lastItem.disc > 0 && <span className="text-emerald-400 ml-2">-{lastItem.disc}%</span>}
              </p>
            </div>
            <p className="text-3xl font-bold text-primary-400">
              {formatRupiah((lastItem.harga_jual - (lastItem.harga_jual * lastItem.disc) / 100) * lastItem.qty)}
            </p>
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <ShoppingCart size={64} className="mb-4 opacity-30" />
            <p className="text-xl font-medium">Belum ada item</p>
            <p className="text-sm mt-1">Scan produk untuk memulai transaksi</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.items.map((item, i) => {
              const disc = (item.harga_jual * item.disc) / 100
              const itemTotal = (item.harga_jual - disc) * item.qty
              return (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium truncate">{item.nama_barang}</p>
                    <p className="text-sm text-slate-400">
                      {item.qty} x {formatRupiah(item.harga_jual)}
                      {item.disc > 0 && <span className="text-emerald-400 ml-1">(-{item.disc}%)</span>}
                    </p>
                  </div>
                  <p className="text-base font-bold text-slate-200 ml-4">{formatRupiah(itemTotal)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer - Total */}
      <footer className="px-6 py-6 bg-slate-900/80 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400 uppercase tracking-wider">{data.items.length} item</p>
            <p className="text-lg text-slate-300">Subtotal: {formatRupiah(data.subtotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400 uppercase tracking-wider">Total Belanja</p>
            <p className="text-4xl font-bold text-primary-400">{formatRupiah(data.total)}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
