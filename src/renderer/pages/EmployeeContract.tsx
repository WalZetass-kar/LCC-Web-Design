import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, XCircle, Eye, FileText } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { SkeletonSpinner } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatRupiah, formatDate } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

interface Contract {
  id_kontrak: number
  id_karyawan: number
  nomor_kontrak: string
  jenis_kontrak: string
  tgl_mulai: string
  tgl_berakhir: string
  durasi_bulan: number
  jabatan: string
  departemen: string
  gaji_pokok: number
  tunjangan: number
  uang_makan: number
  uang_transport: number
  hak_cuti_tahunan: number
  masa_percobaan_bulan: number
  status: string
  catatan: string
  tgl_putus: string | null
  alasan_putus: string | null
  created_at: string
  updated_at: string
  karyawan_nama?: string
  karyawan_nik?: string
}

interface Employee {
  id_karyawan: number
  nik: string
  nama_lengkap: string
  status_karyawan: string
}

type ContractForm = Omit<Contract, 'id_kontrak' | 'created_at' | 'updated_at' | 'tgl_putus' | 'alasan_putus'>

const emptyForm: ContractForm = {
  id_karyawan: 0, nomor_kontrak: '', jenis_kontrak: 'PKWT',
  tgl_mulai: '', tgl_berakhir: '', durasi_bulan: 12,
  jabatan: '', departemen: '', gaji_pokok: 0, tunjangan: 0,
  uang_makan: 0, uang_transport: 0, hak_cuti_tahunan: 12,
  masa_percobaan_bulan: 3, status: 'AKTIF', catatan: '',
}

const statusVariant = (s: string) => {
  if (s === 'AKTIF') return 'green'
  if (s === 'BERAKHIR') return 'red'
  if (s === 'DIPUTUS') return 'amber'
  return 'blue'
}

