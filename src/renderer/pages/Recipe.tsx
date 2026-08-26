import { useEffect, useState } from 'react'
import { ChefHat, Plus, Edit3, Trash2, Calculator, Search, RefreshCw, Layers } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import ConfirmDialog from '../components/ConfirmDialog'
import Select from '../components/Select'
import Textarea from '../components/Textarea'
import { SkeletonStatGrid, SkeletonSpinner } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'
import { useToast } from '../contexts/ToastContext'

interface Resep {
  id: number
  kd_barang?: string | null
  nama_resep: string
  nama_barang?: string | null
  kategori: string
  hasil_produksi: number
  satuan_hasil: string
  petunjuk?: string | null
  waktu_produksi_menit?: number | null
  biaya_produksi?: number | null
  harga_jual?: number | null
  margin?: number | null
  created_at: string
}

interface BahanResep {
  id: number
  recipe_id: number
  kd_barang?: string | null
  nama_bahan: string
  qty: number
  satuan: string
  harga_per_unit: number
  sub_total: number
  persentase_terpakai?: number | null
}

interface Barang {
  kd_barang: string
  nama_barang: string
  harga_jual?: number
  harga_pokok?: number
}

const kategoriOpts = [
  { value: 'MAKANAN', label: 'Makanan' },
  { value: 'MINUMAN', label: 'Minuman' },
  { value: 'SNACK', label: 'Snack' },
  { value: 'LAINNYA', label: 'Lainnya' },
]

