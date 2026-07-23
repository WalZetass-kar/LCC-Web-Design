import { useState, useCallback, useEffect } from 'react'
import { ArrowRightLeft, Package, Search, Plus, Minus, Trash2, Send } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Select from '../components/Select'
import Modal from '../components/Modal'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { SkeletonPage } from '../components/Skeleton'

interface Branch {
  id: number
  nama_branch: string
  kode_branch: string
}

interface Barang {
  kd_barang: string
  nama_barang: string | null
  stok: number
  harga_barang: number
}

interface TransferItem {
  kd_barang: string
  nama_barang: string
  qty: number
  stok_asal: number
}

export default function StockTransfer() {
  const toast = useToast()
  const [branches, setBranches] = useState<Branch[]>([])
  const [fromBranch, setFromBranch] = useState<number>(0)
  const [toBranch, setToBranch] = useState<number>(0)
  const [products, setProducts] = useState<Barang[]>([])
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<TransferItem[]>([])
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [note, setNote] = useState('')

  const loadBranches = useCallback(async () => {
    const r = await api<Branch[]>('branch:getAll')
    if (r.success) setBranches(r.data ?? [])
  }, [])

  const loadProducts = useCallback(async () => {
    if (!fromBranch) return
    const r = await api<Barang[]>('barang:getByBranch', fromBranch)
    if (r.success) setProducts(r.data ?? [])
  }, [fromBranch])

  useEffect(() => { loadBranches() }, [loadBranches])
  useEffect(() => { loadProducts() }, [loadProducts])

  const filtered = products.filter(p =>
    p.nama_barang?.toLowerCase().includes(search.toLowerCase()) ||
    p.kd_barang.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 30)

  const addItem = (p: Barang) => {
    const existing = items.find(i => i.kd_barang === p.kd_barang)
    if (existing) {
      if (existing.qty >= (p.stok ?? 0)) {
        toast(`Stok ${p.nama_barang} tidak mencukupi`, 'error')
        return
      }
      setItems(prev => prev.map(i => i.kd_barang === p.kd_barang ? { ...i, qty: i.qty + 1 } : i))
    } else {
      if ((p.stok ?? 0) <= 0) {
        toast(`Stok ${p.nama_barang} habis`, 'error')
        return
      }
      setItems(prev => [...prev, { kd_barang: p.kd_barang, nama_barang: p.nama_barang ?? '', qty: 1, stok_asal: p.stok ?? 0 }])
    }
    setSearch('')
  }

  const updateQty = (kd: string, delta: number) => {
    setItems(prev => prev.map(i => {
      if (i.kd_barang !== kd) return i
      const newQty = i.qty + delta
      if (delta > 0 && newQty > i.stok_asal) {
        toast('Melebihi stok tersedia', 'error')
        return i
      }
      return { ...i, qty: newQty }
    }).filter(i => i.qty > 0))
  }

  const removeItem = (kd: string) => setItems(prev => prev.filter(i => i.kd_barang !== kd))

  const handleTransfer = async () => {
    if (!fromBranch || !toBranch) return toast('Pilih branch asal dan tujuan', 'error')
    if (fromBranch === toBranch) return toast('Branch asal dan tujuan tidak boleh sama', 'error')
    if (items.length === 0) return toast('Tambahkan produk yang akan ditransfer', 'error')

    setLoading(true)
    const r = await api('stock:transfer', {
      from_branch: fromBranch,
      to_branch: toBranch,
      items: items.map(i => ({ kd_barang: i.kd_barang, qty: i.qty })),
      note,
    })
    setLoading(false)

    if (r.success) {
      toast(`${items.length} produk berhasil ditransfer`, 'success')
      setItems([])
      setNote('')
      setShowConfirm(false)
      loadProducts()
    } else {
      toast(r.message as string ?? 'Transfer gagal', 'error')
    }
  }

  if (loading) return <SkeletonPage rows={6} />

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white">
          <ArrowRightLeft size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Transfer Stok</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Pindahkan stok antar cabang/gudang</p>
        </div>
      </div>

      {/* Branch selectors */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <Select
            label="Dari Branch"
            value={fromBranch}
            onChange={e => { setFromBranch(+e.target.value); setItems([]) }}
            placeholder="-- Pilih Branch Asal --"
            options={branches.map(b => ({ value: b.id, label: b.nama_branch }))}
          />
          <div className="hidden sm:flex items-center justify-center pb-2">
            <ArrowRightLeft size={20} className="text-slate-400" />
          </div>
          <Select
            label="Ke Branch"
            value={toBranch}
            onChange={e => setToBranch(+e.target.value)}
            placeholder="-- Pilih Branch Tujuan --"
            options={branches.filter(b => b.id !== fromBranch).map(b => ({ value: b.id, label: b.nama_branch }))}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Product search */}
        <Card title="Pilih Produk">
          <div className="flex gap-2 mb-3">
            <Input
              placeholder="Cari produk..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              icon={<Search size={14} />}
              className="flex-1"
            />
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-1.5 scrollbar-thin">
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Package size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">{fromBranch ? 'Produk tidak ditemukan' : 'Pilih branch asal terlebih dahulu'}</p>
              </div>
            ) : filtered.map(p => (
              <button
                key={p.kd_barang}
                onClick={() => addItem(p)}
                disabled={(p.stok ?? 0) <= 0}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  (p.stok ?? 0) <= 0
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-primary-50 dark:hover:bg-slate-700'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{p.nama_barang}</p>
                  <p className="text-xs text-slate-400 font-mono">{p.kd_barang}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-500">Stok: <span className={`font-bold ${(p.stok ?? 0) <= 5 ? 'text-red-500' : 'text-emerald-600'}`}>{p.stok}</span></p>
                  <p className="text-xs text-slate-400">{formatRupiah(p.harga_barang)}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Transfer items */}
        <Card
          title={`Item Transfer (${items.length})`}
          action={
            items.length > 0 ? (
              <Button
                size="sm"
                icon={<Send size={14} />}
                onClick={() => setShowConfirm(true)}
                disabled={!fromBranch || !toBranch}
              >
                Transfer
              </Button>
            ) : undefined
          }
        >
          <div className="max-h-[400px] overflow-y-auto space-y-2 scrollbar-thin">
            {items.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <ArrowRightLeft size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Belum ada item untuk ditransfer</p>
              </div>
            ) : items.map(item => (
              <div key={item.kd_barang} className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800 p-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{item.nama_barang}</p>
                  <p className="text-[10px] text-slate-400">Stok tersedia: {item.stok_asal}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(item.kd_barang, -1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-200 dark:bg-slate-700 transition-colors hover:bg-primary-100">
                    <Minus size={10} />
                  </button>
                  <span className="w-8 text-center text-xs font-bold">{item.qty}</span>
                  <button onClick={() => updateQty(item.kd_barang, 1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-200 dark:bg-slate-700 transition-colors hover:bg-primary-100">
                    <Plus size={10} />
                  </button>
                  <button onClick={() => removeItem(item.kd_barang)} className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30">
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Confirm Modal */}
      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Konfirmasi Transfer Stok"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>Batal</Button>
            <Button loading={loading} onClick={handleTransfer} icon={<Send size={14} />}>Transfer Sekarang</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm">
            <p className="text-slate-500 dark:text-slate-400">Dari: <strong className="text-slate-700 dark:text-slate-200">{branches.find(b => b.id === fromBranch)?.nama_branch}</strong></p>
            <p className="text-slate-500 dark:text-slate-400">Ke: <strong className="text-slate-700 dark:text-slate-200">{branches.find(b => b.id === toBranch)?.nama_branch}</strong></p>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{items.length} produk, total {items.reduce((s, i) => s + i.qty, 0)} unit</p>
          </div>
          <Input
            label="Catatan (opsional)"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Alasan transfer, no. surat jalan, dll"
          />
        </div>
      </Modal>
    </div>
  )
}
