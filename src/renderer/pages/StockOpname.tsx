import { useState, useEffect } from 'react'
import { ClipboardCheck, Plus, Check } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Input from '../components/Input'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

export default function StockOpname() {
  const toast = useToast()
  const { user } = useAuth()
  const [opnames, setOpnames] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  
  // Form state
  const [opnameDate, setOpnameDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  const loadOpnames = async () => {
    const r = await api<any[]>('opname:getAll')
    if (r.success) setOpnames(r.data ?? [])
  }

  useEffect(() => { loadOpnames() }, [])

  const handleCreateOpname = async () => {
    if (!opnameDate) return toast.error('Pilih tanggal opname')
    setLoading(true)
    const r = await api('opname:create', {
      opname_date: opnameDate,
      notes,
      created_by: user?.nama_pengguna,
      items: []
    })
    setLoading(false)
    if (r.success) {
      toast.success('Stok opname berhasil dibuat')
      setShowModal(false)
      setNotes('')
      loadOpnames()
    } else {
      toast.error(r.error || 'Gagal membuat opname')
    }
  }

  const handleApprove = async (id: number) => {
    if (!confirm('Approve stok opname ini? Stok akan diupdate sesuai hasil opname.')) return
    setLoading(true)
    const r = await api('opname:approve', id, user?.id)
    setLoading(false)
    if (r.success) {
      toast.success('Stok opname berhasil diapprove')
      loadOpnames()
    } else {
      toast.error(r.error || 'Gagal approve')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stok Opname</h1>
          <p className="text-gray-600">Audit dan penyesuaian stok barang</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>Buat Opname</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">No Opname</th>
                <th className="text-left p-3">Tanggal</th>
                <th className="text-left p-3">Total Item</th>
                <th className="text-left p-3">Total Selisih</th>
                <th className="text-left p-3">Dibuat Oleh</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {opnames.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    Belum ada data stok opname
                  </td>
                </tr>
              ) : (
                opnames.map(opname => (
                  <tr key={opname.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono">{opname.opname_number}</td>
                    <td className="p-3">{new Date(opname.opname_date).toLocaleDateString('id-ID')}</td>
                    <td className="p-3">{opname.total_items}</td>
                    <td className="p-3 font-semibold">{opname.total_difference}</td>
                    <td className="p-3">{opname.created_by_name}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        opname.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                        opname.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{opname.status}</span>
                    </td>
                    <td className="p-3">
                      {opname.status === 'COMPLETED' && (
                        <Button size="sm" onClick={() => handleApprove(opname.id)} disabled={loading}>
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

      {/* Modal Buat Opname */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Buat Stok Opname">
        <div className="space-y-4">
          <Input label="Tanggal Opname" type="date" value={opnameDate} onChange={e => setOpnameDate(e.target.value)} />
          <Input label="Catatan" value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={handleCreateOpname} disabled={loading} className="flex-1">Simpan</Button>
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Batal</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
