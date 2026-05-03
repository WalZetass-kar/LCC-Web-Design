import { useState, useEffect } from 'react'
import { RotateCcw, Plus, Check, X } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

export default function Returns() {
  const toast = useToast()
  const { user } = useAuth()
  const [returns, setReturns] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Form state
  const [totalAmount, setTotalAmount] = useState('')
  const [refundMethod, setRefundMethod] = useState<'TUNAI' | 'TRANSFER' | 'STORE_CREDIT'>('TUNAI')
  const [reason, setReason] = useState('')

  const loadReturns = async () => {
    const r = await api<any[]>('return:getAll')
    if (r.success) setReturns(r.data ?? [])
  }

  useEffect(() => { loadReturns() }, [])

  const handleCreateReturn = async () => {
    if (!totalAmount) return toast.error('Masukkan total amount')
    setLoading(true)
    const r = await api('return:create', {
      total_amount: parseFloat(totalAmount),
      refund_method: refundMethod,
      reason,
      created_by: user?.id,
      items: []
    })
    setLoading(false)
    if (r.success) {
      toast.success('Return berhasil dibuat')
      setShowModal(false)
      setTotalAmount('')
      setReason('')
      loadReturns()
    } else {
      toast.error(r.error || 'Gagal membuat return')
    }
  }

  const handleApprove = async (id: number) => {
    if (!confirm('Approve return ini?')) return
    setLoading(true)
    const r = await api('return:approve', id, user?.id)
    setLoading(false)
    if (r.success) {
      toast.success('Return berhasil diapprove')
      loadReturns()
    } else {
      toast.error(r.error || 'Gagal approve return')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Return & Refund</h1>
          <p className="text-gray-600">Kelola retur barang dan pengembalian dana</p>
        </div>
        <Button onClick={() => setShowModal(true)} icon={<Plus className="w-4 h-4" />}>Buat Return</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">No Return</th>
                <th className="text-left p-3">Tanggal</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Total</th>
                <th className="text-left p-3">Metode Refund</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {returns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    Belum ada data return
                  </td>
                </tr>
              ) : (
                returns.map(ret => (
                  <tr key={ret.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono">{ret.return_number}</td>
                    <td className="p-3">{new Date(ret.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="p-3">{ret.customer_name || '-'}</td>
                    <td className="p-3 font-semibold">{formatRupiah(ret.total_amount)}</td>
                    <td className="p-3">{ret.refund_method}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        ret.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                        ret.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{ret.status}</span>
                    </td>
                    <td className="p-3">
                      {ret.status === 'PENDING' && (
                        <Button size="sm" onClick={() => handleApprove(ret.id)} disabled={loading}>
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Buat Return */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Buat Return">
        <div className="space-y-4">
          <Input label="Total Amount" type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
          <div>
            <label className="block text-sm font-medium mb-2">Metode Refund</label>
            <div className="flex gap-2">
              <Button size="sm" variant={refundMethod === 'TUNAI' ? 'primary' : 'secondary'} onClick={() => setRefundMethod('TUNAI')}>Tunai</Button>
              <Button size="sm" variant={refundMethod === 'TRANSFER' ? 'primary' : 'secondary'} onClick={() => setRefundMethod('TRANSFER')}>Transfer</Button>
              <Button size="sm" variant={refundMethod === 'STORE_CREDIT' ? 'primary' : 'secondary'} onClick={() => setRefundMethod('STORE_CREDIT')}>Store Credit</Button>
            </div>
          </div>
          <Input label="Alasan" value={reason} onChange={e => setReason(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={handleCreateReturn} disabled={loading} className="flex-1">Simpan</Button>
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Batal</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