export default function Recipe() {
  const toast = useToast()
  const [recipes, setRecipes] = useState<Resep[]>([])
  const [barang, setBarang] = useState<Barang[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterKategori, setFilterKategori] = useState('')
  const [modal, setModal] = useState<'add' | 'detail' | null>(null)
  const [editRecipe, setEditRecipe] = useState<Resep | null>(null)
  const [selectedRecipe, setSelectedRecipe] = useState<Resep | null>(null)
  const [ingredients, setIngredients] = useState<BahanResep[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [deleteRecipe, setDeleteRecipe] = useState<Resep | null>(null)

  const [form, setForm] = useState({
    kd_barang: '',
    nama_resep: '',
    hasil_produksi: '1',
    satuan_hasil: 'porsi',
    petunjuk: '',
    waktu_produksi_menit: '15',
    kategori: 'MAKANAN',
  })

  const [ingredientForm, setIngredientForm] = useState({
    nama_bahan: '',
    qty: '1',
    satuan: 'gram',
    harga_per_unit: '0',
    persentase_terpakai: '100',
  })
  const [editIngredient, setEditIngredient] = useState<BahanResep | null>(null)
  const [ingredientModal, setIngredientModal] = useState(false)
  const [deleteIngredient, setDeleteIngredient] = useState<BahanResep | null>(null)

  const load = async (isManual = false) => {
    const [r1, r2] = await Promise.all([
      api<Resep[]>('recipe:getAll'),
      api<Barang[]>('barang:getAll'),
    ])
    if (r1.success) setRecipes(r1.data ?? [])
    if (r2.success) setBarang(r2.data ?? [])
    setLoading(false)
    if (isManual) toast('Data resep diperbarui', 'success')
  }

  useEffect(() => { load() }, [])

  const loadIngredients = async (recipeId: number) => {
    const r = await api<BahanResep[]>('recipe:getIngredients', recipeId)
    if (r.success) setIngredients(r.data ?? [])
  }

  const resetForm = (resep?: Resep | null) => {
    setForm(resep ? {
      kd_barang: resep.kd_barang ?? '',
      nama_resep: resep.nama_resep,
      hasil_produksi: String(resep.hasil_produksi),
      satuan_hasil: resep.satuan_hasil,
      petunjuk: resep.petunjuk ?? '',
      waktu_produksi_menit: String(resep.waktu_produksi_menit ?? '15'),
      kategori: resep.kategori,
    } : {
      kd_barang: '',
      nama_resep: '',
      hasil_produksi: '1',
      satuan_hasil: 'porsi',
      petunjuk: '',
      waktu_produksi_menit: '15',
      kategori: 'MAKANAN',
    })
  }

  const resetIngredientForm = (bahan?: BahanResep | null) => {
    setIngredientForm(bahan ? {
      nama_bahan: bahan.nama_bahan,
      qty: String(bahan.qty),
      satuan: bahan.satuan,
      harga_per_unit: String(bahan.harga_per_unit),
      persentase_terpakai: String(bahan.persentase_terpakai ?? '100'),
    } : {
      nama_bahan: '',
      qty: '1',
      satuan: 'gram',
      harga_per_unit: '0',
      persentase_terpakai: '100',
    })
  }

  const handleSave = async () => {
    if (!form.nama_resep.trim() || !form.hasil_produksi || !form.satuan_hasil) {
      return toast('Nama resep, hasil produksi, dan satuan wajib diisi', 'error')
    }
    setSubmitting(true)
    const payload = {
      nama_resep: form.nama_resep.trim(),
      kd_barang: form.kd_barang.trim() || null,
      kategori: form.kategori,
      hasil_produksi: parseFloat(form.hasil_produksi) || 1,
      satuan_hasil: form.satuan_hasil.trim(),
      petunjuk: form.petunjuk.trim() || null,
      waktu_produksi_menit: form.waktu_produksi_menit ? parseInt(form.waktu_produksi_menit) : 15,
    }
    const r = editRecipe
      ? await api('recipe:update', editRecipe.id, payload)
      : await api('recipe:create', payload)
    setSubmitting(false)
    if (r.success) {
      toast(editRecipe ? 'Resep diperbarui' : 'Resep ditambahkan', 'success')
      setModal(null)
      setEditRecipe(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleSaveIngredient = async () => {
    if (!ingredientForm.nama_bahan.trim() || !ingredientForm.qty || !ingredientForm.satuan) {
      return toast('Nama bahan, qty, dan satuan wajib diisi', 'error')
    }
    if (!selectedRecipe) return
    setSubmitting(true)
    const payload = {
      recipe_id: selectedRecipe.id,
      nama_bahan: ingredientForm.nama_bahan.trim(),
      qty: parseFloat(ingredientForm.qty) || 1,
      satuan: ingredientForm.satuan.trim(),
      harga_per_unit: parseFloat(ingredientForm.harga_per_unit) || 0,
      persentase_terpakai: ingredientForm.persentase_terpakai ? parseFloat(ingredientForm.persentase_terpakai) : 100,
    }
    const r = editIngredient
      ? await api('recipe:updateIngredient', editIngredient.id, payload)
      : await api('recipe:addIngredient', payload)
    setSubmitting(false)
    if (r.success) {
      toast(editIngredient ? 'Bahan diperbarui' : 'Bahan ditambahkan', 'success')
      setIngredientModal(false)
      setEditIngredient(null)
      resetIngredientForm()
      await loadIngredients(selectedRecipe.id)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleDeleteIngredient = async () => {
    if (!deleteIngredient || !selectedRecipe) return
    setSubmitting(true)
    const r = await api('recipe:deleteIngredient', deleteIngredient.id, selectedRecipe.id)
    setSubmitting(false)
    if (r.success) {
      toast('Bahan berhasil dihapus', 'success')
      setDeleteIngredient(null)
      await loadIngredients(selectedRecipe.id)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleCalcCost = async () => {
    if (!selectedRecipe) return
    const r = await api<{ total_biaya_produksi: number }>('recipe:calcCost', selectedRecipe.id)
    if (r.success) {
      toast(`Biaya produksi terhitung: ${formatRupiah(r.data?.total_biaya_produksi ?? 0)}`, 'success')
      await loadIngredients(selectedRecipe.id)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleDeleteRecipe = async () => {
    if (!deleteRecipe) return
    setSubmitting(true)
    const r = await api('recipe:delete', deleteRecipe.id)
    setSubmitting(false)
    if (r.success) {
      toast('Resep berhasil dihapus', 'success')
      setDeleteRecipe(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const openDetail = async (resep: Resep) => {
    setSelectedRecipe(resep)
    setModal('detail')
    await loadIngredients(resep.id)
  }

  const barangOptions = barang.map(b => ({
    value: b.kd_barang,
    label: `${b.nama_barang}${b.harga_jual ? ` - ${formatRupiah(b.harga_jual)}` : ''}`,
  }))

  const filtered = recipes.filter(r => {
    const matchSearch = r.nama_resep.toLowerCase().includes(search.toLowerCase()) || (r.nama_barang ?? '').toLowerCase().includes(search.toLowerCase())
    const matchKategori = !filterKategori || r.kategori === filterKategori
    return matchSearch && matchKategori
  })

  const totalBiaya = ingredients.reduce((sum, i) => sum + (i.sub_total || 0), 0)

  const statItems = [
    { label: 'Total Resep / BOM', value: recipes.length, icon: <ChefHat size={20} className="text-primary-500" /> },
    { label: 'Menu Makanan', value: recipes.filter(r => r.kategori === 'MAKANAN').length, icon: <ChefHat size={20} className="text-orange-500" /> },
    { label: 'Menu Minuman', value: recipes.filter(r => r.kategori === 'MINUMAN').length, icon: <ChefHat size={20} className="text-blue-500" /> },
    { label: 'Snack & Lainnya', value: recipes.filter(r => r.kategori !== 'MAKANAN' && r.kategori !== 'MINUMAN').length, icon: <Layers size={20} className="text-amber-500" /> },
  ]

  return (
    <div className="space-y-4">
      {loading ? (
        <>
          <SkeletonStatGrid count={4} />
          <SkeletonSpinner label="Memuat resep dan BOM..." />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statItems.map((s, i) => (
              <Card key={i} title={s.label} action={s.icon}>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-2">{s.value}</p>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Cari nama resep..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                icon={<Search size={16} />}
                className="max-w-xs"
              />
              <Select
                value={filterKategori}
                onChange={e => setFilterKategori(e.target.value)}
                options={kategoriOpts}
                placeholder="Semua Kategori"
                className="w-40"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />} onClick={() => load(true)}>
                Refresh
              </Button>
              <Button icon={<Plus size={16} />} onClick={() => { setEditRecipe(null); resetForm(); setModal('add') }} className="bg-red-600 hover:bg-red-700 text-white border-0 font-bold">
                Tambah Resep (BOM)
              </Button>
            </div>
          </div>

          <Card title="Daftar Resep & Kalkulator HPP">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[700px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nama Resep</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Produk Penjualan</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Kategori</th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">HPP / Biaya</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Hasil Produksi</th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Margin Laba</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 sm:px-4 py-10 text-center text-slate-400">Belum ada data resep</td>
                      </tr>
                    ) : (
                      filtered.map(resep => (
                        <tr key={resep.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors cursor-pointer" onClick={() => openDetail(resep)}>
                          <td className="px-3 sm:px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{resep.nama_resep}</td>
                          <td className="px-3 sm:px-4 py-3 text-slate-600 dark:text-slate-300">{resep.nama_barang || '-'}</td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <Badge label={resep.kategori} variant={resep.kategori === 'MAKANAN' ? 'amber' : resep.kategori === 'MINUMAN' ? 'blue' : resep.kategori === 'SNACK' ? 'yellow' : 'gray'} />
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-right font-bold text-primary-600 dark:text-primary-400">
                            {formatRupiah(resep.biaya_produksi ?? 0)}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center text-slate-600 dark:text-slate-300">{resep.hasil_produksi} {resep.satuan_hasil}</td>
                          <td className={`px-3 sm:px-4 py-3 text-right font-bold ${resep.margin && resep.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {resep.margin != null ? `${resep.margin >= 0 ? '+' : ''}${resep.margin}%` : '-'}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => { setEditRecipe(resep); resetForm(resep); setModal('add') }}
                                className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 transition-colors"
                                title="Edit Resep"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                onClick={() => setDeleteRecipe(resep)}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                                title="Hapus Resep"
                              >
                                <Trash2 size={15} />
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

          <Modal
            open={modal === 'add'}
            onClose={() => { setModal(null); setEditRecipe(null) }}
            title={editRecipe ? 'Edit Data Resep' : 'Tambah Resep & BOM Baru'}
            size="lg"
            footer={
              <>
                <Button variant="secondary" onClick={() => { setModal(null); setEditRecipe(null) }} className="w-full sm:w-auto">Batal</Button>
                <Button loading={submitting} onClick={handleSave} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white border-0 font-bold">{editRecipe ? 'Simpan Perubahan' : 'Tambah Resep'}</Button>
              </>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Hubungkan ke Menu Penjualan (Barang POS)" value={form.kd_barang} onChange={e => setForm(prev => ({ ...prev, kd_barang: e.target.value }))} options={barangOptions} placeholder="Pilih Produk Menu" />
              <Input label="Nama Resep *" value={form.nama_resep} onChange={e => setForm(prev => ({ ...prev, nama_resep: e.target.value }))} placeholder="Nama resep masakan/minuman" />
              <Input label="Hasil Produksi *" type="number" value={form.hasil_produksi} onChange={e => setForm(prev => ({ ...prev, hasil_produksi: e.target.value }))} placeholder="1" />
              <Input label="Satuan Hasil *" value={form.satuan_hasil} onChange={e => setForm(prev => ({ ...prev, satuan_hasil: e.target.value }))} placeholder="porsi, gelas, mangkok" />
              <Select label="Kategori Menu" value={form.kategori} onChange={e => setForm(prev => ({ ...prev, kategori: e.target.value }))} options={kategoriOpts} />
              <Input label="Waktu Masak (Menit)" type="number" value={form.waktu_produksi_menit} onChange={e => setForm(prev => ({ ...prev, waktu_produksi_menit: e.target.value }))} placeholder="15" />
              <div className="sm:col-span-2">
                <Textarea label="Petunjuk / Cara Memasak" value={form.petunjuk} onChange={e => setForm(prev => ({ ...prev, petunjuk: e.target.value }))} placeholder="Langkah-langkah pembuatan..." />
              </div>
            </div>
          </Modal>

          <Modal
            open={modal === 'detail' && !!selectedRecipe}
            onClose={() => { setModal(null); setSelectedRecipe(null); setIngredients([]) }}
            title={`Bahan Baku Resep: ${selectedRecipe?.nama_resep ?? ''}`}
            size="lg"
          >
            {selectedRecipe && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <p className="text-xs text-slate-500">Kategori</p>
                    <Badge label={selectedRecipe.kategori} variant={selectedRecipe.kategori === 'MAKANAN' ? 'amber' : selectedRecipe.kategori === 'MINUMAN' ? 'blue' : selectedRecipe.kategori === 'SNACK' ? 'yellow' : 'gray'} />
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <p className="text-xs text-slate-500">Hasil Produksi</p>
                    <p className="font-bold text-slate-700 dark:text-slate-200">{selectedRecipe.hasil_produksi} {selectedRecipe.satuan_hasil}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <p className="text-xs text-slate-500">Total HPP Bahan</p>
                    <p className="font-bold text-red-600 dark:text-red-400">{formatRupiah(totalBiaya)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <p className="text-xs text-slate-500">Margin Laba</p>
                    <p className={`font-bold ${selectedRecipe.margin != null && selectedRecipe.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {selectedRecipe.margin != null ? `${selectedRecipe.margin >= 0 ? '+' : ''}${selectedRecipe.margin}%` : '-'}
                    </p>
                  </div>
                </div>

                {selectedRecipe.petunjuk && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300">
                    <p className="font-bold mb-1">Cara Pembuatan:</p>
                    <p className="whitespace-pre-wrap">{selectedRecipe.petunjuk}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Daftar Komposisi / Bahan Baku (BOM)</h4>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" icon={<Calculator size={14} />} onClick={handleCalcCost}>Hitung HPP Otomatis</Button>
                    <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditIngredient(null); resetIngredientForm(); setIngredientModal(true) }} className="bg-red-600 hover:bg-red-700 text-white border-0 font-bold">Tambah Bahan</Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Nama Bahan</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">Takaran (Qty)</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">Satuan</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Harga Satuan</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Sub Total</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {ingredients.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-slate-400">Belum ada bahan dalam resep ini</td>
                        </tr>
                      ) : (
                        ingredients.map(b => (
                          <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                            <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{b.nama_bahan}</td>
                            <td className="px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-300">{b.qty}</td>
                            <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">{b.satuan}</td>
                            <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">{formatRupiah(b.harga_per_unit)}</td>
                            <td className="px-3 py-2 text-right font-bold text-red-600 dark:text-red-400">{formatRupiah(b.sub_total)}</td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => { setEditIngredient(b); resetIngredientForm(b); setIngredientModal(true) }} className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600"><Edit3 size={13} /></button>
                                <button onClick={() => setDeleteIngredient(b)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {ingredients.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold">
                          <td colSpan={4} className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">Total HPP Bahan per Resep:</td>
                          <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">{formatRupiah(totalBiaya)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </Modal>

          <Modal
            open={ingredientModal}
            onClose={() => { setIngredientModal(false); setEditIngredient(null) }}
            title={editIngredient ? 'Edit Komposisi Bahan' : 'Tambah Komposisi Bahan'}
            size="sm"
            footer={
              <>
                <Button variant="secondary" onClick={() => { setIngredientModal(false); setEditIngredient(null) }} className="w-full sm:w-auto">Batal</Button>
                <Button loading={submitting} onClick={handleSaveIngredient} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white border-0 font-bold">{editIngredient ? 'Simpan' : 'Tambah Bahan'}</Button>
              </>
            }
          >
            <div className="space-y-3">
              <Input label="Nama Bahan Baku *" value={ingredientForm.nama_bahan} onChange={e => setIngredientForm(prev => ({ ...prev, nama_bahan: e.target.value }))} placeholder="Contoh: Daging Sapi, Beras, Telur..." />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Takaran (Qty) *" type="number" value={ingredientForm.qty} onChange={e => setIngredientForm(prev => ({ ...prev, qty: e.target.value }))} placeholder="1" />
                <Input label="Satuan *" value={ingredientForm.satuan} onChange={e => setIngredientForm(prev => ({ ...prev, satuan: e.target.value }))} placeholder="gram, ml, pcs, butir" />
              </div>
              <Input label="Harga per Satuan (Rp) *" type="number" value={ingredientForm.harga_per_unit} onChange={e => setIngredientForm(prev => ({ ...prev, harga_per_unit: e.target.value }))} placeholder="10000" />
            </div>
          </Modal>

          <ConfirmDialog
            open={!!deleteIngredient}
            onClose={() => setDeleteIngredient(null)}
            onConfirm={handleDeleteIngredient}
            title="Hapus Bahan"
            message={`Apakah Anda yakin ingin menghapus "${deleteIngredient?.nama_bahan}" dari daftar komposisi?`}
            confirmText="Hapus Bahan"
            variant="danger"
            loading={submitting}
          />

          <ConfirmDialog
            open={!!deleteRecipe}
            onClose={() => setDeleteRecipe(null)}
            onConfirm={handleDeleteRecipe}
            title="Hapus Resep"
            message={`Apakah Anda yakin ingin menghapus resep "${deleteRecipe?.nama_resep ?? ''}"?`}
            confirmText="Hapus Resep"
            variant="danger"
            loading={submitting}
          />
        </>
      )}
    </div>
  )
}
