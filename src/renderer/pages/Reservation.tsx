import { useEffect, useState } from 'react'
import { Calendar, Clock, Users, Phone, Mail, CheckCircle, XCircle, CalendarCheck, List, Plus, Search, RefreshCw } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import Select from '../components/Select'
import Textarea from '../components/Textarea'
import { SkeletonStatGrid, SkeletonSpinner } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatDate, formatDateTime } from '../utils/format'
import { useToast } from '../contexts/ToastContext'

interface Reservasi {
  id: number
  nomor_reservasi: string
  nama_pelanggan: string
  no_telp?: string | null
  email?: string | null
  jumlah_tamu: number
  tgl_reservasi: string
  jam_reservasi: string
  jam_berakhir?: string | null
  table_id?: number | null
  nomor_meja?: string | null
  label_meja?: string | null
  catatan?: string | null
  status: 'MENUNGGU' | 'KONFIRMASI' | 'HADIR' | 'SELESAI' | 'BATAL'
  deposit?: number
  created_at: string
}

interface Meja {
  id: number
  nomor_meja: string
  label?: string | null
  kapasitas: number
  status: string
}

const statusVariant: Record<string, 'yellow' | 'blue' | 'green' | 'gray' | 'red'> = {
  MENUNGGU: 'yellow',
  KONFIRMASI: 'blue',
  HADIR: 'green',
  SELESAI: 'gray',
  BATAL: 'red',
}

