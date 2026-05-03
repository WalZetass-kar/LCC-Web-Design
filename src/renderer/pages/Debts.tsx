import { useState, useEffect } from 'react'
import { DollarSign, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Input from '../components/Input'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'
import { useToast } from '../contexts/ToastContext'

export default function Debts() {
  const toast = useToast()
  const [debts, setDebts] = useState<any[]>([])
  const [filter, setFilter] = useState<'ALL' | 'HUTANG' | 'PIUTANG'>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  // Form state
  const [type, setType] = useState<'HUTANG' | 'PIUTANG'>('HUTANG')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')

  const loadDebts = async () => {
    const r = await api<any[]>('debt:getAll', filter === 'ALL' ? undefined : filter)
    if (r.success) setDebts(r.data ?? [])
  }

  useEffect(() => { loadDebts() }, [filter])

  const handleAddDebt = async () => {
    if (!amount) return toast.error('Masukkan jumlah')
    setLoading(true)
    const r = await api('debt:create', {
      type,
      total_amount: parseFloat(amount),
      due_date: dueDate || null,
      notes
    })
    setLoading(false)
    if (r.success) {
      toast.success('Hutang/Piutang berhasil ditambahkan')
      setShowModal(false)
      setAmount('')
      setDueDate('')
      setNotes('')
      loadDebts()
    } else {
      toast.error(r.error || 'Gagal menambahkan')
    }
  }

  const handlePayment = async () => {
    if (!paymentAmount || !selectedDebt) return toast.error('Masukkan jumlah pembayaran')
    setLoading(true)
    const r = await api('debt:addPayment', selectedDebt.id, {
      amount: parseFloat(paymentAmount),
      payment_method: 'TUNAI',
      created_by: 1
    })
    setLoading(false)
    if (r.success) {
      toast.success('Pembayaran berhasil dicatat')
      setShowPaymentModal(false)
      setPaymentAmount('')
      setSelectedDebt(null)
      loadDebts()
    } else {
      toast.error(r.error || 'Gagal mencatat pembayaran')
    }
  }

  const openPaymentModal = (debt: any) => {
    setSelectedDebt(debt)
    setShowPaymentModal(true)
  }

  const totalHutang = debts.filter(d => d.type === 'HUTANG').reduce((sum, d) => sum + d.remaining_amount, 0)
  const totalPiutang = debts.filter(d => d.type === 'PIUTANG').reduce((sum, d) => sum + d.remaining_amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hutang & Piutang</h1>
          <p className="text-gray-600">Kelola hutang dan piutang</p>
        </div>
        <Button onClick={() => setShowModal(true)} icon={<Plus className="w-4 h-4" />}>Tambah Hutang/Piutang</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-r from-red-500 to-pink-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100">Total Hutang</p>
              <h2 className="text-3xl font-bold mt-2">{formatRupiah(totalHutang)}</h2>
            </div>
            <TrendingDown className="w-12 h-12 text-red-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Total Piutang</p>
              <h2 className="text-3xl font-bold mt-2">{formatRupiah(totalPiutang)}</h2>
            </div>
            <TrendingUp className="w-12 h-12 text-green-200" />
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex gap-2 mb-4">
          <Button size="sm" variant={filter === 'ALL' ? 'primary' : 'secondary'} onClick={() => setFilter('ALL')}>Semua</Button>
          <Button size="sm" variant={filter === 'HUTANG' ? 'primary' : 'secondary'} onClick={() => setFilter('HUTANG')}>Hutang</Button>
          <Button size="sm" variant={filter === 'PIUTANG' ? 'primary' : 'secondary'} onClick={() => setFilter('PIUTANG')}>Piutang</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">No</th>
                <th className="text-left p-3">Tipe</th>
                <th className="text-left p-3">Pihak</th>
                <th className="text-left p-3">Total</th>
                <th className="text-left p-3">Terbayar</th>
                <th className="text-left p-3">Sisa</th>
                <th className="text-left p-3">Jatuh Tempo</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {debts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">
                    Belum ada data hutang/piutang
                  </td>
                </tr>
              ) : (
                debts.map(debt => (
                  <tr key={debt.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono">{debt.debt_number}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${debt.type === 'HUTANG' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {debt.type}
                      </span>
                    </td>
                    <td className="p-3">{debt.customer_name || debt.supplier_name}</td>
                    <td className="p-3">{formatRupiah(debt.total_amount)}</td>
                    <td className="p-3">{formatRupiah(debt.paid_amount)}</td>
                    <td className="p-3 font-semibold">{formatRupiah(debt.remaining_amount)}</td>
                    <td className="p-3">{debt.due_date ? new Date(debt.due_date).toLocaleDateString('id-ID') : '-'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        debt.status === 'PAID' ? 'bg-green-100 text-green-700' :
                        debt.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                        debt.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{debt.status}</span>
                    </td>
                    <td className="p-3">
                      {debt.status !== 'PAID' && (
                        <Button size="sm" variant="primary" onClick={() => openPaymentModal(debt)}>Bayar</Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Tambah Hutang/Piutang */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Tambah Hutang/Piutang">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tipe</label>
            <div className="flex gap-2">
              <Button size="sm" variant={type === 'HUTANG' ? 'primary' : 'secondary'} onClick={() => setType('HUTANG')}>Hutang</Button>
              <Button size="sm" variant={type === 'PIUTANG' ? 'primary' : 'secondary'} onClick={() => setType('PIUTANG')}>Piutang</Button>
            </div>
          </div>
          <Input label="Jumlah" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
          <Input label="Jatuh Tempo" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          <Input label="Catatan" value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={handleAddDebt} disabled={loading} className="flex-1">Simpan</Button>
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Batal</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Pembayaran */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Pembayaran">
        <div className="space-y-4">
          {selectedDebt && (
            <>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Sisa Tagihan</p>
                <p className="text-2xl font-bold text-gray-900">{formatRupiah(selectedDebt.remaining_amount)}</p>
              </div>
              <Input label="Jumlah Bayar" type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={handlePayment} disabled={loading} className="flex-1">Bayar</Button>
                <Button variant="secondary" onClick={() => setShowPaymentModal(false)} className="flex-1">Batal</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
