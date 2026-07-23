import { useState, useEffect } from 'react'
import { ClipboardCheck, Plus, Check, Eye, Trash2, Package } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Input from '../components/Input'
import { TableSkeleton } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

export default function StockOpname() {
  const toast = useToast()
  const { user } = useAuth()
  const [opnames, setOpnames] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [modal, setModal] = useState<'create' | 'detail' | 'input' | 'delete' | 'approve' | null>(null)
  const [selectedOpname, setSelectedOpname] = useState<any>(null)
  const [opnameItems, setOpnameItems] = useState<any[]>([])
  
  // Form state
  const [opnameDate, setOpnameDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  
  // Input stok fisik state
  const [selectedProduct, setSelectedProduct] = useState('')
  const [stokFisik, setStokFisik] = useState('')

  const loadOpnames = async () => {
    try {
      const r = await api<any[]>('opname:getAll')
      if (r.success) {
        const validData = (r.data ?? []).filter(item => item && item.id && item.opname_number)
        setOpnames(validData)
      }
    } finally {
      setLoadingData(false)
    }
  }
  
  const loadProducts = async () => {
    try {
      const r = await api<any[]>('barang:getAll')
      if (r.success) setProducts(r.data ?? [])
    } finally {
    }
  }

  useEffect(() => { 
    loadOpnames()
    loadProducts()
  }, [])

  const handleCreateOpname = async () => {
    if (!opnameDate) return toast('Pilih tanggal opname', 'error')
    setLoading(true)
    const r = await api('opname:create', {
      opname_date: opnameDate,
      notes,
      created_by: user?.nama_pengguna,
      items: []
    })
    setLoading(false)
    if (r.success) {
      toast('Stok opname berhasil dibuat')
      setModal(null)
      setNotes('')
      loadOpnames()
    } else {
      toast(r.message || 'Gagal membuat opname', 'error')
    }
  }
  
  const openDetail = async (opname: any) => {
    setSelectedOpname(opname)
    const r = await api<any[]>('opname:getItems', opname.id)
    if (r.success) setOpnameItems(r.data ?? [])
    setModal('detail')
  }
  
  const openInputStok = (opname: any) => {
    setSelectedOpname(opname)
    setSelectedProduct('')
    setStokFisik('')
    setModal('input')
  }
  
  const handleAddItem = async () => {
    if (!selectedProduct || !stokFisik) return toast('Lengkapi data', 'error')
    const product = products.find(p => p.kd_barang === selectedProduct)
    if (!product) return

    const parsedStok = parseInt(stokFisik, 10)
    if (isNaN(parsedStok) || parsedStok < 0) return toast('Stok fisik harus berupa angka positif', 'error')
    
    setLoading(true)
    const r = await api('opname:addItem', {
      opname_id: selectedOpname.id,
      kd_barang: product.kd_barang,
      stok_sistem: product.stok,
      stok_fisik: parsedStok,
      selisih: parsedStok - (product.stok || 0)
    })
    setLoading(false)
    if (r.success) {
      toast('Item berhasil ditambahkan')
      setSelectedProduct('')
      setStokFisik('')
      loadOpnames()
    } else {
      toast(r.message || 'Gagal menambahkan item', 'error')
    }
  }
  
  const handleDelete = async () => {
    if (!selectedOpname) return
    setLoading(true)
    const r = await api('opname:delete', selectedOpname.id)
    setLoading(false)
    if (r.success) {
      toast('Stok opname berhasil dihapus')
      setModal(null)
      setSelectedOpname(null)
      loadOpnames()
    } else {
      toast(r.message || 'Gagal menghapus', 'error')
    }
  }

  const handleApprove = async () => {
    if (!selectedOpname) return
    setLoading(true)
    const r = await api('opname:approve', selectedOpname.id, user?.nama_pengguna)
    setLoading(false)
    if (r.success) {
      toast('Stok opname berhasil diapprove', 'success')
      setModal(null)
      setSelectedOpname(null)
      loadOpnames()
    } else {
      toast(r.message || 'Gagal approve', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stok Opname</h1>
          <p className="text-gray-600 dark:text-gray-400">Audit dan penyesuaian stok barang</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setModal('create')}>Buat Opname</Button>
      </div>

      <Card>
        {loadingData ? (
          <TableSkeleton rows={5} columns={7} />
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-slate-700">
                <th className="text-left p-3 text-slate-700 dark:text-slate-200">No Opname</th>
                <th className="text-left p-3 text-slate-700 dark:text-slate-200">Tanggal</th>
                <th className="text-left p-3 text-slate-700 dark:text-slate-200">Total Item</th>
                <th className="text-left p-3 text-slate-700 dark:text-slate-200">Total Selisih</th>
                <th className="text-left p-3 text-slate-700 dark:text-slate-200">Dibuat Oleh</th>
                <th className="text-left p-3 text-slate-700 dark:text-slate-200">Status</th>
                <th className="text-left p-3 text-slate-700 dark:text-slate-200">Aksi</th>
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
                  <tr key={opname.id} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="p-3 font-mono text-slate-700 dark:text-slate-200">{opname.opname_number}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-200">{new Date(opname.opname_date).toLocaleDateString('id-ID')}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-200">{opname.total_items || 0}</td>
                    <td className={`p-3 font-semibold ${(opname.total_difference || 0) < 0 ? 'text-red-600' : (opname.total_difference || 0) > 0 ? 'text-green-600' : 'text-slate-500'}`}>
                      {opname.total_difference || 0}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-200">{opname.created_by_name}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        opname.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        opname.status === 'COMPLETED' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>{opname.status}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button onClick={() => openDetail(opname)} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-600 text-primary-500 transition-colors" title="Detail">
                          <Eye size={14} />
                        </button>
                        {opname.status === 'PENDING' && (
                          <>
                            <button onClick={() => openInputStok(opname)} className="p-1.5 rounded-lg hover:bg-pink-50 dark:hover:bg-pink-900/20 text-pink-500 transition-colors" title="Input Stok">
                              <Package size={14} />
                            </button>
                            <button onClick={() => { setSelectedOpname(opname); setModal('approve') }} className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500 transition-colors" title="Approve">
                              <Check size={14} />
                            </button>
                            <button onClick={() => { setSelectedOpname(opname); setModal('delete') }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Hapus">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </Card>

      {/* Modal Buat Opname */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Buat Stok Opname" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto">Batal</Button>
            <Button loading={loading} onClick={handleCreateOpname} className="w-full sm:w-auto">Simpan</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Tanggal Opname *" type="date" value={opnameDate} onChange={e => setOpnameDate(e.target.value)} />
          <Input label="Catatan" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan opname..." />
        </div>
      </Modal>

      {/* Modal Detail */}
      <Modal open={modal === 'detail'} onClose={() => setModal(null)} title={`Detail Opname: ${selectedOpname?.opname_number}`} size="lg">
        {selectedOpname && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-slate-400">Tanggal</p><p className="font-medium text-slate-700 dark:text-slate-200">{new Date(selectedOpname.opname_date).toLocaleDateString('id-ID')}</p></div>
              <div><p className="text-xs text-slate-400">Status</p><span className={`inline-block px-2 py-1 rounded text-xs ${
                selectedOpname.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>{selectedOpname.status}</span></div>
              <div><p className="text-xs text-slate-400">Total Item</p><p className="font-medium text-slate-700 dark:text-slate-200">{selectedOpname.total_items || 0}</p></div>
              <div><p className="text-xs text-slate-400">Total Selisih</p><p className={`font-bold ${(selectedOpname.total_difference || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>{selectedOpname.total_difference || 0}</p></div>
            </div>
            
            {opnameItems.length > 0 ? (
              <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300">Produk</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300">Stok Sistem</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300">Stok Fisik</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300">Selisih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {opnameItems.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{item.nama_barang}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.stok_sistem}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.stok_fisik}</td>
                        <td className={`px-3 py-2 font-semibold ${item.selisih < 0 ? 'text-red-600' : item.selisih > 0 ? 'text-green-600' : 'text-slate-500'}`}>
                          {item.selisih > 0 ? '+' : ''}{item.selisih}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-slate-400 py-8">Belum ada item yang diinput</p>
            )}
            
            {selectedOpname.notes && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-300">
                <span className="font-medium">Catatan: </span>{selectedOpname.notes}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Input Stok Fisik */}
      <Modal open={modal === 'input'} onClose={() => setModal(null)} title="Input Stok Fisik" size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto">Tutup</Button>
            <Button loading={loading} onClick={handleAddItem} className="w-full sm:w-auto">Tambah Item</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-pink-50 dark:bg-pink-900/20 text-sm text-pink-700 dark:text-pink-300">
            <strong>Opname:</strong> {selectedOpname?.opname_number}
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Pilih Produk *</label>
            <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400">
              <option value="">-- Pilih Produk --</option>
              {products.map(p => (
                <option key={p.kd_barang} value={p.kd_barang}>
                  {p.nama_barang} (Stok Sistem: {p.stok || 0})
                </option>
              ))}
            </select>
          </div>
          
          <Input 
            label="Stok Fisik (Hasil Hitung) *" 
            type="number" 
            value={stokFisik} 
            onChange={e => setStokFisik(e.target.value)}
            placeholder="Masukkan jumlah stok fisik"
          />
          
          {selectedProduct && stokFisik && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-500 mb-1">Preview Selisih:</p>
              <p className={`text-lg font-bold ${
                (parseInt(stokFisik) - (products.find(p => p.kd_barang === selectedProduct)?.stok || 0)) < 0 
                  ? 'text-red-600' 
                  : 'text-green-600'
              }`}>
                {(parseInt(stokFisik) - (products.find(p => p.kd_barang === selectedProduct)?.stok || 0)) > 0 ? '+' : ''}
                {parseInt(stokFisik) - (products.find(p => p.kd_barang === selectedProduct)?.stok || 0)}
              </p>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={modal === 'delete'}
        onClose={() => { setModal(null); setSelectedOpname(null) }}
        onConfirm={handleDelete}
        title="Hapus Stok Opname"
        message={`Yakin ingin menghapus stok opname tanggal ${selectedOpname?.opname_date ? new Date(selectedOpname.opname_date).toLocaleDateString('id-ID') : '-'}?`}
        confirmText="Hapus"
        variant="danger"
        loading={loading}
      />

      <ConfirmDialog
        open={modal === 'approve'}
        onClose={() => { setModal(null); setSelectedOpname(null) }}
        onConfirm={handleApprove}
        title="Approve Stok Opname"
        message={`Approve stok opname ini? Stok produk akan diupdate sesuai hasil opname.`}
        confirmText="Approve"
        variant="warning"
        loading={loading}
      />
    </div>
  )
}