export default function Reservation() {
  const toast = useToast()
  const [reservations, setReservations] = useState<Reservasi[]>([])
  const [tables, setTables] = useState<Meja[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [modal, setModal] = useState<'add' | 'detail' | null>(null)
  const [selectedReservation, setSelectedReservation] = useState<Reservasi | null>(null)
  const [cancelModal, setCancelModal] = useState<Reservasi | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    nama_pelanggan: '',
    no_telp: '',
    email: '',
    jumlah_tamu: '2',
    tgl_reservasi: new Date().toISOString().split('T')[0],
    jam_reservasi: '18:00',
    table_id: '',
    catatan: '',
  })

  const load = async (isManual = false) => {
    const [r1, r2] = await Promise.all([
      api<Reservasi[]>('reservation:getAll'),
      api<Meja[]>('table:getAll'),
    ])
    if (r1.success) setReservations(r1.data ?? [])
    if (r2.success) setTables(r2.data ?? [])
    setLoading(false)
    if (isManual) toast('Data reservasi diperbarui', 'success')
  }

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setForm({
      nama_pelanggan: '',
      no_telp: '',
      email: '',
      jumlah_tamu: '2',
      tgl_reservasi: new Date().toISOString().split('T')[0],
      jam_reservasi: '18:00',
      table_id: '',
      catatan: '',
    })
  }

  const handleCreate = async () => {
    if (!form.nama_pelanggan.trim() || !form.no_telp.trim() || !form.tgl_reservasi || !form.jam_reservasi) {
      return toast('Nama, no telepon, tanggal dan jam wajib diisi', 'error')
    }
    setSubmitting(true)
    const payload = {
      nama_pelanggan: form.nama_pelanggan.trim(),
      no_telp: form.no_telp.trim(),
      email: form.email.trim() || null,
      jumlah_tamu: parseInt(form.jumlah_tamu) || 2,
      tgl_reservasi: form.tgl_reservasi,
      jam_reservasi: form.jam_reservasi,
      table_id: form.table_id ? parseInt(form.table_id) : null,
      catatan: form.catatan.trim() || null,
    }
    const r = await api('reservation:create', payload)
    setSubmitting(false)
    if (r.success) {
      toast('Reservasi berhasil dibuat', 'success')
      setModal(null)
      resetForm()
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleUpdateStatus = async (res: Reservasi, status: string) => {
    setSubmitting(true)
    const r = await api('reservation:updateStatus', res.id, status)
    setSubmitting(false)
    if (r.success) {
      toast(`Status reservasi ${res.nama_pelanggan} diubah ke ${status}`, 'success')
      setSelectedReservation(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleCancel = async () => {
    if (!cancelModal) return
    setSubmitting(true)
    const r = await api('reservation:cancel', cancelModal.id)
    setSubmitting(false)
    if (r.success) {
      toast('Reservasi berhasil dibatalkan', 'success')
      setCancelModal(null)
      setCancelReason('')
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const filtered = reservations.filter(r =>
    r.nama_pelanggan.toLowerCase().includes(search.toLowerCase()) ||
    r.nomor_reservasi.toLowerCase().includes(search.toLowerCase())
  )

  const tableOptions = tables.map(t => ({
    value: String(t.id),
    label: `${t.nomor_meja} (${t.label || '-'}) · ${t.kapasitas} org [${t.status}]`,
  }))

  const statItems = [
    { label: 'Total Reservasi', value: reservations.length, icon: <Calendar size={20} className="text-primary-500" /> },
    { label: 'Menunggu', value: reservations.filter(r => r.status === 'MENUNGGU').length, icon: <Clock size={20} className="text-amber-500" /> },
    { label: 'Tamu Hadir', value: reservations.filter(r => r.status === 'HADIR').length, icon: <CheckCircle size={20} className="text-emerald-500" /> },
    { label: 'Batal', value: reservations.filter(r => r.status === 'BATAL').length, icon: <XCircle size={20} className="text-red-500" /> },
  ]

  return (
    <div className="space-y-4">
      {loading ? (
        <>
          <SkeletonStatGrid count={4} />
          <SkeletonSpinner label="Memuat reservasi..." />
        </>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statItems.map((s, i) => (
              <Card key={i} title={s.label} action={s.icon}>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-2">{s.value}</p>
              </Card>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Input
              placeholder="Cari nama atau nomor reservasi..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />} onClick={() => load(true)}>
                Refresh
              </Button>
              <Button icon={<Plus size={16} />} onClick={() => { resetForm(); setModal('add') }} className="bg-red-600 hover:bg-red-700 text-white border-0 font-bold">
                Buat Reservasi
              </Button>
            </div>
          </div>

          {/* Table */}
          <Card title="Daftar Reservasi Meja">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[800px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">No Reservasi</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Pelanggan</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Tamu</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Jadwal</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Meja</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 sm:px-4 py-10 text-center text-slate-400">Belum ada data reservasi</td>
                      </tr>
                    ) : (
                      filtered.map(res => (
                        <tr key={res.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors cursor-pointer" onClick={() => { setSelectedReservation(res); setModal('detail') }}>
                          <td className="px-3 sm:px-4 py-3 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{res.nomor_reservasi}</td>
                          <td className="px-3 sm:px-4 py-3">
                            <p className="font-bold text-slate-800 dark:text-slate-200">{res.nama_pelanggan}</p>
                            <p className="text-xs text-slate-400">{res.no_telp || '-'}</p>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">{res.jumlah_tamu} orang</td>
                          <td className="px-3 sm:px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-300">{formatDate(res.tgl_reservasi)} · {res.jam_reservasi}</td>
                          <td className="px-3 sm:px-4 py-3 text-center text-xs font-bold text-slate-700 dark:text-slate-300">{res.nomor_meja ? `${res.nomor_meja}` : '-'}</td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <Badge label={res.status} variant={statusVariant[res.status] ?? 'gray'} />
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {res.status === 'MENUNGGU' && (
                                <Button size="sm" variant="secondary" onClick={() => handleUpdateStatus(res, 'KONFIRMASI')}>
                                  Konfirmasi
                                </Button>
                              )}
                              {(res.status === 'MENUNGGU' || res.status === 'KONFIRMASI') && (
                                <Button size="sm" variant="success" icon={<CheckCircle size={14} />} onClick={() => handleUpdateStatus(res, 'HADIR')}>
                                  Check-in
                                </Button>
                              )}
                              {(res.status === 'MENUNGGU' || res.status === 'KONFIRMASI') && (
                                <Button size="sm" variant="danger" icon={<XCircle size={14} />} onClick={() => setCancelModal(res)}>
                                  Batal
                                </Button>
                              )}
                              {res.status === 'HADIR' && (
                                <Button size="sm" variant="secondary" onClick={() => handleUpdateStatus(res, 'SELESAI')}>
                                  Selesai
                                </Button>
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

          {/* Add Reservation Modal */}
          <Modal
            open={modal === 'add'}
            onClose={() => { setModal(null); resetForm() }}
            title="Buat Reservasi Meja Baru"
            size="md"
            footer={
              <>
                <Button variant="secondary" onClick={() => { setModal(null); resetForm() }} className="w-full sm:w-auto">Batal</Button>
                <Button loading={submitting} onClick={handleCreate} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white border-0 font-bold">Simpan Reservasi</Button>
              </>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Nama Pelanggan *" value={form.nama_pelanggan} onChange={e => setForm(prev => ({ ...prev, nama_pelanggan: e.target.value }))} placeholder="Nama Pelanggan" />
              <Input label="No Telepon / WhatsApp *" value={form.no_telp} onChange={e => setForm(prev => ({ ...prev, no_telp: e.target.value }))} placeholder="08123456789" />
              <Input label="Email (Opsional)" type="email" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} placeholder="email@example.com" />
              <Input label="Jumlah Tamu *" type="number" value={form.jumlah_tamu} onChange={e => setForm(prev => ({ ...prev, jumlah_tamu: e.target.value }))} placeholder="2" />
              <Input label="Tanggal Reservasi *" type="date" value={form.tgl_reservasi} onChange={e => setForm(prev => ({ ...prev, tgl_reservasi: e.target.value }))} />
              <Input label="Jam Reservasi *" type="time" value={form.jam_reservasi} onChange={e => setForm(prev => ({ ...prev, jam_reservasi: e.target.value }))} />
              <div className="sm:col-span-2">
                <Select label="Pilih Meja Restoran" value={form.table_id} onChange={e => setForm(prev => ({ ...prev, table_id: e.target.value }))} options={tableOptions} placeholder="Pilih Meja (Opsional)" />
              </div>
              <div className="sm:col-span-2">
                <Textarea label="Catatan Khusus (Request Tamu)" value={form.catatan} onChange={e => setForm(prev => ({ ...prev, catatan: e.target.value }))} placeholder="Dekat jendela, kursi bayi, dll..." />
              </div>
            </div>
          </Modal>

          {/* Detail Modal */}
          <Modal open={modal === 'detail' && !!selectedReservation} onClose={() => { setModal(null); setSelectedReservation(null) }} title="Detail Data Reservasi" size="sm">
            {selectedReservation && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-500">{selectedReservation.nomor_reservasi}</span>
                  <Badge label={selectedReservation.status} variant={statusVariant[selectedReservation.status] ?? 'gray'} />
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <Users size={15} className="text-slate-400" />
                    <span className="font-bold">{selectedReservation.nama_pelanggan}</span>
                    <span className="text-slate-400 font-normal">({selectedReservation.jumlah_tamu} orang)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Phone size={14} className="text-slate-400" />
                    <span>{selectedReservation.no_telp || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Calendar size={14} className="text-slate-400" />
                    <span>{formatDate(selectedReservation.tgl_reservasi)} pukul {selectedReservation.jam_reservasi}</span>
                  </div>
                  {selectedReservation.nomor_meja && (
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold">
                      Meja Terkait: {selectedReservation.nomor_meja} {selectedReservation.label_meja ? `(${selectedReservation.label_meja})` : ''}
                    </div>
                  )}
                </div>
                {selectedReservation.catatan && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300">
                    <p className="font-bold text-slate-700 dark:text-slate-200">Catatan:</p>
                    <p>{selectedReservation.catatan}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  {(selectedReservation.status === 'MENUNGGU' || selectedReservation.status === 'KONFIRMASI') && (
                    <>
                      <Button className="flex-1 font-bold" variant="success" icon={<CheckCircle size={15} />} onClick={() => handleUpdateStatus(selectedReservation, 'HADIR')}>Check-in</Button>
                      <Button className="flex-1 font-bold" variant="danger" icon={<XCircle size={15} />} onClick={() => setCancelModal(selectedReservation)}>Batalkan</Button>
                    </>
                  )}
                  {selectedReservation.status === 'HADIR' && (
                    <Button className="flex-1 font-bold" onClick={() => handleUpdateStatus(selectedReservation, 'SELESAI')}>Selesaikan</Button>
                  )}
                </div>
              </div>
            )}
          </Modal>

          {/* Cancel Modal */}
          <Modal
            open={!!cancelModal}
            onClose={() => { setCancelModal(null); setCancelReason('') }}
            title="Batalkan Reservasi"
            size="sm"
            footer={
              <>
                <Button variant="secondary" onClick={() => { setCancelModal(null); setCancelReason('') }} className="w-full sm:w-auto">Tutup</Button>
                <Button variant="danger" loading={submitting} onClick={handleCancel} className="w-full sm:w-auto font-bold">Ya, Batalkan</Button>
              </>
            }
          >
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              Apakah Anda yakin ingin membatalkan reservasi atas nama <strong>{cancelModal?.nama_pelanggan}</strong>?
            </p>
          </Modal>
        </>
      )}
    </div>
  )
}

