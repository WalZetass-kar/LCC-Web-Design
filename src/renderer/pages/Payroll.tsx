import { useEffect, useState } from 'react'
import { DollarSign, Search, Eye, CheckCircle, XCircle, Users, TrendingUp, Plus, Trash2 } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import ConfirmDialog from '../components/ConfirmDialog'
import { SkeletonStatGrid, SkeletonSpinner } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatRupiah, formatDate } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

interface Payroll {
  id_payroll: number
  bulan: number
  tahun: number
  id_karyawan: number
  karyawan_nama?: string
  gaji_pokok: number
  tunjangan: number
  lembur: number
  bonus: number
  potongan: number
  total_gaji: number
  status: 'DRAFT' | 'DISETUJUI' | 'DIBAYAR'
  tgl_dibayar: string | null
  created_at: string
  updated_at: string
}

interface PayrollDetail {
  id_detail: number
  id_payroll: number
  label: string
  jumlah: number
  jenis: 'PENAMBAH' | 'PENGURANG'
}

interface Summary {
  total_gaji: number
  total_karyawan: number
  rata_rata: number
}

const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const statusVariant = (s: string) => {
  if (s === 'DIBAYAR') return 'green'
  if (s === 'DISETUJUI') return 'blue'
  return 'gray'
}

export default function Payroll() {
  const toast = useToast()
  const { user } = useAuth()
  const [data, setData] = useState<Payroll[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [bulan, setBulan] = useState(new Date().getMonth() + 1)
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [detailTarget, setDetailTarget] = useState<Payroll | null>(null)
  const [details, setDetails] = useState<PayrollDetail[]>([])
  const [addDetailModal, setAddDetailModal] = useState(false)
  const [detailForm, setDetailForm] = useState({ label: '', jumlah: '', jenis: 'PENAMBAH' as const })
  const [deleteDetailId, setDeleteDetailId] = useState<number | null>(null)

  const load = async () => {
    const [r1, r2] = await Promise.all([
      api<Payroll[]>('payroll:getAll', bulan, tahun),
      api<Summary>('payroll:getSummary', bulan, tahun),
    ])
    if (r1.success) setData(r1.data ?? [])
    if (r2.success) setSummary(r2.data ?? null)
    setLoadingData(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (!loadingData) load() }, [bulan, tahun])

  const handleGenerate = async () => {
    setLoading(true)
    const r = await api('payroll:create', bulan, tahun)
    setLoading(false)
    if (r.success) { toast(r.message as string); load() }
    else toast(r.message as string, 'error')
  }

  const handleUpdateStatus = async (id: number, status: string) => {
    setLoading(true)
    const r = await api('payroll:updateStatus', id, status)
    setLoading(false)
    if (r.success) { toast(r.message as string); load() }
    else toast(r.message as string, 'error')
  }

  const openDetail = async (p: Payroll) => {
    setDetailTarget(p)
    const r = await api<PayrollDetail[]>('payroll:getDetails', p.id_payroll)
    if (r.success) setDetails(r.data ?? [])
    else setDetails([])
  }

  const handleAddDetail = async () => {
    if (!detailTarget || !detailForm.label || !detailForm.jumlah) return toast('Lengkapi form detail', 'error')
    setLoading(true)
    const r = await api('payroll:addDetail', detailTarget.id_payroll, detailForm.label, parseFloat(detailForm.jumlah), detailForm.jenis)
    setLoading(false)
    if (r.success) {
      toast(r.message as string)
      setAddDetailModal(false)
      setDetailForm({ label: '', jumlah: '', jenis: 'PENAMBAH' })
      openDetail(detailTarget)
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleDeleteDetail = async () => {
    if (!deleteDetailId) return
    setLoading(true)
    const r = await api('payroll:deleteDetail', deleteDetailId)
    setLoading(false)
    if (r.success) {
      toast('Detail dihapus')
      setDeleteDetailId(null)
      if (detailTarget) openDetail(detailTarget)
    } else {
      toast(r.message as string, 'error')
    }
  }

  return (
    <div className="space-y-4">
      {loadingData ? (
        <>
          <SkeletonStatGrid count={3} />
          <SkeletonSpinner label="Memuat data payroll..." />
        </>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card title="Total Gaji" action={<DollarSign size={16} className="text-primary-500" />}>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-2">{formatRupiah(summary.total_gaji)}</p>
                <p className="text-xs text-slate-400 mt-1">{months[bulan - 1]} {tahun}</p>
              </Card>
              <Card title="Total Karyawan" action={<Users size={16} className="text-emerald-500" />}>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{summary.total_karyawan}</p>
              </Card>
              <Card title="Rata-rata Gaji" action={<TrendingUp size={16} className="text-blue-500" />}>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">{formatRupiah(summary.rata_rata)}</p>
              </Card>
            </div>
          )}

          <Card>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="w-full sm:w-40">
                <select value={bulan} onChange={e => setBulan(parseInt(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                  {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="w-full sm:w-32">
                <Input type="number" value={String(tahun)} onChange={e => setTahun(parseInt(e.target.value) || new Date().getFullYear())} />
              </div>
              <Button icon={<DollarSign size={16} />} loading={loading} onClick={handleGenerate}>
                Generate Payroll
              </Button>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[800px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Karyawan</th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Gaji Pokok</th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Tunjangan</th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Lembur</th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Bonus</th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Potongan</th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Total</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-3 sm:px-4 py-10 text-center text-slate-400 text-sm">
                          Belum ada data payroll. Klik "Generate Payroll" untuk membuat.
                        </td>
                      </tr>
                    ) : (
                      data.map(p => (
                        <tr key={p.id_payroll} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-3 sm:px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{p.karyawan_nama || '-'}</td>
                          <td className="px-3 sm:px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatRupiah(p.gaji_pokok)}</td>
                          <td className="px-3 sm:px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatRupiah(p.tunjangan)}</td>
                          <td className="px-3 sm:px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatRupiah(p.lembur)}</td>
                          <td className="px-3 sm:px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatRupiah(p.bonus)}</td>
                          <td className="px-3 sm:px-4 py-3 text-right text-red-600">{formatRupiah(p.potongan)}</td>
                          <td className="px-3 sm:px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-100">{formatRupiah(p.total_gaji)}</td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <Badge label={p.status} variant={statusVariant(p.status)} />
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => openDetail(p)} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 transition-colors" title="Detail">
                                <Eye size={14} />
                              </button>
                              {p.status === 'DRAFT' && (
                                <button onClick={() => handleUpdateStatus(p.id_payroll, 'DISETUJUI')} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors" title="Setujui">
                                  <CheckCircle size={14} />
                                </button>
                              )}
                              {p.status === 'DISETUJUI' && (
                                <button onClick={() => handleUpdateStatus(p.id_payroll, 'DIBAYAR')} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition-colors" title="Bayar">
                                  <DollarSign size={14} />
                                </button>
                              )}
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

          <Modal open={!!detailTarget} onClose={() => { setDetailTarget(null); setDetails([]) }} title="Detail Payroll" size="lg"
            footer={
              <div className="flex gap-2 w-full">
                <Button variant="secondary" onClick={() => { setDetailTarget(null); setDetails([]) }} className="flex-1">Tutup</Button>
                <Button icon={<Plus size={16} />} onClick={() => { setAddDetailModal(true); setDetailForm({ label: '', jumlah: '', jenis: 'PENAMBAH' }) }}>Tambah Detail</Button>
              </div>
            }>
            {detailTarget && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500">Karyawan</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{detailTarget.karyawan_nama || '-'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500">Periode</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{months[detailTarget.bulan - 1]} {detailTarget.tahun}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500">Status</p>
                    <Badge label={detailTarget.status} variant={statusVariant(detailTarget.status)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Gaji Pokok</p>
                    <p className="font-semibold text-emerald-800 dark:text-emerald-200">{formatRupiah(detailTarget.gaji_pokok)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Tunjangan</p>
                    <p className="font-semibold text-emerald-800 dark:text-emerald-200">{formatRupiah(detailTarget.tunjangan)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-600 dark:text-blue-400">Lembur</p>
                    <p className="font-semibold text-blue-800 dark:text-blue-200">{formatRupiah(detailTarget.lembur)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-600 dark:text-blue-400">Bonus</p>
                    <p className="font-semibold text-blue-800 dark:text-blue-200">{formatRupiah(detailTarget.bonus)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-600 dark:text-red-400">Potongan</p>
                    <p className="font-semibold text-red-800 dark:text-red-200">{formatRupiah(detailTarget.potongan)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                    <p className="text-xs text-primary-600 dark:text-primary-400">Total Gaji</p>
                    <p className="font-semibold text-primary-800 dark:text-primary-200">{formatRupiah(detailTarget.total_gaji)}</p>
                  </div>
                </div>
                {details.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Detail Lainnya</p>
                    <div className="space-y-2">
                      {details.map(d => (
                        <div key={d.id_detail} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 group">
                          <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{d.label}</p>
                            <Badge label={d.jenis} variant={d.jenis === 'PENAMBAH' ? 'green' : 'red'} />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${d.jenis === 'PENAMBAH' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {d.jenis === 'PENAMBAH' ? '+' : '-'}{formatRupiah(d.jumlah)}
                            </span>
                            <button onClick={() => setDeleteDetailId(d.id_detail)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-all" title="Hapus">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Modal>

          <Modal open={addDetailModal} onClose={() => setAddDetailModal(false)} title="Tambah Detail Payroll" size="sm"
            footer={
              <>
                <Button variant="secondary" onClick={() => setAddDetailModal(false)}>Batal</Button>
                <Button loading={loading} onClick={handleAddDetail}>Simpan</Button>
              </>
            }>
            <div className="space-y-3">
              <Input label="Label *" value={detailForm.label} onChange={e => setDetailForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Lembur minggu ke-3" />
              <Input label="Jumlah *" type="number" value={detailForm.jumlah} onChange={e => setDetailForm(p => ({ ...p, jumlah: e.target.value }))} placeholder="0" />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Jenis</label>
                <select value={detailForm.jenis} onChange={e => setDetailForm(p => ({ ...p, jenis: e.target.value as any }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                  <option value="PENAMBAH">Penambah</option>
                  <option value="PENGURANG">Pengurang</option>
                </select>
              </div>
            </div>
          </Modal>

          <ConfirmDialog
            open={!!deleteDetailId}
            onClose={() => setDeleteDetailId(null)}
            onConfirm={handleDeleteDetail}
            title="Hapus Detail Payroll"
            message="Detail payroll ini akan dihapus."
            confirmText="Hapus"
            variant="danger"
            loading={loading}
          />
        </>
      )}
    </div>
  )
}
