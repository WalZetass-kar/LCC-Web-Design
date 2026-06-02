import { useEffect, useState } from 'react'
import { Building2, Plus, Edit2, Trash2, Warehouse, Store, ArrowLeftRight } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import { SkeletonPage } from '../components/Skeleton'
import AdvancedInventory from './AdvancedInventory'

interface Branch {
  id: number
  code: string
  name: string
  address: string
  phone: string
  is_warehouse: number
  is_active: number
}

interface BranchStock {
  id: number
  branch_name: string
  nama_barang: string
  kd_barang: string
  jumlah: number
}

interface BranchTransfer {
  id: number
  nama_barang: string
  kd_barang: string
  from_branch: string
  to_branch: string
  qty: number
  created_at: string
}

export default function Branch() {
  const toast = useToast()
  const [branches, setBranches] = useState<Branch[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modal, setModal] = useState<'add' | 'edit' | 'transfer' | null>(null)
  const [selected, setSelected] = useState<Branch | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Branch | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [stockRows, setStockRows] = useState<BranchStock[]>([])
  const [transferRows, setTransferRows] = useState<BranchTransfer[]>([])
  const [form, setForm] = useState({
    code: '',
    name: '',
    address: '',
    phone: '',
    is_warehouse: 0,
    is_active: 1,
  })
  const [transferForm, setTransferForm] = useState({
    from_branch_id: '',
    to_branch_id: '',
    kd_barang: '',
    qty: '',
    notes: '',
  })

  const load = async (isInitial = false) => {
    if (isInitial) setInitialLoading(true)
    else setRefreshing(true)
    const [r, stockRes, transferRes] = await Promise.all([
      api<Branch[]>('branch:getAll'),
      api<BranchStock[]>('branch:getStockSummary'),
      api<BranchTransfer[]>('branch:getTransferHistory', 30),
    ])
    if (r.success) setBranches(r.data ?? [])
    if (stockRes.success) setStockRows(stockRes.data ?? [])
    if (transferRes.success) setTransferRows(transferRes.data ?? [])
    if (isInitial) setInitialLoading(false)
    else setRefreshing(false)
  }

  useEffect(() => { load(true) }, [])

  const resetForm = () => {
    setForm({ code: '', name: '', address: '', phone: '', is_warehouse: 0, is_active: 1 })
  }

  const openAdd = () => {
    resetForm()
    setModal('add')
  }

  const openEdit = (branch: Branch) => {
    setSelected(branch)
    setForm({
      code: branch.code,
      name: branch.name,
      address: branch.address || '',
      phone: branch.phone || '',
      is_warehouse: branch.is_warehouse,
      is_active: branch.is_active,
    })
    setModal('edit')
  }

  const handleSave = async () => {
    if (!form.code || !form.name) {
      return toast('Kode dan nama cabang wajib diisi', 'error')
    }

    setSaving(true)
    if (modal === 'add') {
      const r = await api('branch:create', form)
      setSaving(false)
      if (r.success) {
        toast('Cabang berhasil ditambahkan')
        setModal(null)
        load(false)
      } else {
        toast(r.message as string, 'error')
      }
    } else if (selected) {
      const r = await api('branch:update', selected.id, form)
      setSaving(false)
      if (r.success) {
        toast('Cabang berhasil diperbarui')
        setModal(null)
        load(false)
      } else {
        toast(r.message as string, 'error')
      }
    }
  }

  const handleToggle = async (branch: Branch) => {
    const newStatus = branch.is_active === 1 ? 0 : 1
    const r = await api('branch:update', branch.id, { is_active: newStatus })
    if (r.success) {
      toast(`Cabang ${newStatus === 1 ? 'diaktifkan' : 'dinonaktifkan'}`)
      load(false)
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    const r = await api('branch:delete', deleteConfirm.id)
    setDeleting(false)
    if (r.success) {
      toast('Cabang berhasil dihapus')
      setDeleteConfirm(null)
      load(false)
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleTransfer = async () => {
    if (!transferForm.from_branch_id || !transferForm.to_branch_id || !transferForm.kd_barang || !transferForm.qty) {
      return toast('Mohon lengkapi data transfer', 'error')
    }
    if (transferForm.from_branch_id === transferForm.to_branch_id) {
      return toast('Cabang asal dan tujuan tidak boleh sama', 'error')
    }

    setSaving(true)
    const r = await api('branch:transferStock', 
      parseInt(transferForm.from_branch_id),
      parseInt(transferForm.to_branch_id),
      transferForm.kd_barang,
      parseInt(transferForm.qty),
      transferForm.notes,
      ''
    )
    setSaving(false)
    if (r.success) {
      toast('Transfer stok berhasil')
      setModal(null)
      load(false)
    } else {
      toast(r.message as string, 'error')
    }
  }

  if (initialLoading) return <SkeletonPage rows={5} />

  const outlets = branches.filter(b => !b.is_warehouse)
  const warehouses = branches.filter(b => b.is_warehouse)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="text-primary-500" size={28} />
            Kelola Cabang & Gudang
            {refreshing && <span className="ml-2 h-4 w-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin inline-block" />}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Kelola cabang toko dan gudang</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setModal('transfer')} variant="secondary" icon={<ArrowLeftRight size={16} />} className="w-full sm:w-auto">
            Transfer Stok
          </Button>
          <Button onClick={openAdd} icon={<Plus size={16} />} className="w-full sm:w-auto">
            Tambah Cabang
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-slate-500 text-sm">Total Lokasi</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{branches.length}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-slate-500 text-sm">Cabang Toko</p>
            <p className="text-2xl font-bold text-primary-600 mt-1">{outlets.length}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-slate-500 text-sm">Gudang</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{warehouses.length}</p>
          </div>
        </Card>
      </div>

      {/* Branch List */}
      <Card>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-[700px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Kode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nama</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Alamat</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Tipe</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {branches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
                      Belum ada cabang. Tambahkan cabang pertama Anda!
                    </td>
                  </tr>
                ) : (
                  branches.map(branch => (
                    <tr key={branch.id} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-200">{branch.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{branch.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{branch.address || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        {branch.is_warehouse === 1 ? (
                          <Badge label="Gudang" variant="amber" />
                        ) : (
                          <Badge label="Cabang" variant="blue" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {branch.is_active === 1 ? (
                          <Badge label="Aktif" variant="green" />
                        ) : (
                          <Badge label="Nonaktif" variant="gray" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => handleToggle(branch)}
                            className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-600 text-primary-500 transition-colors"
                            title={branch.is_active === 1 ? 'Nonaktifkan' : 'Aktifkan'}
                          >
                            {branch.is_active === 1 ? <Store size={16} /> : <Building2 size={16} />}
                          </button>
                          <button
                            onClick={() => openEdit(branch)}
                            className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-600 text-primary-500 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(branch)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Saldo Stok per Cabang" subtitle="Saldo ini dipakai untuk transfer antar cabang.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 text-left">
                <tr>
                  <th className="px-3 py-2">Cabang</th>
                  <th>Produk</th>
                  <th className="text-right pr-3">Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stockRows.length === 0 ? (
                  <tr><td colSpan={3} className="py-8 text-center text-slate-400">Belum ada saldo stok cabang</td></tr>
                ) : stockRows.slice(0, 12).map(row => (
                  <tr key={row.id}>
                    <td className="px-3 py-2">{row.branch_name || '-'}</td>
                    <td>{row.nama_barang || row.kd_barang}</td>
                    <td className="text-right pr-3 font-semibold">{row.jumlah}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Histori Transfer Cabang">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 text-left">
                <tr>
                  <th className="px-3 py-2">Produk</th>
                  <th>Dari</th>
                  <th>Ke</th>
                  <th>Qty</th>
                  <th>Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transferRows.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">Belum ada transfer cabang</td></tr>
                ) : transferRows.map(row => (
                  <tr key={row.id}>
                    <td className="px-3 py-2">{row.nama_barang || row.kd_barang}</td>
                    <td>{row.from_branch || '-'}</td>
                    <td>{row.to_branch || '-'}</td>
                    <td>{row.qty}</td>
                    <td className="text-xs text-slate-500">{new Date(row.created_at).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <AdvancedInventory embedded />

      {/* Add/Edit Modal */}
      <Modal
        open={!!modal && modal !== 'transfer'}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Tambah Cabang/Gudang' : 'Edit Cabang/Gudang'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto">Batal</Button>
            <Button onClick={handleSave} loading={saving} className="w-full sm:w-auto">Simpan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Kode *"
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="CBD-001"
            />
            <Input
              label="Nama *"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Cabang Jakarta"
            />
          </div>
          <Input
            label="Alamat"
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
            placeholder="Jl. Merdeka No. 1"
          />
          <Input
            label="Telepon"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            placeholder="021-1234567"
          />
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="is_warehouse"
                checked={form.is_warehouse === 0}
                onChange={() => setForm({ ...form, is_warehouse: 0 })}
                className="w-4 h-4 text-primary-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">Cabang Toko</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="is_warehouse"
                checked={form.is_warehouse === 1}
                onChange={() => setForm({ ...form, is_warehouse: 1 })}
                className="w-4 h-4 text-primary-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">Gudang</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        open={modal === 'transfer'}
        onClose={() => setModal(null)}
        title="Transfer Stok Antar Cabang"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto">Batal</Button>
            <Button onClick={handleTransfer} loading={saving} className="w-full sm:w-auto">Transfer</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Dari Cabang/Gudang *</label>
            <select
              value={transferForm.from_branch_id}
              onChange={e => setTransferForm({ ...transferForm, from_branch_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Pilih asal...</option>
              {branches.filter(b => b.is_active).map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.is_warehouse ? 'Gudang' : 'Cabang'})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Ke Cabang/Gudang *</label>
            <select
              value={transferForm.to_branch_id}
              onChange={e => setTransferForm({ ...transferForm, to_branch_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Pilih tujuan...</option>
              {branches.filter(b => b.is_active && b.id !== parseInt(transferForm.from_branch_id || '0')).map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.is_warehouse ? 'Gudang' : 'Cabang'})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Kode Produk *"
              value={transferForm.kd_barang}
              onChange={e => setTransferForm({ ...transferForm, kd_barang: e.target.value })}
              placeholder="BRG001"
            />
            <Input
              label="Jumlah *"
              type="number"
              value={transferForm.qty}
              onChange={e => setTransferForm({ ...transferForm, qty: e.target.value })}
              placeholder="10"
            />
          </div>
          <Input
            label="Catatan"
            value={transferForm.notes}
            onChange={e => setTransferForm({ ...transferForm, notes: e.target.value })}
            placeholder="Catatan transfer..."
          />
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Hapus Cabang/Gudang"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)} className="w-full sm:w-auto">Batal</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting} className="w-full sm:w-auto">Hapus</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
          Yakin ingin menghapus "{deleteConfirm?.name}"?
        </p>
      </Modal>
    </div>
  )
}
