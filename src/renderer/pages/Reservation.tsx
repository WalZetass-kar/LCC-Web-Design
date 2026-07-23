import { useEffect, useState } from 'react'
import { Calendar, Clock, Users, Phone, Mail, CheckCircle, XCircle, CalendarCheck, List } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import ConfirmDialog from '../components/ConfirmDialog'
import Select from '../components/Select'
import Textarea from '../components/Textarea'
import { SkeletonStatGrid, SkeletonSpinner } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatDate, formatDateTime } from '../utils/format'
import { useToast } from '../contexts/ToastContext'

interface Reservasi {
  kd_reservasi: string
  nama_pelanggan: string
  no_telp: string
  email?: string
  jumlah_tamu: number
  tgl: string
  jam: string
  kd_meja?: string
  nomor_meja?: number
  catatan?: string
  status: 'MENUNGGU' | 'KONFIRMASI' | 'HADIR' | 'SELESAI' | 'BATAL'
  alasan_batal?: string
  created_at: string
}

interface Meja {
  kd_meja: string
  nomor_meja: number
  label: string
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
    nama_pelanggan: '', no_telp: '', email: '', jumlah_tamu: '',
    tgl: '', jam: '', kd_meja: '', catatan: '',
  })

  const load = async () => {
    const [r1, r2] = await Promise.all([
      api<Reservasi[]>('reservation:getAll'),
      api<Meja[]>('table:getAll'),
    ])
    if (r1.success) setReservations(r1.data ?? [])
    if (r2.success) setTables(r2.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setForm({ nama_pelanggan: '', no_telp: '', email: '', jumlah_tamu: '', tgl: '', jam: '', kd_meja: '', catatan: '' })
  }

  const handleCreate = async () => {
    if (!form.nama_pelanggan || !form.no_telp || !form.jumlah_tamu || !form.tgl || !form.jam) {
      return toast('Nama, telepon, jumlah tamu, tanggal dan jam wajib diisi', 'error')
    }
    setSubmitting(true)
    const r = await api('reservation:create', { ...form, jumlah_tamu: parseInt(form.jumlah_tamu) })
    setSubmitting(false)
    if (r.success) {
      toast('Reservasi dibuat')
      setModal(null)
      resetForm()
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleUpdateStatus = async (res: Reservasi, status: string) => {
    setSubmitting(true)
    const r = await api('reservation:updateStatus', res.kd_reservasi, status)
    setSubmitting(false)
    if (r.success) {
      toast(`Status reservasi ${res.nama_pelanggan} diubah`)
      setSelectedReservation(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleCancel = async () => {
    if (!cancelModal) return
    setSubmitting(true)
    const r = await api('reservation:cancel', cancelModal.kd_reservasi, cancelReason)
    setSubmitting(false)
    if (r.success) {
      toast('Reservasi dibatalkan')
      setCancelModal(null)
      setCancelReason('')
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const filtered = reservations.filter(r =>
    r.nama_pelanggan.toLowerCase().includes(search.toLowerCase()) ||
    r.kd_reservasi.toLowerCase().includes(search.toLowerCase())
  )

  const tableOptions = tables
    .filter(t => t.status === 'KOSONG' || t.status === 'RESERVASI')
    .map(t => ({ value: t.kd_meja, label: `Meja ${t.nomor_meja} - ${t.label} (${t.kapasitas} org)` }))

  const statItems = [
    { label: 'Total Reservasi', value: reservations.length, icon: <Calendar size={20} className="text-primary-500" /> },
    { label: 'Menunggu', value: reservations.filter(r => r.status === 'MENUNGGU').length, icon: <Clock size={20} className="text-amber-500" /> },
    { label: 'Hadir', value: reservations.filter(r => r.status === 'HADIR').length, icon: <CheckCircle size={20} className="text-emerald-500" /> },
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
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-400'}`}
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-400'}`}
                >
                  <CalendarCheck size={18} />
                </button>
              </div>
              <Button icon={<Calendar size={16} />} onClick={() => { resetForm(); setModal('add') }}>
                Buat Reservasi
              </Button>
            </div>
          </div>

          {/* Table */}
          <Card title="Daftar Reservasi">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[800px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">No Reservasi</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Pelanggan</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Tamu</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Jam</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Meja</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 sm:px-4 py-10 text-center text-slate-400">Belum ada reservasi</td>
                      </tr>
                    ) : (
                      filtered.map(res => (
                        <tr key={res.kd_reservasi} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer" onClick={() => { setSelectedReservation(res); setModal('detail') }}>
                          <td className="px-3 sm:px-4 py-3 font-mono text-xs text-slate-500">{res.kd_reservasi}</td>
                          <td className="px-3 sm:px-4 py-3">
                            <p className="font-semibold text-slate-700 dark:text-slate-200">{res.nama_pelanggan}</p>
                            <p className="text-xs text-slate-400">{res.no_telp}</p>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center text-slate-600 dark:text-slate-300">{res.jumlah_tamu}</td>
                          <td className="px-3 sm:px-4 py-3 text-center text-slate-600 dark:text-slate-300">{res.jam}</td>
                          <td className="px-3 sm:px-4 py-3 text-center text-slate-600 dark:text-slate-300">{res.nomor_meja ? `Meja ${res.nomor_meja}` : '-'}</td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <Badge label={res.status} variant={statusVariant[res.status] ?? 'gray'} />
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
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

          {/* Calendar View placeholder */}
          {viewMode === 'calendar' && (
            <Card>
              <div className="text-center py-10">
                <CalendarCheck size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-slate-500 dark:text-slate-400">Tampilan kalender</p>
                <p className="text-sm text-slate-400">Fitur tampilan kalender akan segera hadir</p>
              </div>
            </Card>
          )}

          {/* Add Reservation Modal */}
          <Modal
            open={modal === 'add'}
            onClose={() => { setModal(null); resetForm() }}
            title="Buat Reservasi Baru"
            size="md"
            footer={
              <>
                <Button variant="secondary" onClick={() => { setModal(null); resetForm() }} className="w-full sm:w-auto">Batal</Button>
                <Button loading={submitting} onClick={handleCreate} className="w-full sm:w-auto">Simpan</Button>
              </>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Nama Pelanggan *" value={form.nama_pelanggan} onChange={e => setForm(prev => ({ ...prev, nama_pelanggan: e.target.value }))} placeholder="Nama" />
              <Input label="No Telepon *" value={form.no_telp} onChange={e => setForm(prev => ({ ...prev, no_telp: e.target.value }))} placeholder="08123456789" />
              <Input label="Email" type="email" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} placeholder="email@example.com" />
              <Input label="Jumlah Tamu *" type="number" value={form.jumlah_tamu} onChange={e => setForm(prev => ({ ...prev, jumlah_tamu: e.target.value }))} placeholder="2" />
              <Input label="Tanggal *" type="date" value={form.tgl} onChange={e => setForm(prev => ({ ...prev, tgl: e.target.value }))} />
              <Input label="Jam *" type="time" value={form.jam} onChange={e => setForm(prev => ({ ...prev, jam: e.target.value }))} />
              <Select label="Meja" value={form.kd_meja} onChange={e => setForm(prev => ({ ...prev, kd_meja: e.target.value }))} options={tableOptions} placeholder="Pilih Meja" />
              <div className="sm:col-span-2">
                <Textarea label="Catatan" value={form.catatan} onChange={e => setForm(prev => ({ ...prev, catatan: e.target.value }))} placeholder="Catatan khusus..." />
              </div>
            </div>
          </Modal>

          {/* Detail Modal */}
          <Modal open={modal === 'detail' && !!selectedReservation} onClose={() => { setModal(null); setSelectedReservation(null) }} title="Detail Reservasi" size="sm">
            {selectedReservation && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">{selectedReservation.kd_reservasi}</span>
                  <Badge label={selectedReservation.status} variant={statusVariant[selectedReservation.status] ?? 'gray'} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Users size={16} className="text-slate-400" />
                    <span className="font-semibold">{selectedReservation.nama_pelanggan}</span>
                    <span className="text-slate-400">({selectedReservation.jumlah_tamu} tamu)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Phone size={14} />
                    {selectedReservation.no_telp}
                  </div>
                  {selectedReservation.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Mail size={14} />
                      {selectedReservation.email}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar size={14} />
                    {formatDate(selectedReservation.tgl)} {selectedReservation.jam}
                  </div>
                  {selectedReservation.nomor_meja && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>Meja {selectedReservation.nomor_meja}</span>
                    </div>
                  )}
                </div>
                {selectedReservation.catatan && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                    <p className="text-xs text-slate-500">Catatan</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{selectedReservation.catatan}</p>
                  </div>
                )}
                {selectedReservation.alasan_batal && (
                  <div className="rounded-xl bg-red-50 dark:bg-red-950/20 p-3">
                    <p className="text-xs text-slate-500">Alasan Batal</p>
                    <p className="text-sm text-red-600">{selectedReservation.alasan_batal}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  {(selectedReservation.status === 'MENUNGGU' || selectedReservation.status === 'KONFIRMASI') && (
                    <>
                      <Button className="flex-1" variant="success" icon={<CheckCircle size={16} />} onClick={() => handleUpdateStatus(selectedReservation, 'HADIR')}>Check-in</Button>
                      <Button className="flex-1" variant="danger" icon={<XCircle size={16} />} onClick={() => setCancelModal(selectedReservation)}>Batalkan</Button>
                    </>
                  )}
                  {selectedReservation.status === 'HADIR' && (
                    <Button className="flex-1" onClick={() => handleUpdateStatus(selectedReservation, 'SELESAI')}>Selesaikan</Button>
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
                <Button variant="danger" loading={submitting} onClick={handleCancel} className="w-full sm:w-auto">Batalkan Reservasi</Button>
              </>
            }
          >
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              Batalkan reservasi atas nama <strong>{cancelModal?.nama_pelanggan}</strong>?
            </p>
            <Input
              label="Alasan Pembatalan"
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Masukkan alasan..."
            />
          </Modal>
        </>
      )}
    </div>
  )
}
