import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeftRight, Boxes, Edit2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'

interface Warehouse { id: number; name: string; location?: string; is_active?: number }
interface StockRow { id: number; warehouse_name: string; kd_barang: string; nama_barang: string; qty: number; global_stock: number }
interface TransferRow { id: number; kd_barang: string; nama_barang: string; from_warehouse: string; to_warehouse: string; qty: number; created_at: string }
interface BatchRow { id: number; kd_barang: string; batch_no: string; stok: number; expired_date?: string | null; warehouse_id?: number | null; warehouse_name?: string | null }
interface SerialRow { id: number; kd_barang: string; serial_no: string; status?: string | null; warehouse_id?: number | null; warehouse_name?: string | null }

export default function AdvancedInventory({ embedded = false }: { embedded?: boolean }) {
  const toast = useToast()
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [batches, setBatches] = useState<BatchRow[]>([])
  const [serials, setSerials] = useState<SerialRow[]>([])
  const [stock, setStock] = useState<StockRow[]>([])
  const [transfers, setTransfers] = useState<TransferRow[]>([])
  const [warehouseForm, setWarehouseForm] = useState({ name: '', location: '' })
  const [batchForm, setBatchForm] = useState({ kd_barang: '', batch_no: '', stok: '', expired_date: '', warehouse_id: '' })
  const [serialForm, setSerialForm] = useState({ kd_barang: '', serial_no: '', warehouse_id: '' })
  const [transferForm, setTransferForm] = useState({ kd_barang: '', from_warehouse_id: '', to_warehouse_id: '', qty: '' })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [editWarehouse, setEditWarehouse] = useState<Warehouse | null>(null)
  const [editWarehouseForm, setEditWarehouseForm] = useState({ name: '', location: '' })
  const [editBatch, setEditBatch] = useState<BatchRow | null>(null)
  const [editBatchForm, setEditBatchForm] = useState({ kd_barang: '', batch_no: '', stok: '', expired_date: '', warehouse_id: '' })
  const [editSerial, setEditSerial] = useState<SerialRow | null>(null)
  const [editSerialForm, setEditSerialForm] = useState({ kd_barang: '', serial_no: '', status: 'AVAILABLE', warehouse_id: '' })
  const [deleteWarehouse, setDeleteWarehouse] = useState<Warehouse | null>(null)
  const [deleteBatch, setDeleteBatch] = useState<BatchRow | null>(null)
  const [deleteSerial, setDeleteSerial] = useState<SerialRow | null>(null)

  const load = async () => {
    setLoading(true)
    const [wh, batchRows, serialRows, st, tr] = await Promise.all([
      api<Warehouse[]>('warehouse:getAll'),
      api<BatchRow[]>('inventory:getBatches'),
      api<SerialRow[]>('inventory:getSerials'),
      api<StockRow[]>('inventory:getWarehouseStock'),
      api<TransferRow[]>('inventory:getTransfers', 30),
    ])
    if (wh.success) setWarehouses(wh.data ?? [])
    if (batchRows.success) setBatches(batchRows.data ?? [])
    if (serialRows.success) setSerials(serialRows.data ?? [])
    if (st.success) setStock(st.data ?? [])
    if (tr.success) setTransfers(tr.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const addWarehouse = async () => {
    if (!warehouseForm.name.trim()) return toast('Nama gudang wajib diisi', 'error')
    setActionLoading(true)
    const r = await api('warehouse:create', warehouseForm)
    setActionLoading(false)
    if (r.success) {
      toast('Gudang ditambahkan')
      setWarehouseForm({ name: '', location: '' })
      load()
    } else toast(r.message as string, 'error')
  }

  const addBatch = async () => {
    if (!batchForm.kd_barang || !batchForm.batch_no || !batchForm.stok) return toast('Kode produk, batch, dan qty wajib diisi', 'error')
    setActionLoading(true)
    const r = await api('inventory:addBatch', { ...batchForm, stok: Number(batchForm.stok), warehouse_id: Number(batchForm.warehouse_id || 1) })
    setActionLoading(false)
    if (r.success) {
      toast('Batch ditambahkan')
      setBatchForm({ kd_barang: '', batch_no: '', stok: '', expired_date: '', warehouse_id: '' })
      load()
    } else toast(r.message as string, 'error')
  }

  const addSerial = async () => {
    if (!serialForm.kd_barang || !serialForm.serial_no) return toast('Kode produk dan serial wajib diisi', 'error')
    setActionLoading(true)
    const r = await api('inventory:addSerial', { ...serialForm, warehouse_id: Number(serialForm.warehouse_id || 1) })
    setActionLoading(false)
    if (r.success) {
      toast('Serial ditambahkan')
      setSerialForm({ kd_barang: '', serial_no: '', warehouse_id: '' })
      load()
    } else toast(r.message as string, 'error')
  }

  const transfer = async () => {
    if (!transferForm.kd_barang || !transferForm.from_warehouse_id || !transferForm.to_warehouse_id || !transferForm.qty) {
      return toast('Kode produk, gudang asal, gudang tujuan, dan qty wajib diisi', 'error')
    }
    if (transferForm.from_warehouse_id === transferForm.to_warehouse_id) {
      return toast('Gudang asal dan tujuan tidak boleh sama', 'error')
    }
    setActionLoading(true)
    const r = await api('inventory:transfer', {
      ...transferForm,
      qty: Number(transferForm.qty),
      from_warehouse_id: Number(transferForm.from_warehouse_id),
      to_warehouse_id: Number(transferForm.to_warehouse_id),
    })
    setActionLoading(false)
    if (r.success) {
      toast('Transfer stok gudang berhasil')
      setTransferForm({ kd_barang: '', from_warehouse_id: '', to_warehouse_id: '', qty: '' })
      load()
    } else toast(r.message as string, 'error')
  }

  const openEditWarehouse = (row: Warehouse) => {
    setEditWarehouse(row)
    setEditWarehouseForm({ name: row.name ?? '', location: row.location ?? '' })
  }

  const openEditBatch = (row: BatchRow) => {
    setEditBatch(row)
    setEditBatchForm({
      kd_barang: row.kd_barang ?? '',
      batch_no: row.batch_no ?? '',
      stok: String(row.stok ?? 0),
      expired_date: row.expired_date ? row.expired_date.slice(0, 10) : '',
      warehouse_id: row.warehouse_id ? String(row.warehouse_id) : '',
    })
  }

  const openEditSerial = (row: SerialRow) => {
    setEditSerial(row)
    setEditSerialForm({
      kd_barang: row.kd_barang ?? '',
      serial_no: row.serial_no ?? '',
      status: row.status ?? 'AVAILABLE',
      warehouse_id: row.warehouse_id ? String(row.warehouse_id) : '',
    })
  }

  const saveWarehouse = async () => {
    if (!editWarehouse) return
    if (!editWarehouseForm.name.trim()) return toast('Nama gudang wajib diisi', 'error')
    setActionLoading(true)
    const r = await api('warehouse:update', editWarehouse.id, editWarehouseForm)
    setActionLoading(false)
    if (r.success) {
      toast(r.message || 'Gudang diperbarui')
      setEditWarehouse(null)
      load()
    } else toast(r.message as string, 'error')
  }

  const saveBatch = async () => {
    if (!editBatch) return
    if (!editBatchForm.kd_barang || !editBatchForm.batch_no || !editBatchForm.stok) return toast('Kode produk, batch, dan qty wajib diisi', 'error')
    setActionLoading(true)
    const r = await api('inventory:updateBatch', editBatch.id, {
      ...editBatchForm,
      stok: Number(editBatchForm.stok),
      warehouse_id: Number(editBatchForm.warehouse_id || 1),
    })
    setActionLoading(false)
    if (r.success) {
      toast(r.message || 'Batch diperbarui')
      setEditBatch(null)
      load()
    } else toast(r.message as string, 'error')
  }

  const saveSerial = async () => {
    if (!editSerial) return
    if (!editSerialForm.kd_barang || !editSerialForm.serial_no) return toast('Kode produk dan serial wajib diisi', 'error')
    setActionLoading(true)
    const r = await api('inventory:updateSerial', editSerial.id, {
      ...editSerialForm,
      warehouse_id: Number(editSerialForm.warehouse_id || 1),
    })
    setActionLoading(false)
    if (r.success) {
      toast(r.message || 'Serial diperbarui')
      setEditSerial(null)
      load()
    } else toast(r.message as string, 'error')
  }

  const confirmDeleteWarehouse = async () => {
    if (!deleteWarehouse) return
    setActionLoading(true)
    const r = await api('warehouse:delete', deleteWarehouse.id)
    setActionLoading(false)
    if (r.success) {
      toast(r.message || 'Gudang dihapus')
      setDeleteWarehouse(null)
      load()
    } else toast(r.message as string, 'error')
  }

  const confirmDeleteBatch = async () => {
    if (!deleteBatch) return
    setActionLoading(true)
    const r = await api('inventory:deleteBatch', deleteBatch.id)
    setActionLoading(false)
    if (r.success) {
      toast(r.message || 'Batch dihapus')
      setDeleteBatch(null)
      load()
    } else toast(r.message as string, 'error')
  }

  const confirmDeleteSerial = async () => {
    if (!deleteSerial) return
    setActionLoading(true)
    const r = await api('inventory:deleteSerial', deleteSerial.id)
    setActionLoading(false)
    if (r.success) {
      toast(r.message || 'Serial dihapus')
      setDeleteSerial(null)
      load()
    } else toast(r.message as string, 'error')
  }

  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Boxes className="text-primary-500" size={28} />
              Inventaris Lanjutan
            </h1>
            <p className="text-sm text-slate-500">Batch, serial number, stok gudang, dan transfer antar gudang.</p>
          </div>
          <Button variant="secondary" onClick={load} loading={loading} icon={<RefreshCw size={16} />}>Refresh</Button>
        </div>
      )}

      {embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Boxes className="text-primary-500" size={24} />
              Inventaris Gudang
            </h2>
            <p className="text-sm text-slate-500">Batch, serial number, saldo stok gudang, dan transfer gudang.</p>
          </div>
          <Button variant="secondary" onClick={load} loading={loading} icon={<RefreshCw size={16} />}>Refresh Inventaris</Button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Tambah Gudang">
          <div className="space-y-3">
            <Input label="Nama" value={warehouseForm.name} onChange={e => setWarehouseForm({ ...warehouseForm, name: e.target.value })} />
            <Input label="Lokasi" value={warehouseForm.location} onChange={e => setWarehouseForm({ ...warehouseForm, location: e.target.value })} />
            <Button onClick={addWarehouse} loading={actionLoading} icon={<Plus size={16} />} className="w-full">Tambah</Button>
          </div>
        </Card>
        <Card title="Tambah Batch">
          <div className="space-y-3">
            <Input label="Kode Produk" value={batchForm.kd_barang} onChange={e => setBatchForm({ ...batchForm, kd_barang: e.target.value })} />
            <Input label="Batch No" value={batchForm.batch_no} onChange={e => setBatchForm({ ...batchForm, batch_no: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Qty" type="number" value={batchForm.stok} onChange={e => setBatchForm({ ...batchForm, stok: e.target.value })} />
              <Input label="Expired" type="date" value={batchForm.expired_date} onChange={e => setBatchForm({ ...batchForm, expired_date: e.target.value })} />
            </div>
            <WarehouseSelect value={batchForm.warehouse_id} warehouses={warehouses} onChange={v => setBatchForm({ ...batchForm, warehouse_id: v })} />
            <Button onClick={addBatch} loading={actionLoading} className="w-full">Simpan Batch</Button>
          </div>
        </Card>
        <Card title="Tambah Serial">
          <div className="space-y-3">
            <Input label="Kode Produk" value={serialForm.kd_barang} onChange={e => setSerialForm({ ...serialForm, kd_barang: e.target.value })} />
            <Input label="Serial No" value={serialForm.serial_no} onChange={e => setSerialForm({ ...serialForm, serial_no: e.target.value })} />
            <WarehouseSelect value={serialForm.warehouse_id} warehouses={warehouses} onChange={v => setSerialForm({ ...serialForm, warehouse_id: v })} />
            <Button onClick={addSerial} loading={actionLoading} className="w-full">Simpan Serial</Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Daftar Gudang" subtitle="Gudang yang sudah ditambahkan akan muncul di sini.">
          <Table headers={['Nama', 'Lokasi', 'Aksi']} empty={loading ? 'Memuat daftar gudang' : 'Belum ada gudang'}>
            {warehouses.map(row => (
              <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-100">{row.name}</td>
                <td className="text-slate-600 dark:text-slate-300">{row.location || '-'}</td>
                <td className="pr-3">
                  <RowActions
                    onEdit={() => openEditWarehouse(row)}
                    onDelete={() => setDeleteWarehouse(row)}
                  />
                </td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card title="Batch Tersimpan">
          <Table headers={['Batch', 'Produk', 'Qty', 'Aksi']} empty={loading ? 'Memuat batch' : 'Belum ada batch'}>
            {batches.map(row => (
              <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <td className="px-3 py-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{row.batch_no}</p>
                  <p className="text-[11px] text-slate-400">{row.warehouse_name || 'Gudang belum dipilih'}</p>
                </td>
                <td className="font-mono text-xs text-slate-600 dark:text-slate-300">{row.kd_barang}</td>
                <td><Badge label={String(row.stok ?? 0)} variant={(row.stok ?? 0) > 0 ? 'green' : 'gray'} /></td>
                <td className="pr-3">
                  <RowActions
                    onEdit={() => openEditBatch(row)}
                    onDelete={() => setDeleteBatch(row)}
                  />
                </td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card title="Serial Tersimpan">
          <Table headers={['Serial', 'Produk', 'Status', 'Aksi']} empty={loading ? 'Memuat serial' : 'Belum ada serial'}>
            {serials.map(row => (
              <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <td className="px-3 py-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{row.serial_no}</p>
                  <p className="text-[11px] text-slate-400">{row.warehouse_name || 'Gudang belum dipilih'}</p>
                </td>
                <td className="font-mono text-xs text-slate-600 dark:text-slate-300">{row.kd_barang}</td>
                <td><Badge label={row.status || 'AVAILABLE'} variant={row.status === 'SOLD' ? 'amber' : 'green'} /></td>
                <td className="pr-3">
                  <RowActions
                    onEdit={() => openEditSerial(row)}
                    onDelete={() => setDeleteSerial(row)}
                  />
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      <Card title="Transfer Antar Gudang">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Input label="Kode Produk" value={transferForm.kd_barang} onChange={e => setTransferForm({ ...transferForm, kd_barang: e.target.value })} />
          <WarehouseSelect label="Dari" value={transferForm.from_warehouse_id} warehouses={warehouses} onChange={v => setTransferForm({ ...transferForm, from_warehouse_id: v })} />
          <WarehouseSelect label="Ke" value={transferForm.to_warehouse_id} warehouses={warehouses} onChange={v => setTransferForm({ ...transferForm, to_warehouse_id: v })} />
          <Input label="Qty" type="number" value={transferForm.qty} onChange={e => setTransferForm({ ...transferForm, qty: e.target.value })} />
          <div className="flex items-end"><Button onClick={transfer} loading={actionLoading} icon={<ArrowLeftRight size={16} />} className="w-full">Transfer</Button></div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Saldo Stok Gudang">
          <Table headers={['Gudang', 'Produk', 'Qty', 'Stok Global']} empty="Belum ada saldo gudang">
            {stock.map(row => (
              <tr key={row.id}>
                <td className="px-3 py-2">{row.warehouse_name || '-'}</td>
                <td>{row.nama_barang || row.kd_barang}</td>
                <td><Badge label={String(row.qty)} variant={row.qty > 0 ? 'green' : 'gray'} /></td>
                <td>{row.global_stock ?? 0}</td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Histori Transfer">
          <Table headers={['Produk', 'Dari', 'Ke', 'Qty', 'Tanggal']} empty="Belum ada transfer">
            {transfers.map(row => (
              <tr key={row.id}>
                <td className="px-3 py-2">{row.nama_barang || row.kd_barang}</td>
                <td>{row.from_warehouse || '-'}</td>
                <td>{row.to_warehouse || '-'}</td>
                <td>{row.qty}</td>
                <td className="text-xs text-slate-500">{new Date(row.created_at).toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      <Modal
        open={!!editWarehouse}
        onClose={() => setEditWarehouse(null)}
        title="Edit Gudang"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditWarehouse(null)} className="w-full sm:w-auto">Batal</Button>
            <Button onClick={saveWarehouse} loading={actionLoading} className="w-full sm:w-auto">Simpan</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Nama Gudang" value={editWarehouseForm.name} onChange={e => setEditWarehouseForm({ ...editWarehouseForm, name: e.target.value })} />
          <Input label="Lokasi" value={editWarehouseForm.location} onChange={e => setEditWarehouseForm({ ...editWarehouseForm, location: e.target.value })} />
        </div>
      </Modal>

      <Modal
        open={!!editBatch}
        onClose={() => setEditBatch(null)}
        title="Edit Batch"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditBatch(null)} className="w-full sm:w-auto">Batal</Button>
            <Button onClick={saveBatch} loading={actionLoading} className="w-full sm:w-auto">Simpan</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Kode Produk" value={editBatchForm.kd_barang} onChange={e => setEditBatchForm({ ...editBatchForm, kd_barang: e.target.value })} />
          <Input label="Batch No" value={editBatchForm.batch_no} onChange={e => setEditBatchForm({ ...editBatchForm, batch_no: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Qty" type="number" value={editBatchForm.stok} onChange={e => setEditBatchForm({ ...editBatchForm, stok: e.target.value })} />
            <Input label="Expired" type="date" value={editBatchForm.expired_date} onChange={e => setEditBatchForm({ ...editBatchForm, expired_date: e.target.value })} />
          </div>
          <WarehouseSelect value={editBatchForm.warehouse_id} warehouses={warehouses} onChange={v => setEditBatchForm({ ...editBatchForm, warehouse_id: v })} />
        </div>
      </Modal>

      <Modal
        open={!!editSerial}
        onClose={() => setEditSerial(null)}
        title="Edit Serial"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditSerial(null)} className="w-full sm:w-auto">Batal</Button>
            <Button onClick={saveSerial} loading={actionLoading} className="w-full sm:w-auto">Simpan</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Kode Produk" value={editSerialForm.kd_barang} onChange={e => setEditSerialForm({ ...editSerialForm, kd_barang: e.target.value })} />
          <Input label="Serial No" value={editSerialForm.serial_no} onChange={e => setEditSerialForm({ ...editSerialForm, serial_no: e.target.value })} />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status</span>
            <select
              value={editSerialForm.status}
              onChange={e => setEditSerialForm({ ...editSerialForm, status: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="SOLD">SOLD</option>
              <option value="RETURNED">RETURNED</option>
            </select>
          </label>
          <WarehouseSelect value={editSerialForm.warehouse_id} warehouses={warehouses} onChange={v => setEditSerialForm({ ...editSerialForm, warehouse_id: v })} />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteWarehouse}
        onClose={() => setDeleteWarehouse(null)}
        onConfirm={confirmDeleteWarehouse}
        title="Hapus Gudang"
        message={`Gudang "${deleteWarehouse?.name ?? ''}" akan dihapus.`}
        confirmText="Hapus"
        variant="danger"
        loading={actionLoading}
      />

      <ConfirmDialog
        open={!!deleteBatch}
        onClose={() => setDeleteBatch(null)}
        onConfirm={confirmDeleteBatch}
        title="Hapus Batch"
        message={`Batch "${deleteBatch?.batch_no ?? ''}" akan dihapus dan stoknya dikurangi.`}
        confirmText="Hapus"
        variant="danger"
        loading={actionLoading}
      />

      <ConfirmDialog
        open={!!deleteSerial}
        onClose={() => setDeleteSerial(null)}
        onConfirm={confirmDeleteSerial}
        title="Hapus Serial"
        message={`Serial "${deleteSerial?.serial_no ?? ''}" akan dihapus dan stoknya dikurangi jika belum terjual.`}
        confirmText="Hapus"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  )
}

function WarehouseSelect({ label = 'Gudang', value, warehouses, onChange }: { label?: string; value: string; warehouses: Warehouse[]; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
        <option value="">Pilih gudang</option>
        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
      </select>
    </label>
  )
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={onEdit}
        className="rounded-lg p-1.5 text-primary-600 transition-colors hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
        title="Edit"
      >
        <Edit2 size={14} />
      </button>
      <button
        onClick={onDelete}
        className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        title="Hapus"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function Table({ headers, empty, children }: { headers: string[]; empty: string; children: ReactNode }) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : children
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm text-slate-700 dark:text-slate-200">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500 text-left dark:bg-slate-800 dark:text-slate-400">
          <tr>{headers.map(h => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.isArray(rows) && rows.length === 0 ? <tr><td colSpan={headers.length} className="py-8 text-center text-slate-400">{empty}</td></tr> : rows}
        </tbody>
      </table>
    </div>
  )
}
