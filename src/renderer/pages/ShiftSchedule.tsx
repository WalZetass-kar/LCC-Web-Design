import { useEffect, useState } from 'react'
import { Plus, Search, Trash2, Calendar, Clock, Sun, Moon, Sunrise } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import ConfirmDialog from '../components/ConfirmDialog'
import { SkeletonSpinner } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatDate } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

interface ShiftSchedule {
  id_jadwal: number
  id_karyawan: number
  tgl: string
  shift: 'PAGI' | 'SIANG' | 'MALAM' | 'CUSTOM'
  jam_masuk: string
  jam_keluar: string
  catatan: string | null
  created_at: string
  updated_at: string
  karyawan_nama?: string
}

interface Employee {
  id_karyawan: number
  nik: string
  nama_lengkap: string
  status_karyawan: string
}

const shiftIcons: Record<string, JSX.Element> = {
  PAGI: <Sun size={14} className="text-amber-500" />,
  SIANG: <Sunrise size={14} className="text-orange-500" />,
  MALAM: <Moon size={14} className="text-indigo-500" />,
  CUSTOM: <Clock size={14} className="text-blue-500" />,
}

const shiftColors: Record<string, string> = {
  PAGI: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  SIANG: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  MALAM: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
  CUSTOM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
}

const getDatesInRange = (start: string, end: string) => {
  const dates: string[] = []
  const startDate = new Date(start)
  const endDate = new Date(end)
  const current = new Date(startDate)
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  return dates
}

