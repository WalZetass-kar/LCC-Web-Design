import { useState, useEffect } from 'react'
import { Clock, DollarSign, TrendingUp } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Input from '../components/Input'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

export default function Shifts() {
  const toast = useToast()
  const { user } = useAuth()
  const [shifts, setShifts] = useState<any[]>([])
  const [currentShift, setCurrentShift] = useState<any>(null)
  const [showOpen, setShowOpen] = useState(false)
  const [showClose, setShowClose] = useState(false)
  const [openingBalance, setOpeningBalance] = useState('')
  const [closingBalance, setClosingBalance] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const loadShifts = async () => {
    const r = await api<any[]>('shift:getAll')
    if (r.success) setShifts(r.data ?? [])
    
    const curr = await api<any>('shift:getCurrent', user?.id)
    if (curr.success) setCurrentShift(curr.data)
  }

  useEffect(() => { loadShifts() }, [])

  const handleOpenShift = async () => {
    if (!openingBalance) return toast.error('Masukkan modal awal')
    setLoading(true)
    const r = await api('shift:open', { user_id: user?.id, opening_balance: parseFloat(openingBalance) })
    setLoading(false)
    if (r.success) {
      toast.success('Shift berhasil dibuka')
      setShowOpen(false)
      setOpeningBalance('')
      loadShifts()
    } else {
      toast.error(r.error || 'Gagal buka shift')
    }
  }

  const handleCloseShift = async () => {
    if (!closingBalance) return toast.error('Masukkan saldo akhir')
    setLoading(true)
    const r = await api('shift:close', currentShift.id, {
      opening_balance: currentShift.opening_balance,
      closing_balance: parseFloat(closingBalance),
      notes
    })
    setLoading(false)
    if (r.success) {
      toast.success(`Shift ditutup. Selisih: ${formatRupiah(r.data.difference)}`)
      setShowClose(false)
      setClosingBalance('')
      setNotes('')
      loadShifts()
    } else {
      toast.error(r.error || 'Gagal tutup shift')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Management</h1>
          <p className="text-gray-600">Kelola shift kasir</p>
        </div>
        {!currentShift ? (
          <Button onClick={() => setShowOpen(true)} icon={<Clock className="w-4 h-4" />}>Buka Shift</Button>
        ) : (
          <Button onClick={() => setShowClose(true)} variant="danger" icon={<Clock className="w-4 h-4" />}>Tutup Shift</Button>
        )}
      </div>

      {currentShift && (
        <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100">Shift Aktif</p>
              <h2 className="text-2xl font-bold">{currentShift.shift_number}</h2>
              <p className="text-sm text-indigo-100 mt-1">Dibuka: {new Date(currentShift.start_time).toLocaleString('id-ID')}</p>
            </div>
            <div className="text-right">
              <p className="text-indigo-100">Modal Awal</p>
              <h3 className="text-xl font-bold">{formatRupiah(currentShift.opening_balance)}</h3>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">No Shift</th>
                <th className="text-left p-3">Kasir</th>
                <th className="text-left p-3">Mulai</th>
                <th className="text-left p-3">Selesai</th>
                <th className="text-left p-3">Modal</th>
                <th className="text-left p-3">Penjualan</th>
                <th className="text-left p-3">Selisih</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    Belum ada data shift
                  </td>
                </tr>
              ) : (
                shifts.map(shift => (
                  <tr key={shift.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono">{shift.shift_number}</td>
                    <td className="p-3">{shift.nama_lengkap}</td>
                    <td className="p-3">{new Date(shift.start_time).toLocaleString('id-ID')}</td>
                    <td className="p-3">{shift.end_time ? new Date(shift.end_time).toLocaleString('id-ID') : '-'}</td>
                    <td className="p-3">{formatRupiah(shift.opening_balance)}</td>
                    <td className="p-3">{formatRupiah(shift.total_sales)}</td>
                    <td className="p-3">
                      <span className={shift.difference > 0 ? 'text-green-600' : shift.difference < 0 ? 'text-red-600' : ''}>
                        {shift.difference ? formatRupiah(shift.difference) : '-'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${shift.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {shift.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showOpen} onClose={() => setShowOpen(false)} title="Buka Shift">
        <div className="space-y-4">
          <Input label="Modal Awal" type="number" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={handleOpenShift} disabled={loading} className="flex-1">Buka Shift</Button>
            <Button variant="secondary" onClick={() => setShowOpen(false)} className="flex-1">Batal</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showClose} onClose={() => setShowClose(false)} title="Tutup Shift">
        <div className="space-y-4">
          <Input label="Saldo Akhir" type="number" value={closingBalance} onChange={e => setClosingBalance(e.target.value)} />
          <Input label="Catatan" value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={handleCloseShift} disabled={loading} className="flex-1">Tutup Shift</Button>
            <Button variant="secondary" onClick={() => setShowClose(false)} className="flex-1">Batal</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
