import { useState, useEffect } from 'react'
import { RotateCcw, Plus, Check, X, Eye, Trash2 } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Input from '../components/Input'
import Badge from '../components/Badge'
import { TableSkeleton } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatRupiah, formatDate } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

export default function Returns() {
  const toast = useToast()
  const { user } = useAuth()
  const [returns, setReturns] = useState<any[]>([])
  const [modal, setModal] = useState<'create' | 'detail' | null>(null)
  const [selectedReturn, setSelectedReturn] = useState<any>(null)
  const [deleteReturn, setDeleteReturn] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  
  // Form state
  const [totalAmount, setTotalAmount] = useState('')
  const [refundMethod, setRefundMethod] = useState<'TUNAI' | 'TRANSFER' | 'STORE_CREDIT'>('TUNAI')
  const [reason, setReason] = useState('')

  const loadReturns = async () => {
    const r = await api<any[]>('return:getAll')
    if (r.success) {
      const validData = (r.data ?? []).filter(item => item && item.id)
      setReturns(validData)
    }
    setLoadingData(false)
  }

  useEffect(() => { loadReturns() }, [])

  const handleCreateReturn = async () => {
    if (!totalAmount) return toast('Masukkan total amount', 'error')
    setLoading(true)
    const r = await api('return:create', {
      total_amount: parseFloat(totalAmount),
      refund_method: refundMethod,
      reason,
      created_by: user?.nama_pengguna,
      items: []
    })
    setLoading(false)
    if (r.success) {
      toast('Return berhasil dibuat')
      setModal(null)
      setTotalAmount('')
      setReason('')
      loadReturns()
    } else {
      toast(r.message || 'Gagal membuat return', 'error')
    }
  }

  const handleApprove = async (id: number) => {
    if (!confirm('Approve return ini?')) return
    setLoading(true)
    const r = await api('return:approve', id, user?.nama_pengguna)
    setLoading(false)
    if (r.success) {
      toast('Return berhasil diapprove')
      loadReturns()
    } else {
      toast(r.message || 'Gagal approve return', 'error')
    }
  }
  
  const handleReject = async (id: number) => {
    if (!confirm('Reject return ini?')) return
    setLoading(true)
    const r = await api('return:reject', id, user?.nama_pengguna)
    setLoading(false)
    if (r.success) {
      toast('Return berhasil direject')
      loadReturns()
    } else {
      toast(r.message || 'Gagal reject return', 'error')
    }
  }
  
  const handleDelete = async () => {
    if (!deleteReturn) return
    setLoading(true)
    const r = await api('return:delete', deleteReturn.id)
    setLoading(false)
    if (r.success) {
      toast('Return berhasil dihapus')
      setDeleteReturn(null)
      loadReturns()
    } else {
      toast(r.message || 'Gagal menghapus return', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Return & Refund</h1>
          <p className="text-slate-600 dark:text-slate-400">Kelola retur barang dan pengembalian dana</p>
        </div>
        <Button onClick={() => setModal('create')} icon={<Plus size={16} />} className="w-full sm:w-auto">Buat Return</Button>
      </div>

      <Card title="Daftar Return">
        {loadingData ? (
          <TableSkeleton rows={5} columns={6} />
        ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-[800px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">No Return</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tanggal</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Customer</th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Metode Refund</th>
                  <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                  <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {returns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 sm:px-4 py-10 text-center text-slate-400 text-sm">
                      Belum ada data return
                    </td>
                  </tr>
                ) : (
                  returns.map(ret => (
                    <tr key={ret.id} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-3 sm:px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{ret.return_number}</td>
                      <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{formatDate(ret.created_at)}</td>
                      <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{ret.customer_name || '-'}</td>
                      <td className="px-3 sm:px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">{formatRupiah(ret.total_amount)}</td>
                      <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{ret.refund_method}</td>
                      <td className="px-3 sm:px-4 py-3 text-center">
                        <Badge 
                          label={ret.status} 
                          variant={
                            ret.status === 'APPROVED' ? 'green' :
                            ret.status === 'REJECTED' ? 'red' : 'yellow'
                          } 
                        />
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => { setSelectedReturn(ret); setModal('detail') }} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-600 text-primary-500 transition-colors" title="Detail">
                            <Eye size={14} />
                          </button>
                          {ret.status === 'PENDING' && (
                            <>
                              <button onClick={() => handleApprove(ret.id)} className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 transition-colors" title="Approve">
                                <Check size={14} />
                              </button>
                              <button onClick={() => handleReject(ret.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Reject">
                                <X size={14} />
                              </button>
                            </>
                          )}
                          <button onClick={() => setDeleteReturn(ret)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Hapus">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </Card>

      {/* Modal Buat Return */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Buat Return" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto">Batal</Button>
            <Button loading={loading} onClick={handleCreateReturn} className="w-full sm:w-auto">Simpan</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Total Amount *" type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="0" />
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Metode Refund *</label>
            <div className="flex gap-2">
              {(['TUNAI', 'TRANSFER', 'STORE_CREDIT'] as const).map(m => (
                <button key={m} onClick={() => setRefundMethod(m)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${refundMethod === m ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
                  {m === 'STORE_CREDIT' ? 'Store Credit' : m}
                </button>
              ))}
            </div>
          </div>
          <Input label="Alasan *" value={reason} onChange={e => setReason(e.target.value)} placeholder="Alasan return..." />
        </div>
      </Modal>

      {/* Modal Detail */}
      <Modal open={modal === 'detail'} onClose={() => setModal(null)} title={`Detail Return: ${selectedReturn?.return_number}`} size="md">
        {selectedReturn && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-slate-400">Tanggal</p><p className="font-medium text-slate-700 dark:text-slate-200">{formatDate(selectedReturn.created_at)}</p></div>
              <div><p className="text-xs text-slate-400">Status</p><Badge label={selectedReturn.status} variant={selectedReturn.status === 'APPROVED' ? 'green' : selectedReturn.status === 'REJECTED' ? 'red' : 'yellow'} /></div>
              <div><p className="text-xs text-slate-400">Customer</p><p className="font-medium text-slate-700 dark:text-slate-200">{selectedReturn.customer_name || '-'}</p></div>
              <div><p className="text-xs text-slate-400">Metode Refund</p><p className="font-medium text-slate-700 dark:text-slate-200">{selectedReturn.refund_method}</p></div>
            </div>
            
            <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
              <div className="flex justify-between text-lg">
                <span className="font-bold text-slate-700 dark:text-slate-200">Total Amount</span>
                <span className="font-bold text-primary-600 dark:text-primary-400">{formatRupiah(selectedReturn.total_amount)}</span>
              </div>
            </div>
            
            {selectedReturn.reason && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-300">
                <span className="font-medium">Alasan: </span>{selectedReturn.reason}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Delete */}
      <Modal open={!!deleteReturn} onClose={() => setDeleteReturn(null)} title="Hapus Return" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteReturn(null)} className="w-full sm:w-auto">Batal</Button>
            <Button variant="danger" loading={loading} onClick={handleDelete} className="w-full sm:w-auto">Hapus</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">Yakin ingin menghapus return ini?</p>
        {deleteReturn && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">No Return:</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{deleteReturn.return_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(deleteReturn.total_amount)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
