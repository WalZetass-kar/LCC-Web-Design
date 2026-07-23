import { useState, useEffect, useCallback } from 'react'
import { Star, Search, TrendingUp, Package, Truck } from 'lucide-react'
import Card from '../components/Card'
import Input from '../components/Input'
import Badge from '../components/Badge'
import { SupplierListSkeleton } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'

interface SupplierData {
  kd_supplier: string
  nama_supplier: string
  no_telp: string | null
  rating: number
  total_pembelian: number
  total_transaksi: number
  rata_rata_hari_kirim: number
  last_order: string | null
}

export default function SupplierRating() {
  const [suppliers, setSuppliers] = useState<SupplierData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api<SupplierData[]>('supplierRating:getAll', search)
    if (r.success) setSuppliers(r.data ?? [])
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={14} className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-600'} />
      ))}
    </div>
  )

  const getRatingBadge = (r: number) => {
    if (r >= 4) return { label: 'Excellent', variant: 'green' as const }
    if (r >= 3) return { label: 'Good', variant: 'blue' as const }
    if (r >= 2) return { label: 'Average', variant: 'yellow' as const }
    return { label: 'Poor', variant: 'red' as const }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white">
          <Star size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Supplier Rating</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Rating & evaluasi performa supplier berdasarkan riwayat pembelian</p>
        </div>
      </div>

      <Card>
        <Input placeholder="Cari supplier..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={14} />} />
      </Card>

      {loading ? (
        <SupplierListSkeleton count={4} />
      ) : suppliers.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-slate-400">
            <Star size={36} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">Belum ada data supplier</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {suppliers.sort((a, b) => b.rating - a.rating).map(s => {
            const badge = getRatingBadge(s.rating)
            return (
              <Card key={s.kd_supplier}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0">
                      <Truck size={20} className="text-primary-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{s.nama_supplier}</p>
                      <p className="text-xs text-slate-400">{s.no_telp ?? '-'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(s.rating)}
                        <Badge label={badge.label} variant={badge.variant} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 sm:text-right">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Pembelian</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatRupiah(s.total_pembelian)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Transaksi</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{s.total_transaksi}x</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Avg Kirim</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{s.rata_rata_hari_kirim} hari</p>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
