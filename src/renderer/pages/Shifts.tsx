import { useState, useEffect } from 'react'
import { Clock, DollarSign, TrendingUp, Eye, Trash2, Plus } from 'lucide-react'
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
    const r = await api<any[]>('shift:getAll')
    if (r.success) {
      const validData = (r.data ?? []).filter(item => item && item.id)
      setShifts(validData)
    }
    const curr = await api<any>('shift:getCurrent', user?.nama_pengguna)
    if (curr.success) setCurrentShift(curr.data)
    setLoadingData(false)
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
    <div className="space-y-4">
      {loadingData ? (
        <SkeletonSpinner label="Memuat data shift..." />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Shift Management</h1>
              <p className="text-slate-600 dark:text-slate-400">Kelola shift kasir</p>
            </div>
            {!currentShift ? (
              <Button onClick={() => setModal('open')} icon={<Plus size={16} />} className="w-full sm:w-auto">Buka Shift</Button>
            ) : (
              <Button onClick={() => setModal('close')} variant="danger" icon={<Clock size={16} />} className="w-full sm:w-auto">Tutup Shift</Button>
            )}
          </div>

      {currentShift && (
        <Card className="bg-gradient-to-r from-primary-500 to-primary-600 border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm">Shift Aktif</p>
              <h2 className="text-2xl font-bold text-white mt-1">{currentShift.shift_number}</h2>
              <p className="text-sm text-primary-100 mt-2">Dibuka: {formatDateTime(currentShift.start_time)}</p>
            </div>
            <div className="text-right">
              <p className="text-primary-100 text-sm">Modal Awal</p>
              <h3 className="text-2xl font-bold text-white mt-1">{formatRupiah(currentShift.opening_balance)}</h3>
            </div>
          </div>
        </Card>
      )}

      <Card title="Riwayat Shift">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-[800px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">No Shift</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Kasir</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Mulai</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Selesai</th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Modal</th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Penjualan</th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Selisih</th>
                  <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                  <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {shifts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 sm:px-4 py-10 text-center text-slate-400 text-sm">
                      Belum ada data shift
                    </td>
                  </tr>
                ) : (
                  shifts.map(shift => (
                    <tr key={shift.id} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-3 sm:px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{shift.shift_number}</td>
                      <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{shift.nama_lengkap}</td>
                      <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{formatDateTime(shift.start_time)}</td>
                      <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{shift.end_time ? formatDateTime(shift.end_time) : '-'}</td>
                      <td className="px-3 sm:px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatRupiah(shift.opening_balance)}</td>
                      <td className="px-3 sm:px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatRupiah(shift.total_sales || 0)}</td>
                      <td className={`px-3 sm:px-4 py-3 text-right font-semibold ${(shift.difference || 0) > 0 ? 'text-green-600' : (shift.difference || 0) < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                        {shift.difference ? formatRupiah(shift.difference) : '-'}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-center">
                        <Badge label={shift.status} variant={shift.status === 'OPEN' ? 'green' : 'blue'} />
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => { setSelectedShift(shift); setModal('detail') }} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-600 text-primary-500 transition-colors" title="Detail">
                            <Eye size={14} />
                          </button>
                          {shift.status === 'CLOSED' && (
                            <button onClick={() => setDeleteShift(shift)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Hapus">
                              <Trash2 size={14} />
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

      {/* Modal Buka Shift */}
      <Modal open={modal === 'open'} onClose={() => setModal(null)} title="Buka Shift" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto">Batal</Button>
            <Button loading={loading} onClick={handleOpenShift} className="w-full sm:w-auto">Buka Shift</Button>
          </>
        }
      >
        <Input label="Modal Awal *" type="number" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} placeholder="0" />
      </Modal>

      {/* Modal Tutup Shift */}
      <Modal open={modal === 'close'} onClose={() => setModal(null)} title="Tutup Shift" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto">Batal</Button>
            <Button loading={loading} onClick={handleCloseShift} className="w-full sm:w-auto">Tutup Shift</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Saldo Akhir *" type="number" value={closingBalance} onChange={e => setClosingBalance(e.target.value)} placeholder="0" />
          <Input label="Catatan" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan penutupan shift..." />
        </div>
      </Modal>

      {/* Modal Detail */}
      <Modal open={modal === 'detail'} onClose={() => setModal(null)} title={`Detail Shift: ${selectedShift?.shift_number}`} size="md">
        {selectedShift && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-slate-400">Kasir</p><p className="font-medium text-slate-700 dark:text-slate-200">{selectedShift.nama_lengkap}</p></div>
              <div><p className="text-xs text-slate-400">Status</p><Badge label={selectedShift.status} variant={selectedShift.status === 'OPEN' ? 'green' : 'blue'} /></div>
              <div><p className="text-xs text-slate-400">Waktu Mulai</p><p className="font-medium text-slate-700 dark:text-slate-200">{formatDateTime(selectedShift.start_time)}</p></div>
              <div><p className="text-xs text-slate-400">Waktu Selesai</p><p className="font-medium text-slate-700 dark:text-slate-200">{selectedShift.end_time ? formatDateTime(selectedShift.end_time) : '-'}</p></div>
            </div>
            
            <div className="border-t border-slate-100 dark:border-slate-700 pt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Modal Awal</span><span className="font-semibold text-slate-700 dark:text-slate-200">{formatRupiah(selectedShift.opening_balance)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total Penjualan</span><span className="font-semibold text-emerald-600">{formatRupiah(selectedShift.total_sales || 0)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total Transaksi</span><span className="font-semibold text-slate-700 dark:text-slate-200">{selectedShift.total_transactions || 0}</span></div>
              {selectedShift.status === 'CLOSED' && (
                <>
                  <div className="flex justify-between"><span className="text-slate-500">Saldo Akhir</span><span className="font-semibold text-slate-700 dark:text-slate-200">{formatRupiah(selectedShift.closing_balance)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Saldo Expected</span><span className="font-semibold text-slate-700 dark:text-slate-200">{formatRupiah(selectedShift.expected_balance)}</span></div>
                  <div className="flex justify-between text-base"><span className="font-bold">Selisih</span><span className={`font-bold ${(selectedShift.difference || 0) > 0 ? 'text-green-600' : (selectedShift.difference || 0) < 0 ? 'text-red-600' : 'text-slate-500'}`}>{formatRupiah(selectedShift.difference)}</span></div>
                </>
              )}
            </div>
            
            {selectedShift.notes && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-300">
                <span className="font-medium">Catatan: </span>{selectedShift.notes}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Delete */}
      <Modal open={!!deleteShift} onClose={() => setDeleteShift(null)} title="Hapus Shift" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteShift(null)} className="w-full sm:w-auto">Batal</Button>
            <Button variant="danger" loading={loading} onClick={handleDelete} className="w-full sm:w-auto">Hapus</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">Yakin ingin menghapus shift ini?</p>
        {deleteShift && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">No Shift:</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{deleteShift.shift_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kasir:</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{deleteShift.nama_lengkap}</span>
            </div>
          </div>
        )}
      </Modal>
        </>
      )}
    </div>
  )
}
