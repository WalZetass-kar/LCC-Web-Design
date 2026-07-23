import { useEffect, useState } from 'react'
import { Plus, PieChart, BarChart3, Filter, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Select from '../components/Select'
import Textarea from '../components/Textarea'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import ConfirmDialog from '../components/ConfirmDialog'
import { SkeletonStatGrid } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

interface Budget {
  kd_budget: number
  nama_budget: string
  kategori: string
  bulan: number | null
  tahun: number
  jumlah_anggaran: number
  terealisasi: number
  selisih: number
  status: 'AKTIF' | 'TERCAPAI' | 'MELEBIHI'
  created_at: string
}

interface BudgetSummary {
  kategori: string
  total_anggaran: number
  total_terealisasi: number
  persentase: number
}

export default function Budget() {
  const toast = useToast()
  const { user } = useAuth()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [summary, setSummary] = useState<BudgetSummary[]>([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editBudget, setEditBudget] = useState<Budget | null>(null)
  const [form, setForm] = useState({ nama_budget: '', kategori: '', bulan: '', tahun: selectedYear.toString(), jumlah_anggaran: '' })
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [deleteBudget, setDeleteBudget] = useState<Budget | null>(null)
  const [search, setSearch] = useState('')

  const load = async () => {
    const [r1, r2] = await Promise.all([
      api<Budget[]>('budget:getAll', selectedYear),
      api<BudgetSummary[]>('budget:getSummary', selectedYear),
    ])
    if (r1.success) setBudgets(r1.data ?? [])
    if (r2.success) setSummary(r2.data ?? [])
    setLoadingData(false)
  }

  useEffect(() => { load() }, [selectedYear])

  const handleSave = async () => {
    if (!form.nama_budget || !form.kategori || !form.jumlah_anggaran) {
      return toast('Nama, kategori, dan jumlah anggaran wajib diisi', 'error')
    }
    setLoading(true)
    const payload = {
      ...form,
      bulan: form.bulan ? parseInt(form.bulan) : null,
      tahun: parseInt(form.tahun),
      jumlah_anggaran: parseFloat(form.jumlah_anggaran),
    }
    if (modal === 'add') {
      const r = await api('budget:create', payload)
      if (r.success) { toast(r.message as string); setModal(null); resetForm(); load() }
      else toast(r.message as string, 'error')
    } else if (modal === 'edit' && editBudget) {
      const r = await api('budget:update', editBudget.kd_budget, payload)
      if (r.success) { toast(r.message as string); setModal(null); setEditBudget(null); load() }
      else toast(r.message as string, 'error')
    }
    setLoading(false)
  }

  const resetForm = () => {
    setForm({ nama_budget: '', kategori: '', bulan: '', tahun: selectedYear.toString(), jumlah_anggaran: '' })
  }

  const openEdit = (b: Budget) => {
    setEditBudget(b)
    setForm({ nama_budget: b.nama_budget, kategori: b.kategori, bulan: b.bulan?.toString() || '', tahun: b.tahun.toString(), jumlah_anggaran: b.jumlah_anggaran.toString() })
    setModal('edit')
  }

  const handleDelete = async () => {
    if (!deleteBudget) return
    setLoading(true)
    const r = await api('budget:delete', deleteBudget.kd_budget)
    setLoading(false)
    if (r.success) { toast(r.message as string); setDeleteBudget(null); load() }
    else toast(r.message as string, 'error')
  }

  const getStatusVariant = (s: string): 'blue' | 'green' | 'red' => {
    if (s === 'AKTIF') return 'blue'
    if (s === 'TERCAPAI') return 'green'
    return 'red'
  }

  const getSelisihIcon = (selisih: number) => {
    if (selisih > 0) return <TrendingUp size={14} className="text-emerald-500" />
    if (selisih < 0) return <TrendingDown size={14} className="text-red-500" />
    return <Minus size={14} className="text-slate-400" />
  }

  const filteredBudgets = budgets.filter(b =>
    b.nama_budget.toLowerCase().includes(search.toLowerCase()) ||
    b.kategori.toLowerCase().includes(search.toLowerCase())
  )

  const totalAnggaran = budgets.reduce((s, b) => s + b.jumlah_anggaran, 0)
  const totalTerealisasi = budgets.reduce((s, b) => s + b.terealisasi, 0)

  const bulanOptions = [
    { value: '', label: '-- Seluruh Tahun --' },
    ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('id', { month: 'long' }) }))
  ]

  return (
    <div className="space-y-4">
      {loadingData ? (
        <SkeletonStatGrid count={4} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Cari budget..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="max-w-xs"
              />
              <Input
                label="Tahun"
                type="number"
                value={selectedYear.toString()}
                onChange={e => setSelectedYear(parseInt(e.target.value) || new Date().getFullYear())}
                className="w-20"
              />
            </div>
            <Button icon={<Plus size={16} />} onClick={() => { resetForm(); setModal('add') }}>Tambah Budget</Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card title="Total Anggaran" action={<BarChart3 size={16} className="text-primary-500" />}>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-2">{formatRupiah(totalAnggaran)}</p>
            </Card>
            <Card title="Total Terealisasi" action={<TrendingUp size={16} className="text-emerald-500" />}>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{formatRupiah(totalTerealisasi)}</p>
            </Card>
            <Card title="Sisa Anggaran" action={<PieChart size={16} className="text-blue-500" />}>
              <p className={`text-2xl font-bold mt-2 ${totalAnggaran - totalTerealisasi >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatRupiah(totalAnggaran - totalTerealisasi)}
              </p>
            </Card>
            <Card title="Realisasi" action={<Filter size={16} className="text-violet-500" />}>
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 mt-2">
                {totalAnggaran > 0 ? ((totalTerealisasi / totalAnggaran) * 100).toFixed(1) : 0}%
              </p>
            </Card>
          </div>

          {/* Summary by Category */}
          {summary.length > 0 && (
            <Card title="Ringkasan per Kategori">
              <div className="space-y-3">
                {summary.map((s, i) => {
                  const maxPct = Math.max(...summary.map(x => x.persentase), 1)
                  const barWidth = (s.persentase / maxPct) * 100
                  const barColor = s.persentase > 100 ? 'bg-red-400' : s.persentase > 80 ? 'bg-yellow-400' : 'bg-emerald-400'
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700 dark:text-slate-200">{s.kategori}</span>
                        <span className="text-slate-500">{formatRupiah(s.total_terealisasi)} / {formatRupiah(s.total_anggaran)} ({s.persentase.toFixed(1)}%)</span>
                      </div>
                      <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(barWidth, 100)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Table */}
          <Card title="Daftar Budget">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[768px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Nama Budget</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Kategori</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Bulan</th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Anggaran</th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Terealisasi</th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Selisih</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {filteredBudgets.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 sm:px-4 py-10 text-center text-slate-400">Belum ada budget</td>
                      </tr>
                    ) : (
                      filteredBudgets.map(b => (
                        <tr key={b.kd_budget} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-3 sm:px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{b.nama_budget}</td>
                          <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{b.kategori}</td>
                          <td className="px-3 sm:px-4 py-3 text-center text-slate-700 dark:text-slate-300">
                            {b.bulan ? new Date(0, b.bulan - 1).toLocaleString('id', { month: 'short' }) : 'Tahunan'}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatRupiah(b.jumlah_anggaran)}</td>
                          <td className="px-3 sm:px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatRupiah(b.terealisasi)}</td>
                          <td className="px-3 sm:px-4 py-3 text-right">
                            <span className={`inline-flex items-center gap-1 font-semibold ${b.selisih >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {getSelisihIcon(b.selisih)}
                              {formatRupiah(Math.abs(b.selisih))}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <Badge label={b.status} variant={getStatusVariant(b.status)} />
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 transition-colors" title="Edit">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              <button onClick={() => setDeleteBudget(b)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Hapus">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {/* Add/Edit Modal */}
          <Modal
            open={modal === 'add' || modal === 'edit'}
            onClose={() => { setModal(null); setEditBudget(null) }}
            title={modal === 'add' ? 'Tambah Budget' : 'Edit Budget'}
            size="sm"
            footer={
              <>
                <Button variant="secondary" onClick={() => { setModal(null); setEditBudget(null) }} className="w-full sm:w-auto">Batal</Button>
                <Button loading={loading} onClick={handleSave} className="w-full sm:w-auto">Simpan</Button>
              </>
            }
          >
            <div className="space-y-3">
              <Input label="Nama Budget *" value={form.nama_budget} onChange={e => setForm(p => ({ ...p, nama_budget: e.target.value }))} placeholder="Nama budget" />
              <Input label="Kategori *" value={form.kategori} onChange={e => setForm(p => ({ ...p, kategori: e.target.value }))} placeholder="Contoh: Operasional, Marketing, Gaji" />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Bulan (Opsional)"
                  options={bulanOptions}
                  value={form.bulan}
                  onChange={e => setForm(p => ({ ...p, bulan: e.target.value }))}
                />
                <Input label="Tahun *" type="number" value={form.tahun} onChange={e => setForm(p => ({ ...p, tahun: e.target.value }))} />
              </div>
              <Input label="Jumlah Anggaran *" type="number" value={form.jumlah_anggaran} onChange={e => setForm(p => ({ ...p, jumlah_anggaran: e.target.value }))} placeholder="0" />
            </div>
          </Modal>

          <ConfirmDialog
            open={!!deleteBudget}
            onClose={() => setDeleteBudget(null)}
            onConfirm={handleDelete}
            title="Hapus Budget"
            message={`Budget "${deleteBudget?.nama_budget}" akan dihapus.`}
            confirmText="Hapus"
            variant="danger"
            loading={loading}
          />
        </>
      )}
    </div>
  )
}
