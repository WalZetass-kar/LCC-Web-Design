import { useState, useEffect } from 'react'
import { DollarSign, Plus, TrendingUp, TrendingDown, Eye, Trash2 } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Input from '../components/Input'
import Badge from '../components/Badge'
import { SkeletonPage } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatRupiah, formatDate } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

export default function Debts() {
  const toast = useToast()
  const { user } = useAuth()
  const [debts, setDebts] = useState<any[]>([])
  const [filter, setFilter] = useState<'ALL' | 'HUTANG' | 'PIUTANG'>('ALL')
  const [modal, setModal] = useState<'add' | 'payment' | 'detail' | null>(null)
  const [selectedDebt, setSelectedDebt] = useState<any>(null)
  const [deleteDebt, setDeleteDebt] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  
  // Form state
  const [type, setType] = useState<'HUTANG' | 'PIUTANG'>('HUTANG')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')

  const loadDebts = async () => {
    const r = await api<any[]>('debt:getAll', filter === 'ALL' ? undefined : filter)
    if (r.success) {
      const validData = (r.data ?? []).filter(item => item && item.id)
      setDebts(validData)
    }
    setLoadingData(false)
  }

  useEffect(() => { loadDebts() }, [filter])

  const handleAddDebt = async () => {
    if (!amount) return toast('Masukkan jumlah', 'error')
    setLoading(true)
    const r = await api('debt:create', {
      type,
      total_amount: parseFloat(amount),
      due_date: dueDate || null,
      notes
    })
    setLoading(false)
    if (r.success) {
      toast('Hutang/Piutang berhasil ditambahkan')
      setModal(null)
      setAmount('')
      setDueDate('')
      setNotes('')
      loadDebts()
    } else {
      toast(r.message || 'Gagal menambahkan', 'error')
    }
  }

  const handlePayment = async () => {
    if (!paymentAmount || !selectedDebt) return toast('Masukkan jumlah pembayaran', 'error')
    setLoading(true)
    const r = await api('debt:addPayment', selectedDebt.id, {
      amount: parseFloat(paymentAmount),
      payment_method: 'TUNAI',
      created_by: user?.nama_pengguna
    })
    setLoading(false)
    if (r.success) {
      toast('Pembayaran berhasil dicatat')
      setModal(null)
      setPaymentAmount('')
      setSelectedDebt(null)
      loadDebts()
    } else {
      toast(r.message || 'Gagal mencatat pembayaran', 'error')
    }
  }

  const openPaymentModal = (debt: any) => {
    setSelectedDebt(debt)
    setModal('payment')
  }
  
  const handleDelete = async () => {
    if (!deleteDebt) return
    setLoading(true)
    const r = await api('debt:delete', deleteDebt.id)
    setLoading(false)
    if (r.success) {
      toast('Hutang/Piutang berhasil dihapus')
      setDeleteDebt(null)
      loadDebts()
    } else {
      toast(r.message || 'Gagal menghapus', 'error')
    }
  }

  const totalHutang = debts.filter(d => d.type === 'HUTANG').reduce((sum, d) => sum + d.remaining_amount, 0)
  const totalPiutang = debts.filter(d => d.type === 'PIUTANG').reduce((sum, d) => sum + d.remaining_amount, 0)

  return (
    <div className="space-y-4">
      {loadingData ? (
        <SkeletonPage rows={5} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Hutang &amp; Piutang</h1>
              <p className="text-slate-600 dark:text-slate-400">Kelola hutang dan piutang</p>
            </div>
            <Button onClick={() => setModal('add')} icon={<Plus size={16} />} className="w-full sm:w-auto">Tambah Hutang/Piutang</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-r from-red-500 to-pink-600 border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Total Hutang</p>
              <h2 className="text-3xl font-bold text-white mt-2">{formatRupiah(totalHutang)}</h2>
            </div>
            <TrendingDown className="w-12 h-12 text-red-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-emerald-600 border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Piutang</p>
              <h2 className="text-3xl font-bold text-white mt-2">{formatRupiah(totalPiutang)}</h2>
            </div>
            <TrendingUp className="w-12 h-12 text-green-200" />
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex gap-2 mb-4">
          {(['ALL', 'HUTANG', 'PIUTANG'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? 'bg-primary-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
              {f === 'ALL' ? 'Semua' : f}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-[900px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">No</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tipe</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Pihak</th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total</th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Terbayar</th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Sisa</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Jatuh Tempo</th>
                  <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                  <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {debts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 sm:px-4 py-10 text-center text-slate-400 text-sm">
                      Belum ada data hutang/piutang
                    </td>
                  </tr>
                ) : (
                  debts.map(debt => (
                    <tr key={debt.id} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-3 sm:px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{debt.debt_number}</td>
                      <td className="px-3 sm:px-4 py-3">
                        <Badge label={debt.type} variant={debt.type === 'HUTANG' ? 'red' : 'green'} />
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{debt.customer_name || debt.supplier_name || '-'}</td>
                      <td className="px-3 sm:px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatRupiah(debt.total_amount)}</td>
                      <td className="px-3 sm:px-4 py-3 text-right text-emerald-600">{formatRupiah(debt.paid_amount || 0)}</td>
                      <td className="px-3 sm:px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">{formatRupiah(debt.remaining_amount)}</td>
                      <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{debt.due_date ? formatDate(debt.due_date) : '-'}</td>
                      <td className="px-3 sm:px-4 py-3 text-center">
                        <Badge 
                          label={debt.status} 
                          variant={
                            debt.status === 'PAID' ? 'green' :
                            debt.status === 'OVERDUE' ? 'red' :
                            debt.status === 'PARTIAL' ? 'yellow' : 'blue'
                          } 
                        />
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => { setSelectedDebt(debt); setModal('detail') }} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-600 text-primary-500 transition-colors" title="Detail">
                            <Eye size={14} />
                          </button>
                          {debt.status !== 'PAID' && (
                            <button onClick={() => openPaymentModal(debt)} className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 transition-colors" title="Bayar">
                              <DollarSign size={14} />
                            </button>
                          )}
                          <button onClick={() => setDeleteDebt(debt)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Hapus">
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
      </Card>

        </>
      )}

      {/* Modal Tambah Hutang/Piutang */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Tambah Hutang/Piutang" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto">Batal</Button>
            <Button loading={loading} onClick={handleAddDebt} className="w-full sm:w-auto">Simpan</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Tipe *</label>
            <div className="flex gap-2">
              {(['HUTANG', 'PIUTANG'] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${type === t ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Input label="Jumlah *" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
          <Input label="Jatuh Tempo" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          <Input label="Catatan" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan..." />
        </div>
      </Modal>

      {/* Modal Pembayaran */}
      <Modal open={modal === 'payment'} onClose={() => setModal(null)} title="Pembayaran" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto">Batal</Button>
            <Button loading={loading} onClick={handlePayment} className="w-full sm:w-auto">Bayar</Button>
          </>
        }
      >
        {selectedDebt && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">Sisa Tagihan</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatRupiah(selectedDebt.remaining_amount)}</p>
            </div>
            <Input label="Jumlah Bayar *" type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0" />
          </div>
        )}
      </Modal>

      {/* Modal Detail */}
      <Modal open={modal === 'detail'} onClose={() => setModal(null)} title={`Detail ${selectedDebt?.type}: ${selectedDebt?.debt_number}`} size="md">
        {selectedDebt && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-slate-400">Tipe</p><Badge label={selectedDebt.type} variant={selectedDebt.type === 'HUTANG' ? 'red' : 'green'} /></div>
              <div><p className="text-xs text-slate-400">Status</p><Badge label={selectedDebt.status} variant={selectedDebt.status === 'PAID' ? 'green' : selectedDebt.status === 'OVERDUE' ? 'red' : 'yellow'} /></div>
              <div><p className="text-xs text-slate-400">Pihak</p><p className="font-medium text-slate-700 dark:text-slate-200">{selectedDebt.customer_name || selectedDebt.supplier_name || '-'}</p></div>
              <div><p className="text-xs text-slate-400">Jatuh Tempo</p><p className="font-medium text-slate-700 dark:text-slate-200">{selectedDebt.due_date ? formatDate(selectedDebt.due_date) : '-'}</p></div>
            </div>
            
            <div className="border-t border-slate-100 dark:border-slate-700 pt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-semibold text-slate-700 dark:text-slate-200">{formatRupiah(selectedDebt.total_amount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Terbayar</span><span className="font-semibold text-emerald-600">{formatRupiah(selectedDebt.paid_amount || 0)}</span></div>
              <div className="flex justify-between text-base"><span className="font-bold">Sisa</span><span className="font-bold text-red-600">{formatRupiah(selectedDebt.remaining_amount)}</span></div>
            </div>
            
            {selectedDebt.notes && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-300">
                <span className="font-medium">Catatan: </span>{selectedDebt.notes}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Delete */}
      <Modal open={!!deleteDebt} onClose={() => setDeleteDebt(null)} title="Hapus Hutang/Piutang" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteDebt(null)} className="w-full sm:w-auto">Batal</Button>
            <Button variant="danger" loading={loading} onClick={handleDelete} className="w-full sm:w-auto">Hapus</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">Yakin ingin menghapus data ini?</p>
        {deleteDebt && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">No:</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{deleteDebt.debt_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tipe:</span>
              <Badge label={deleteDebt.type} variant={deleteDebt.type === 'HUTANG' ? 'red' : 'green'} />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Sisa:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(deleteDebt.remaining_amount)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