export default function ShiftSchedule() {
  const toast = useToast()
  const { user } = useAuth()
  const [data, setData] = useState<ShiftSchedule[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [modal, setModal] = useState<'add' | 'bulk' | null>(null)
  const [form, setForm] = useState({
    id_karyawan: 0, tgl: new Date().toISOString().split('T')[0],
    shift: 'PAGI' as const, jam_masuk: '08:00', jam_keluar: '16:00', catatan: ''
  })
  const [bulkForm, setBulkForm] = useState({
    shift: 'PAGI' as const, jam_masuk: '08:00', jam_keluar: '16:00',
    tgl_mulai: '', tgl_akhir: '', catatan: ''
  })
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([])
  const [deleteTarget, setDeleteTarget] = useState<ShiftSchedule | null>(null)

  const load = async () => {
    const [r1, r2] = await Promise.all([
      api<ShiftSchedule[]>('shiftSchedule:getAll', startDate, endDate || undefined),
      api<Employee[]>('employee:getAll'),
    ])
    if (r1.success) {
      let filtered = r1.data ?? []
      if (search) {
        const q = search.toLowerCase()
        filtered = filtered.filter(s => s.karyawan_nama?.toLowerCase().includes(q))
      }
      setData(filtered)
    }
    if (r2.success) setEmployees(r2.data ?? [])
    setLoadingData(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (!loadingData) load() }, [startDate, endDate])

  useEffect(() => {
    const t = setTimeout(() => load(), 500)
    return () => clearTimeout(t)
  }, [search])

  const handleCreate = async () => {
    if (!form.id_karyawan || !form.tgl || !form.jam_masuk || !form.jam_keluar) {
      return toast('Semua field wajib diisi', 'error')
    }
    setLoading(true)
    const r = await api('shiftSchedule:create', form)
    setLoading(false)
    if (r.success) {
      toast(r.message as string)
      setModal(null)
      setForm(p => ({ ...p, id_karyawan: 0 }))
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleBulkAssign = async () => {
    if (selectedEmployees.length === 0 || !bulkForm.tgl_mulai || !bulkForm.tgl_akhir) {
      return toast('Pilih karyawan dan rentang tanggal', 'error')
    }
    setLoading(true)
    const dates = getDatesInRange(bulkForm.tgl_mulai, bulkForm.tgl_akhir)
    let success = 0
    for (const id_karyawan of selectedEmployees) {
      for (const tgl of dates) {
        const r = await api('shiftSchedule:create', {
          id_karyawan, tgl, shift: bulkForm.shift,
          jam_masuk: bulkForm.jam_masuk, jam_keluar: bulkForm.jam_keluar,
          catatan: bulkForm.catatan
        })
        if (r.success) success++
      }
    }
    setLoading(false)
    toast(`${success} jadwal berhasil dibuat`)
    setModal(null)
    setSelectedEmployees([])
    load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setLoading(true)
    const r = await api('shiftSchedule:delete', deleteTarget.id_jadwal)
    setLoading(false)
    if (r.success) {
      toast(r.message as string)
      setDeleteTarget(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const toggleEmployee = (id: number) => {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  const getDayName = (dateStr: string) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    return days[new Date(dateStr).getDay()]
  }

  return (
    <div className="space-y-4">
      {loadingData ? (
        <SkeletonSpinner label="Memuat data jadwal shift..." />
      ) : (
        <>
          <Card>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1">
                <Input placeholder="Cari karyawan..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={16} />} />
              </div>
              <div className="w-full sm:w-44">
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="w-full sm:w-44">
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} placeholder="Sampai" />
              </div>
              <Button icon={<Plus size={16} />} onClick={() => setModal('add')}>
                Tambah Jadwal
              </Button>
              <Button variant="secondary" icon={<Calendar size={16} />} onClick={() => setModal('bulk')}>
                Bulk Assign
              </Button>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[700px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tanggal</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Hari</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Karyawan</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Shift</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Jam Masuk</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Jam Keluar</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 sm:px-4 py-10 text-center text-slate-400 text-sm">
                          Belum ada jadwal shift
                        </td>
                      </tr>
                    ) : (
                      data.map(s => (
                        <tr key={s.id_jadwal} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{formatDate(s.tgl)}</td>
                          <td className="px-3 sm:px-4 py-3 text-slate-500 text-xs">{getDayName(s.tgl)}</td>
                          <td className="px-3 sm:px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{s.karyawan_nama || '-'}</td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${shiftColors[s.shift]}`}>
                              {shiftIcons[s.shift]}
                              {s.shift}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center text-slate-700 dark:text-slate-300">{s.jam_masuk}</td>
                          <td className="px-3 sm:px-4 py-3 text-center text-slate-700 dark:text-slate-300">{s.jam_keluar}</td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Hapus">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Tambah Jadwal Shift" size="md"
            footer={
              <>
                <Button variant="secondary" onClick={() => setModal(null)}>Batal</Button>
                <Button loading={loading} onClick={handleCreate}>Simpan</Button>
              </>
            }>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Karyawan *</label>
                <select value={form.id_karyawan} onChange={e => setForm(p => ({ ...p, id_karyawan: parseInt(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                  <option value={0}>-- Pilih Karyawan --</option>
                  {employees.filter(e => e.status_karyawan === 'AKTIF').map(e => (
                    <option key={e.id_karyawan} value={e.id_karyawan}>{e.nama_lengkap}</option>
                  ))}
                </select>
              </div>
              <Input label="Tanggal *" type="date" value={form.tgl} onChange={e => setForm(p => ({ ...p, tgl: e.target.value }))} />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Shift *</label>
                <select value={form.shift} onChange={e => setForm(p => ({ ...p, shift: e.target.value as any }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                  <option value="PAGI">Pagi</option>
                  <option value="SIANG">Siang</option>
                  <option value="MALAM">Malam</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
              <Input label="Jam Masuk *" type="time" value={form.jam_masuk} onChange={e => setForm(p => ({ ...p, jam_masuk: e.target.value }))} />
              <Input label="Jam Keluar *" type="time" value={form.jam_keluar} onChange={e => setForm(p => ({ ...p, jam_keluar: e.target.value }))} />
              <div className="sm:col-span-2">
                <Input label="Catatan" value={form.catatan} onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} placeholder="Catatan" />
              </div>
            </div>
          </Modal>

          <Modal open={modal === 'bulk'} onClose={() => { setModal(null); setSelectedEmployees([]) }} title="Bulk Assign Shift" size="lg"
            footer={
              <>
                <Button variant="secondary" onClick={() => { setModal(null); setSelectedEmployees([]) }}>Batal</Button>
                <Button loading={loading} onClick={handleBulkAssign}>Simpan Semua</Button>
              </>
            }>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Shift *</label>
                  <select value={bulkForm.shift} onChange={e => setBulkForm(p => ({ ...p, shift: e.target.value as any }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                    <option value="PAGI">Pagi</option>
                    <option value="SIANG">Siang</option>
                    <option value="MALAM">Malam</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <Input label="Jam Masuk *" type="time" value={bulkForm.jam_masuk} onChange={e => setBulkForm(p => ({ ...p, jam_masuk: e.target.value }))} />
                <Input label="Jam Keluar *" type="time" value={bulkForm.jam_keluar} onChange={e => setBulkForm(p => ({ ...p, jam_keluar: e.target.value }))} />
                <Input label="Tanggal Mulai *" type="date" value={bulkForm.tgl_mulai} onChange={e => setBulkForm(p => ({ ...p, tgl_mulai: e.target.value }))} />
                <Input label="Tanggal Akhir *" type="date" value={bulkForm.tgl_akhir} onChange={e => setBulkForm(p => ({ ...p, tgl_akhir: e.target.value }))} />
                <div className="sm:col-span-2">
                  <Input label="Catatan" value={bulkForm.catatan} onChange={e => setBulkForm(p => ({ ...p, catatan: e.target.value }))} placeholder="Catatan (opsional)" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Pilih Karyawan *</p>
                <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-600 rounded-lg p-2">
                  {employees.filter(e => e.status_karyawan === 'AKTIF').map(e => (
                    <label key={e.id_karyawan} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                      <input type="checkbox" checked={selectedEmployees.includes(e.id_karyawan)} onChange={() => toggleEmployee(e.id_karyawan)}
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                      <span className="text-sm text-slate-700 dark:text-slate-200">{e.nama_lengkap}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1">Terpilih: {selectedEmployees.length} karyawan</p>
              </div>
            </div>
          </Modal>

          <ConfirmDialog
            open={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            title="Hapus Jadwal Shift"
            message={`Jadwal shift untuk "${deleteTarget?.karyawan_nama ?? ''}" pada ${deleteTarget ? formatDate(deleteTarget.tgl) : ''} akan dihapus.`}
            confirmText="Hapus"
            variant="danger"
            loading={loading}
          />
        </>
      )}
    </div>
  )
}
