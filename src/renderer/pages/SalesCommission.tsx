import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Search, DollarSign, Users, Target, Award } from 'lucide-react'
import Card from '../components/Card'
import Input from '../components/Input'
import Badge from '../components/Badge'
import { StatCardSkeleton, CommissionListSkeleton } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'

interface CommissionData {
  username: string
  nama_lengkap: string
  total_transaksi: number
  total_penjualan: number
  komisi_persen: number
  total_komisi: number
  target_bulanan: number
  pencapaian: number
}

export default function SalesCommission() {
  const [data, setData] = useState<CommissionData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api<CommissionData[]>('salesCommission:getAll', search)
    if (r.success) setData(r.data ?? [])
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  const totalKomisi = data.reduce((s, d) => s + d.total_komisi, 0)
  const totalPenjualan = data.reduce((s, d) => s + d.total_penjualan, 0)
  const avgPencapaian = data.length > 0 ? data.reduce((s, d) => s + d.pencapaian, 0) / data.length : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white">
          <TrendingUp size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Komisi Sales</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Tracking komisi karyawan berdasarkan target dan penjualan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Penjualan</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white">{formatRupiah(totalPenjualan)}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center text-white shrink-0">
            <Award size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Komisi</p>
            <p className="text-lg font-bold text-primary-600">{formatRupiah(totalKomisi)}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shrink-0">
            <Target size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Rata-rata Pencapaian</p>
            <p className="text-lg font-bold text-amber-600">{avgPencapaian.toFixed(0)}%</p>
          </div>
        </Card>
      </div>

      <Card>
        <Input placeholder="Cari karyawan..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={14} />} />
      </Card>

      {loading ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
          <CommissionListSkeleton count={4} />
        </>
      ) : data.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-slate-400">
            <Users size={36} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">Belum ada data komisi bulan ini</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.sort((a, b) => b.total_penjualan - a.total_penjualan).map((d, idx) => (
            <Card key={d.username}>
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                  idx === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500' :
                  idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400' :
                  idx === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-600' :
                  'bg-slate-400 dark:bg-slate-600'
                }`}>{idx + 1}</div>
                <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500 font-bold shrink-0">
                  {d.nama_lengkap.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 dark:text-white text-sm">{d.nama_lengkap}</p>
                  <p className="text-xs text-slate-400">@{d.username}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-right">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Transaksi</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{d.total_transaksi}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Penjualan</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatRupiah(d.total_penjualan)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Komisi</p>
                    <p className="text-sm font-bold text-emerald-600">{formatRupiah(d.total_komisi)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Target</p>
                    <Badge label={`${d.pencapaian.toFixed(0)}%`} variant={d.pencapaian >= 100 ? 'green' : d.pencapaian >= 70 ? 'yellow' : 'red'} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