export default function EmployeeContract() {
  const toast = useToast()
  const { user } = useAuth()
  const [data, setData] = useState<Contract[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [detailTarget, setDetailTarget] = useState<Contract | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [terminateTarget, setTerminateTarget] = useState<Contract | null>(null)
  const [alasanPutus, setAlasanPutus] = useState('')

  const load = async () => {
    const [r1, r2] = await Promise.all([
      api<Contract[]>('contract:getByEmployee', search || undefined),
      api<Employee[]>('employee:getAll'),
    ])
    if (r1.success) {
      let filtered = r1.data ?? []
      if (filterStatus) filtered = filtered.filter(c => c.status === filterStatus)
      setData(filtered)
    }
    if (r2.success) setEmployees(r2.data ?? [])
    setLoadingData(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const t = setTimeout(() => load(), 500)
    return () => clearTimeout(t)
  }, [search, filterStatus])

  const openEdit = (c: Contract) => {
    setForm({
      id_karyawan: c.id_karyawan, nomor_kontrak: c.nomor_kontrak,
      jenis_kontrak: c.jenis_kontrak, tgl_mulai: c.tgl_mulai,
      tgl_berakhir: c.tgl_berakhir, durasi_bulan: c.durasi_bulan,
      jabatan: c.jabatan, departemen: c.departemen,
      gaji_pokok: c.gaji_pokok, tunjangan: c.tunjangan,
      uang_makan: c.uang_makan, uang_transport: c.uang_transport,
      hak_cuti_tahunan: c.hak_cuti_tahunan,
      masa_percobaan_bulan: c.masa_percobaan_bulan,
      status: c.status, catatan: c.catatan
    })
    setEditingId(c.id_kontrak)
    setModal('edit')
  }

  const handleSave = async () => {
    if (!form.id_karyawan || !form.nomor_kontrak) return toast('Karyawan dan No. Kontrak wajib diisi', 'error')
    setLoading(true)
    const r = editingId
      ? await api('contract:update', editingId, form)
      : await api('contract:create', form)
    setLoading(false)
    if (r.success) {
      toast(r.message as string)
      setModal(null)
      setForm(emptyForm)
      setEditingId(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleTerminate = async () => {
    if (!terminateTarget || !alasanPutus) return toast('Alasan pemutusan wajib diisi', 'error')
    setLoading(true)
    const r = await api('contract:terminate', terminateTarget.id_kontrak, alasanPutus)
    setLoading(false)
    if (r.success) {
      toast(r.message as string)
      setTerminateTarget(null)
      setAlasanPutus('')
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  return (
    <div className="space-y-4">
      {loadingData ? (
        <SkeletonSpinner label="Memuat data kontrak..." />
      ) : (
        <>
          <Card>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1">
                <Input placeholder="Cari no kontrak atau karyawan..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={16} />} />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="w-full sm:w-44 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                <option value="">Semua Status</option>
                <option value="AKTIF">Aktif</option>
                <option value="BERAKHIR">Berakhir</option>
                <option value="DIPUTUS">Diputus</option>
                <option value="DIPERBARUI">Diperbarui</option>
              </select>
              <Button icon={<Plus size={16} />} onClick={() => { setForm(emptyForm); setEditingId(null); setModal('add') }}>
                Tambah Kontrak
              </Button>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[800px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">No Kontrak</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Karyawan</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Jenis Kontrak</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tgl Mulai</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tgl Berakhir</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 sm:px-4 py-10 text-center text-slate-400 text-sm">
                          Belum ada data kontrak
                        </td>
                      </tr>
                    ) : (
                      data.map(c => (
                        <tr key={c.id_kontrak} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-3 sm:px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{c.nomor_kontrak}</td>
                          <td className="px-3 sm:px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{c.karyawan_nama || '-'}</td>
                          <td className="px-3 sm:px-4 py-3 text-slate-600 dark:text-slate-400">{c.jenis_kontrak}</td>
                          <td className="px-3 sm:px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(c.tgl_mulai)}</td>
                          <td className="px-3 sm:px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(c.tgl_berakhir)}</td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <Badge label={c.status} variant={statusVariant(c.status)} />
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setDetailTarget(c)} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 transition-colors" title="Detail">
                                <Eye size={14} />
                              </button>
                              <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors" title="Edit">
                                <Pencil size={14} />
                              </button>
                              {c.status === 'AKTIF' && (
                                <button onClick={() => { setTerminateTarget(c); setAlasanPutus('') }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Putuskan Kontrak">
                                  <XCircle size={14} />
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

          <Modal open={!!detailTarget} onClose={() => setDetailTarget(null)} title="Detail Kontrak" size="lg"
            footer={<Button variant="secondary" onClick={() => setDetailTarget(null)}>Tutup</Button>}>
            {detailTarget && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500">No Kontrak</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{detailTarget.nomor_kontrak}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500">Karyawan</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{detailTarget.karyawan_nama || '-'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500">Jenis Kontrak</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{detailTarget.jenis_kontrak}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500">Status</p>
                    <Badge label={detailTarget.status} variant={statusVariant(detailTarget.status)} />
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500">Tgl Mulai</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{formatDate(detailTarget.tgl_mulai)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500">Tgl Berakhir</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{formatDate(detailTarget.tgl_berakhir)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500">Durasi</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{detailTarget.durasi_bulan} bulan</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500">Masa Percobaan</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{detailTarget.masa_percobaan_bulan} bulan</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500">Jabatan</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{detailTarget.jabatan}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500">Departemen</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{detailTarget.departemen}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500">Gaji Pokok</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{formatRupiah(detailTarget.gaji_pokok)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500">Tunjangan</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{formatRupiah(detailTarget.tunjangan)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500">Uang Makan</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{formatRupiah(detailTarget.uang_makan)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500">Uang Transport</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{formatRupiah(detailTarget.uang_transport)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500">Hak Cuti Tahunan</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{detailTarget.hak_cuti_tahunan} hari</p>
                  </div>
                </div>
                {detailTarget.catatan && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500">Catatan</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{detailTarget.catatan}</p>
                  </div>
                )}
                {detailTarget.alasan_putus && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-500">Alasan Pemutusan</p>
                    <p className="text-sm text-red-700 dark:text-red-300">{detailTarget.alasan_putus}</p>
                    <p className="text-xs text-red-400 mt-1">{formatDate(detailTarget.tgl_putus)}</p>
                  </div>
                )}
              </div>
            )}
          </Modal>

          <Modal
            open={modal === 'add' || modal === 'edit'}
            onClose={() => setModal(null)}
            title={editingId ? 'Edit Kontrak' : 'Tambah Kontrak'}
            size="lg"
            footer={
              <>
                <Button variant="secondary" onClick={() => setModal(null)}>Batal</Button>
                <Button loading={loading} onClick={handleSave}>{editingId ? 'Simpan' : 'Tambah'}</Button>
              </>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Karyawan *</label>
                <select value={form.id_karyawan} onChange={e => setForm(p => ({ ...p, id_karyawan: parseInt(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                  <option value={0}>-- Pilih Karyawan --</option>
                  {employees.filter(e => e.status_karyawan === 'AKTIF').map(e => (
                    <option key={e.id_karyawan} value={e.id_karyawan}>{e.nik} - {e.nama_lengkap}</option>
                  ))}
                </select>
              </div>
              <Input label="Nomor Kontrak *" value={form.nomor_kontrak} onChange={e => setForm(p => ({ ...p, nomor_kontrak: e.target.value }))} placeholder="KTR-001" />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Jenis Kontrak</label>
                <select value={form.jenis_kontrak} onChange={e => setForm(p => ({ ...p, jenis_kontrak: e.target.value as any }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                  <option value="PKWT">PKWT</option>
                  <option value="PKWTT">PKWTT</option>
                  <option value="MAGANG">Magang</option>
                  <option value="PROYEK">Proyek</option>
                </select>
              </div>
              <Input label="Tanggal Mulai" type="date" value={form.tgl_mulai} onChange={e => setForm(p => ({ ...p, tgl_mulai: e.target.value }))} />
              <Input label="Tanggal Berakhir" type="date" value={form.tgl_berakhir} onChange={e => setForm(p => ({ ...p, tgl_berakhir: e.target.value }))} />
              <Input label="Durasi (bulan)" type="number" value={String(form.durasi_bulan)} onChange={e => setForm(p => ({ ...p, durasi_bulan: parseInt(e.target.value) || 0 }))} />
              <Input label="Jabatan" value={form.jabatan} onChange={e => setForm(p => ({ ...p, jabatan: e.target.value }))} placeholder="Jabatan" />
              <Input label="Departemen" value={form.departemen} onChange={e => setForm(p => ({ ...p, departemen: e.target.value }))} placeholder="Departemen" />
              <Input label="Gaji Pokok" type="number" value={String(form.gaji_pokok)} onChange={e => setForm(p => ({ ...p, gaji_pokok: parseFloat(e.target.value) || 0 }))} />
              <Input label="Tunjangan" type="number" value={String(form.tunjangan)} onChange={e => setForm(p => ({ ...p, tunjangan: parseFloat(e.target.value) || 0 }))} />
              <Input label="Uang Makan" type="number" value={String(form.uang_makan)} onChange={e => setForm(p => ({ ...p, uang_makan: parseFloat(e.target.value) || 0 }))} />
              <Input label="Uang Transport" type="number" value={String(form.uang_transport)} onChange={e => setForm(p => ({ ...p, uang_transport: parseFloat(e.target.value) || 0 }))} />
              <Input label="Hak Cuti Tahunan" type="number" value={String(form.hak_cuti_tahunan)} onChange={e => setForm(p => ({ ...p, hak_cuti_tahunan: parseInt(e.target.value) || 12 }))} />
              <Input label="Masa Percobaan (bulan)" type="number" value={String(form.masa_percobaan_bulan)} onChange={e => setForm(p => ({ ...p, masa_percobaan_bulan: parseInt(e.target.value) || 3 }))} />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                  <option value="AKTIF">Aktif</option>
                  <option value="BERAKHIR">Berakhir</option>
                  <option value="DIPUTUS">Diputus</option>
                  <option value="DIPERBARUI">Diperbarui</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Catatan</label>
                <textarea value={form.catatan} onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} rows={2} placeholder="Catatan"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" />
              </div>
            </div>
          </Modal>

          <Modal
            open={!!terminateTarget}
            onClose={() => setTerminateTarget(null)}
            title="Putuskan Kontrak"
            size="sm"
            footer={
              <>
                <Button variant="secondary" onClick={() => setTerminateTarget(null)}>Batal</Button>
                <Button variant="danger" loading={loading} onClick={handleTerminate}>Putuskan Kontrak</Button>
              </>
            }
          >
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Putuskan kontrak <strong>{terminateTarget?.nomor_kontrak}</strong>?
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Alasan Pemutusan *</label>
                <textarea value={alasanPutus} onChange={e => setAlasanPutus(e.target.value)} rows={3} placeholder="Alasan pemutusan kontrak"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" />
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  )
}
