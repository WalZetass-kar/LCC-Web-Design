import { useState, useEffect } from 'react'
import { Clock, DollarSign, TrendingUp, Eye, Trash2, Plus, AlertCircle, ShieldAlert, CheckCircle2, ArrowUpRight, Wallet } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Input from '../components/Input'
import Badge from '../components/Badge'
import { SkeletonSpinner } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatRupiah, formatDateTime } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

export default function Shifts() {
  const toast = useToast()
  const { user } = useAuth()
  const [shifts, setShifts] = useState<any[]>([])
  const [currentShift, setCurrentShift] = useState<any>(null)
  const [modal, setModal] = useState<'open' | 'close' | 'detail' | null>(null)
  const [selectedShift, setSelectedShift] = useState<any>(null)
  const [deleteShift, setDeleteShift] = useState<any>(null)
  const [openingBalance, setOpeningBalance] = useState('')
  const [closingBalance, setClosingBalance] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  const loadShifts = async () => {
    try {
      const r = await api<any[]>('shift:getAll')
      if (r.success) {
        const validData = (r.data ?? []).filter(item => item && item.id)
        setShifts(validData)
      }
      const curr = await api<any>('shift:getCurrent', user?.nama_pengguna)
      if (curr.success) setCurrentShift(curr.data)
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => { loadShifts() }, [])

  const handleOpenShift = async () => {
    if (!openingBalance) return toast('Masukkan modal awal', 'error')
    setLoading(true)
    const r = await api('shift:open', { user_id: user?.nama_pengguna, opening_balance: parseFloat(openingBalance) })
    setLoading(false)
    if (r.success) {
      toast('Shift berhasil dibuka')
      setModal(null)
      setOpeningBalance('')
      loadShifts()
    } else {
      toast(r.message || 'Gagal buka shift', 'error')
    }
  }

  const handleCloseShift = async () => {
    if (!closingBalance) return toast('Masukkan saldo akhir', 'error')
    setLoading(true)
    const r = await api<{ difference: number }>('shift:close', currentShift.id, {
      opening_balance: currentShift.opening_balance,
      closing_balance: parseFloat(closingBalance),
      notes
    })
    setLoading(false)
    if (r.success) {
      toast(`Shift ditutup. Selisih: ${formatRupiah(r.data?.difference ?? 0)}`)
      setModal(null)
      setClosingBalance('')
      setNotes('')
      loadShifts()
    } else {
      toast(r.message || 'Gagal tutup shift', 'error')
    }
  }
  
  const handleDelete = async () => {
    if (!deleteShift) return
    setLoading(true)
    const r = await api('shift:delete', deleteShift.id)
    setLoading(false)
    if (r.success) {
      toast('Shift berhasil dihapus')
      setDeleteShift(null)
      loadShifts()
    } else {
      toast(r.message || 'Gagal menghapus shift', 'error')
    }
  }

  return (
    <div className="space-y-5 select-none">
      {loadingData ? (
        <SkeletonSpinner label="Memuat data shift kasir..." />
      ) : (
        <>
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Manajemen Shift & Rekap Kas</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-red-600/10 text-red-600 dark:bg-red-950/60 dark:text-red-400 text-[11px] font-bold border border-red-600/20">
                  {currentShift ? '1 Shift Aktif' : 'Shift Nonaktif'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                Kontrol pembukaan/penutupan laci kasir, hitung saldo awal/akhir, dan audit selisih kas harian.
              </p>
            </div>

            {!currentShift ? (
              <Button
                onClick={() => setModal('open')}
                icon={<Plus size={16} />}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold border-0 shadow-md shadow-red-600/20"
              >
                Buka Shift Baru
              </Button>
            ) : (
              <Button
                onClick={() => setModal('close')}
                variant="danger"
                icon={<Clock size={16} />}
                className="w-full sm:w-auto font-bold shadow-md shadow-red-600/20"
              >
                Tutup Shift Saat Ini
              </Button>
            )}
          </div>

          {/* Active Shift Card Banner */}
          {currentShift && (
            <div className="rounded-3xl bg-slate-900 text-white p-6 border border-slate-800 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Shift Kasir Sedang Berjalan
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono">{currentShift.shift_number}</h2>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    Dibuka pada: {formatDateTime(currentShift.start_time)}
                  </p>
                </div>
                <div className="sm:text-right bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Modal Awal Laci Kas</p>
                  <h3 className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">{formatRupiah(currentShift.opening_balance)}</h3>
                </div>
              </div>
            </div>
          )}

          {/* Shift Table */}
          <Card title="Riwayat Shift Kasir Toko" subtitle="Catatan historis pembukaan dan penutupan shift kasir" className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-xs min-w-[800px]">
                <thead className="bg-slate-50 dark:bg-slate-950 font-extrabold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">No Shift</th>
                    <th className="px-4 py-3 text-left">Kasir</th>
                    <th className="px-4 py-3 text-left">Waktu Mulai</th>
                    <th className="px-4 py-3 text-left">Waktu Selesai</th>
                    <th className="px-4 py-3 text-right">Modal Awal</th>
                    <th className="px-4 py-3 text-right">Penjualan</th>
                    <th className="px-4 py-3 text-right">Selisih Kas</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {shifts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-400 font-bold">
                        Belum ada riwayat data shift kasir
                      </td>
                    </tr>
                  ) : (
                    shifts.map(shift => (
                      <tr key={shift.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">{shift.shift_number}</td>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{shift.nama_lengkap}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDateTime(shift.start_time)}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{shift.end_time ? formatDateTime(shift.end_time) : '-'}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-300">{formatRupiah(shift.opening_balance)}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-red-600 dark:text-red-400">{formatRupiah(shift.total_sales || 0)}</td>
                        <td className={`px-4 py-3 text-right font-black ${(shift.difference || 0) > 0 ? 'text-emerald-600' : (shift.difference || 0) < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {shift.difference ? formatRupiah(shift.difference) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge label={shift.status} variant={shift.status === 'OPEN' ? 'green' : 'blue'} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => { setSelectedShift(shift); setModal('detail') }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors" title="Lihat Detail Shift">
                              <Eye size={15} />
                            </button>
                            {shift.status === 'CLOSED' && (
                              <button onClick={() => setDeleteShift(shift)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 transition-colors" title="Hapus Data Shift">
                                <Trash2 size={15} />
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
          </Card>

          {/* Modal Buka Shift */}
          <Modal open={modal === 'open'} onClose={() => setModal(null)} title="Buka Shift Kasir Baru" size="sm"
            footer={
              <>
                <Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto font-bold">Batal</Button>
                <Button loading={loading} onClick={handleOpenShift} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold border-0">Buka Shift Kasir</Button>
              </>
            }
          >
            <Input label="Modal Awal Laci Kas (Rp) *" type="number" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} placeholder="Contoh: 200000" />
          </Modal>

          {/* Modal Tutup Shift */}
          <Modal open={modal === 'close'} onClose={() => setModal(null)} title="Tutup Shift Kasir & Rekap" size="sm"
            footer={
              <>
                <Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto font-bold">Batal</Button>
                <Button loading={loading} onClick={handleCloseShift} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold border-0">Tutup Shift Kasir</Button>
              </>
            }
          >
            <div className="space-y-3.5">
              <Input label="Saldo Fisik Akhir di Laci (Rp) *" type="number" value={closingBalance} onChange={e => setClosingBalance(e.target.value)} placeholder="Hitung total uang fisik di laci..." />
              <Input label="Catatan Penutupan Shift" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Tuliskan catatan selisih/operasional jika ada..." />
            </div>
          </Modal>

          {/* Modal Detail Shift */}
          <Modal open={modal === 'detail'} onClose={() => setModal(null)} title={`Detail Rekap Shift: ${selectedShift?.shift_number}`} size="md">
            {selectedShift && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><p className="text-[10px] font-extrabold uppercase text-slate-400">Kasir</p><p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedShift.nama_lengkap}</p></div>
                  <div><p className="text-[10px] font-extrabold uppercase text-slate-400">Status Shift</p><Badge label={selectedShift.status} variant={selectedShift.status === 'OPEN' ? 'green' : 'blue'} /></div>
                  <div><p className="text-[10px] font-extrabold uppercase text-slate-400">Waktu Mulai</p><p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">{formatDateTime(selectedShift.start_time)}</p></div>
                  <div><p className="text-[10px] font-extrabold uppercase text-slate-400">Waktu Selesai</p><p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">{selectedShift.end_time ? formatDateTime(selectedShift.end_time) : '-'}</p></div>
                </div>
                
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Modal Awal</span><span className="font-bold text-slate-900 dark:text-white">{formatRupiah(selectedShift.opening_balance)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Total Penjualan Tunai</span><span className="font-extrabold text-red-600 dark:text-red-400">{formatRupiah(selectedShift.total_sales || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Total Transaksi Diproses</span><span className="font-bold text-slate-900 dark:text-white">{selectedShift.total_transactions || 0} Struk</span></div>
                  {selectedShift.status === 'CLOSED' && (
                    <>
                      <div className="flex justify-between"><span className="text-slate-500 font-medium">Saldo Fisik Akhir</span><span className="font-bold text-slate-900 dark:text-white">{formatRupiah(selectedShift.closing_balance)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 font-medium">Saldo Sistem (Expected)</span><span className="font-bold text-slate-900 dark:text-white">{formatRupiah(selectedShift.expected_balance)}</span></div>
                      <div className="flex justify-between text-sm pt-2 border-t border-slate-100 dark:border-slate-800"><span className="font-black">Selisih Kas</span><span className={`font-black ${(selectedShift.difference || 0) > 0 ? 'text-emerald-600' : (selectedShift.difference || 0) < 0 ? 'text-red-600' : 'text-slate-500'}`}>{formatRupiah(selectedShift.difference)}</span></div>
                    </>
                  )}
                </div>
                
                {selectedShift.notes && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200">
                    <span className="font-bold">Catatan Kasir: </span>{selectedShift.notes}
                  </div>
                )}
              </div>
            )}
          </Modal>

          {/* Modal Delete Shift */}
          <Modal open={!!deleteShift} onClose={() => setDeleteShift(null)} title="Hapus Data Shift" size="sm"
            footer={
              <>
                <Button variant="secondary" onClick={() => setDeleteShift(null)} className="w-full sm:w-auto font-bold">Batal</Button>
                <Button variant="danger" loading={loading} onClick={handleDelete} className="w-full sm:w-auto font-bold">Hapus Shift</Button>
              </>
            }
          >
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-3">Apakah Anda yakin ingin menghapus data rekapan shift ini?</p>
            {deleteShift && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-400">No Shift:</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white">{deleteShift.shift_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kasir:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{deleteShift.nama_lengkap}</span>
                </div>
              </div>
            )}
          </Modal>
        </>
      )}
    </div>
  )
}
