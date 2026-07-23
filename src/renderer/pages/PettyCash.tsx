import { useState, useEffect, useCallback } from 'react'
import { Wallet, Plus, Trash2, Search, TrendingDown, TrendingUp, Calendar } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Select from '../components/Select'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Badge from '../components/Badge'
import { StatCardSkeleton, FilterBarSkeleton, DataTableSkeleton } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

interface PettyCashItem {
  id: number
  tanggal: string
  keterangan: string
  kategori: string
  jumlah: number
  jenis: 'keluar' | 'masuk'
  username: string
  created_at: string
}

const KATEGORI = ['ATK', 'Konsumsi', 'Transport', 'Kebersihan', 'Maintenance', 'Lainnya']
const today = new Date().toISOString().split('T')[0]
const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

export default function PettyCash() {
  const toast = useToast()
  const { user } = useAuth()
  const [items, setItems] = useState<PettyCashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [selected, setSelected] = useState<PettyCashItem | null>(null)
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState({ start: firstDay, end: today })
  const [form, setForm] = useState({ keterangan: '', kategori: 'Konsumsi', jumlah: 0, jenis: 'keluar' as const, tanggal: today })

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api<PettyCashItem[]>('pettyCash:getAll', dateRange.start, dateRange.end, search)
    if (r.success) setItems(r.data ?? [])
    setLoading(false)
  }, [dateRange, search])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.keterangan.trim()) return toast('Keterangan wajib diisi', 'error')
    if (form.jumlah <= 0) return toast('Jumlah harus lebih dari 0', 'error')

    const r = await api('pettyCash:create', { ...form, username: user?.nama_pengguna ?? '' })
    if (r.success) {
      toast('Pengeluaran dicatat', 'success')
      setModal(false)
      setForm({ keterangan: '', kategori: 'Konsumsi', jumlah: 0, jenis: 'keluar', tanggal: today })
      load()
    } else {
      toast(r.message as string ?? 'Gagal mencatat', 'error')
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    const r = await api('pettyCash:delete', selected.id)
    if (r.success) {
      toast('Data dihapus', 'success')
      setConfirmDelete(false)
      setSelected(null)
      load()
    } else {
      toast(r.message as string ?? 'Gagal menghapus', 'error')
    }
  }

  const totalMasuk = items.filter(i => i.jenis === 'masuk').reduce((s, i) => s + i.jumlah, 0)
  const totalKeluar = items.filter(i => i.jenis === 'keluar').reduce((s, i) => s + i.jumlah, 0)
  const saldo = totalMasuk - totalKeluar

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white">
          <Wallet size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Petty Cash</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Catat pengeluaran operasional kecil harian toko</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shrink-0">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Masuk</p>
            <p className="text-lg font-bold text-emerald-600">{formatRupiah(totalMasuk)}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center text-white shrink-0">
            <TrendingDown size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Keluar</p>
            <p className="text-lg font-bold text-red-600">{formatRupiah(totalKeluar)}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl ${saldo >= 0 ? 'bg-primary-500' : 'bg-amber-500'} flex items-center justify-center text-white shrink-0`}>
            <Wallet size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Saldo</p>
            <p className={`text-lg font-bold ${saldo >= 0 ? 'text-primary-600' : 'text-amber-600'}`}>{formatRupiah(saldo)}</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <Input label="Dari" type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} className="w-40" />
          <Input label="Sampai" type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} className="w-40" />
          <div className="flex-1">
            <Input placeholder="Cari keterangan..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={14} />} />
          </div>
          <Button icon={<Plus size={14} />} onClick={() => setModal(true)}>Catat Pengeluaran</Button>
        </div>
      </Card>

      <Card>
        {loading ? (
          <DataTableSkeleton rows={6} cols={[
            { width: 'w-20' }, { width: 'flex-1' }, { width: 'w-24' }, { width: 'w-20' }, { width: 'w-28' }, { width: 'w-16' }, { width: 'w-10' },
          ]} />
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Wallet size={36} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">Belum ada data petty cash</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                <tr>
                  {['Tanggal', 'Keterangan', 'Kategori', 'Jenis', 'Jumlah', 'Oleh', 'Aksi'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {items.map((item, i) => (
                  <tr key={item.id} className={`hover:bg-primary-50/50 dark:hover:bg-slate-700/30 ${i % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200 font-medium">{item.keterangan}</td>
                    <td className="px-4 py-2.5"><Badge label={item.kategori} variant="blue" /></td>
                    <td className="px-4 py-2.5">
                      <Badge label={item.jenis === 'masuk' ? 'Masuk' : 'Keluar'} variant={item.jenis === 'masuk' ? 'green' : 'red'} />
                    </td>
                    <td className={`px-4 py-2.5 font-bold ${item.jenis === 'masuk' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {item.jenis === 'masuk' ? '+' : '-'}{formatRupiah(item.jumlah)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{item.username}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => { setSelected(item); setConfirmDelete(true) }} aria-label="Hapus" className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Catat Pengeluaran"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
            <Button onClick={handleSave}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Tanggal" type="date" value={form.tanggal} onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))} />
          <Input label="Keterangan" value={form.keterangan} onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))} placeholder="Contoh: Beli tinta printer" />
          <Select label="Kategori" value={form.kategori} onChange={e => setForm(p => ({ ...p, kategori: e.target.value }))}
            options={KATEGORI.map(k => ({ value: k, label: k }))} />
          <Input label="Jumlah (Rp)" type="number" value={form.jumlah} onChange={e => setForm(p => ({ ...p, jumlah: +e.target.value }))} placeholder="0" />
        </div>
      </Modal>

      <ConfirmDialog open={confirmDelete} onClose={() => { setConfirmDelete(false); setSelected(null) }}
        onConfirm={handleDelete} title="Hapus Data" message={`Hapus catatan "${selected?.keterangan}"?`} />
    </div>
  )
}
