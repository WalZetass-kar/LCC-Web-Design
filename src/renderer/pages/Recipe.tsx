import { useEffect, useState } from 'react'
import { ChefHat, Plus, Edit3, Trash2, Calculator, Search, DollarSign, Percent } from 'lucide-react'
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
  kd_resep: string
  nama_resep: string
  kd_produk?: string
  nama_produk?: string
  kategori: 'MAKANAN' | 'MINUMAN' | 'SNACK' | 'LAINNYA'
  hasil_produksi: number
  satuan_hasil: string
  petunjuk?: string
  waktu_produksi_menit?: number
  biaya_produksi?: number
  harga_jual?: number
  margin?: number
  created_at: string
}

interface BahanResep {
  kd_bahan_resep: number
  kd_resep: string
  nama_bahan: string
  qty: number
  satuan: string
  harga_per_unit: number
  sub_total: number
  persen_terpakai?: number
}

interface Barang {
  kd_barang: string
  nama_barang: string
  harga_jual?: number
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
    kd_produk: '', nama_resep: '', hasil_produksi: '', satuan_hasil: '',
    petunjuk: '', waktu_produksi_menit: '', kategori: 'MAKANAN' as Resep['kategori'],
  })

  const [ingredientForm, setIngredientForm] = useState({
    nama_bahan: '', qty: '', satuan: '', harga_per_unit: '', persen_terpakai: '',
  })
  const [editIngredient, setEditIngredient] = useState<BahanResep | null>(null)
  const [ingredientModal, setIngredientModal] = useState(false)
  const [deleteIngredient, setDeleteIngredient] = useState<BahanResep | null>(null)

  const load = async () => {
    const [r1, r2] = await Promise.all([
      api<Resep[]>('recipe:getAll'),
      api<Barang[]>('barang:getAll'),
    ])
    if (r1.success) setRecipes(r1.data ?? [])
    if (r2.success) setBarang(r2.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const loadIngredients = async (kd_resep: string) => {
    const r = await api<BahanResep[]>('recipe:getIngredients', kd_resep)
    if (r.success) setIngredients(r.data ?? [])
  }

  const resetForm = (resep?: Resep | null) => {
    setForm(resep ? {
      kd_produk: resep.kd_produk ?? '',
      nama_resep: resep.nama_resep,
      hasil_produksi: String(resep.hasil_produksi),
      satuan_hasil: resep.satuan_hasil,
      petunjuk: resep.petunjuk ?? '',
      waktu_produksi_menit: String(resep.waktu_produksi_menit ?? ''),
      kategori: resep.kategori,
    } : { kd_produk: '', nama_resep: '', hasil_produksi: '', satuan_hasil: '', petunjuk: '', waktu_produksi_menit: '', kategori: 'MAKANAN' })
  }

  const resetIngredientForm = (bahan?: BahanResep | null) => {
    setIngredientForm(bahan ? {
      nama_bahan: bahan.nama_bahan,
      qty: String(bahan.qty),
      satuan: bahan.satuan,
      harga_per_unit: String(bahan.harga_per_unit),
      persen_terpakai: String(bahan.persen_terpakai ?? ''),
    } : { nama_bahan: '', qty: '', satuan: '', harga_per_unit: '', persen_terpakai: '' })
  }

  const handleSave = async () => {
    if (!form.nama_resep || !form.hasil_produksi || !form.satuan_hasil) {
      return toast('Nama, hasil produksi, dan satuan wajib diisi', 'error')
    }
    setSubmitting(true)
    const payload = {
      ...form,
      hasil_produksi: parseFloat(form.hasil_produksi),
      waktu_produksi_menit: form.waktu_produksi_menit ? parseInt(form.waktu_produksi_menit) : undefined,
    }
    const r = editRecipe
      ? await api('recipe:update', editRecipe.kd_resep, payload)
      : await api('recipe:create', payload)
    setSubmitting(false)
    if (r.success) {
      toast(editRecipe ? 'Resep diperbarui' : 'Resep ditambahkan')
      setModal(null)
      setEditRecipe(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleSaveIngredient = async () => {
    if (!ingredientForm.nama_bahan || !ingredientForm.qty || !ingredientForm.satuan || !ingredientForm.harga_per_unit) {
      return toast('Nama, qty, satuan dan harga wajib diisi', 'error')
    }
    if (!selectedRecipe) return
    setSubmitting(true)
    const payload = {
      ...ingredientForm,
      qty: parseFloat(ingredientForm.qty),
      harga_per_unit: parseFloat(ingredientForm.harga_per_unit),
      persen_terpakai: ingredientForm.persen_terpakai ? parseFloat(ingredientForm.persen_terpakai) : undefined,
    }
    const r = editIngredient
      ? await api('recipe:updateIngredient', editIngredient.kd_bahan_resep, payload)
      : await api('recipe:addIngredient', selectedRecipe.kd_resep, payload)
    setSubmitting(false)
    if (r.success) {
      toast(editIngredient ? 'Bahan diperbarui' : 'Bahan ditambahkan')
      setIngredientModal(false)
      setEditIngredient(null)
      resetIngredientForm()
      loadIngredients(selectedRecipe.kd_resep)
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleDeleteIngredient = async () => {
    if (!deleteIngredient) return
    setSubmitting(true)
    const r = await api('recipe:deleteIngredient', deleteIngredient.kd_bahan_resep)
    setSubmitting(false)
    if (r.success) {
      toast('Bahan dihapus')
      setDeleteIngredient(null)
      if (selectedRecipe) loadIngredients(selectedRecipe.kd_resep)
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleCalcCost = async () => {
    if (!selectedRecipe) return
    const r = await api<number>('recipe:calcCost', selectedRecipe.kd_resep)
    if (r.success) {
      toast(`Biaya produksi: ${formatRupiah(r.data ?? 0)}`)
      loadIngredients(selectedRecipe.kd_resep)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleDeleteRecipe = async () => {
    if (!deleteRecipe) return
    setSubmitting(true)
    const r = await api('recipe:delete', deleteRecipe.kd_resep)
    setSubmitting(false)
    if (r.success) {
      toast('Resep dihapus')
      setDeleteRecipe(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const openDetail = async (resep: Resep) => {
    setSelectedRecipe(resep)
    setModal('detail')
    await loadIngredients(resep.kd_resep)
  }

  const barangOptions = barang.map(b => ({ value: b.kd_barang, label: `${b.nama_barang}${b.harga_jual ? ` - ${formatRupiah(b.harga_jual)}` : ''}` }))

  const filtered = recipes.filter(r => {
    const matchSearch = r.nama_resep.toLowerCase().includes(search.toLowerCase()) || r.nama_produk?.toLowerCase().includes(search.toLowerCase())
    const matchKategori = !filterKategori || r.kategori === filterKategori
    return matchSearch && matchKategori
  })

  const totalBiaya = ingredients.reduce((sum, i) => sum + i.sub_total, 0)

  const statItems = [
    { label: 'Total Resep', value: recipes.length, icon: <ChefHat size={20} className="text-primary-500" /> },
    { label: 'Makanan', value: recipes.filter(r => r.kategori === 'MAKANAN').length, icon: <ChefHat size={20} className="text-orange-500" /> },
    { label: 'Minuman', value: recipes.filter(r => r.kategori === 'MINUMAN').length, icon: <ChefHat size={20} className="text-blue-500" /> },
    { label: 'Snack', value: recipes.filter(r => r.kategori === 'SNACK').length, icon: <ChefHat size={20} className="text-amber-500" /> },
  ]

  return (
    <div className="space-y-4">
      {loading ? (
        <>
          <SkeletonStatGrid count={4} />
          <SkeletonSpinner label="Memuat resep..." />
        </>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statItems.map((s, i) => (
              <Card key={i} title={s.label} action={s.icon}>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-2">{s.value}</p>
              </Card>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Cari resep..."
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
            <Button icon={<Plus size={16} />} onClick={() => { setEditRecipe(null); resetForm(); setModal('add') }}>
              Tambah Resep
            </Button>
          </div>

          {/* Table */}
          <Card title="Daftar Resep">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[700px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nama Resep</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Produk</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Kategori</th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Biaya</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Hasil</th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Margin</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 sm:px-4 py-10 text-center text-slate-400">Belum ada resep</td>
                      </tr>
                    ) : (
                      filtered.map(resep => (
                        <tr key={resep.kd_resep} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer" onClick={() => openDetail(resep)}>
                          <td className="px-3 sm:px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{resep.nama_resep}</td>
                          <td className="px-3 sm:px-4 py-3 text-slate-500">{resep.nama_produk || '-'}</td>
                          <td className="px-3 sm:px-4 py-3 text-center"><Badge label={resep.kategori} variant={resep.kategori === 'MAKANAN' ? 'amber' : resep.kategori === 'MINUMAN' ? 'blue' : resep.kategori === 'SNACK' ? 'yellow' : 'gray'} /></td>
                          <td className="px-3 sm:px-4 py-3 text-right text-slate-600 dark:text-slate-300">{resep.biaya_produksi ? formatRupiah(resep.biaya_produksi) : '-'}</td>
                          <td className="px-3 sm:px-4 py-3 text-center text-slate-600 dark:text-slate-300">{resep.hasil_produksi} {resep.satuan_hasil}</td>
                          <td className={`px-3 sm:px-4 py-3 text-right font-semibold ${resep.margin && resep.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {resep.margin != null ? `${resep.margin >= 0 ? '+' : ''}${resep.margin}%` : '-'}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => { setEditRecipe(resep); resetForm(resep); setModal('add') }}
                                className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 transition-colors"
                                title="Edit"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteRecipe(resep)}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                                title="Hapus"
                              >
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

          {/* Add/Edit Recipe Modal */}
          <Modal
            open={modal === 'add'}
            onClose={() => { setModal(null); setEditRecipe(null) }}
            title={editRecipe ? 'Edit Resep' : 'Tambah Resep'}
            size="lg"
            footer={
              <>
                <Button variant="secondary" onClick={() => { setModal(null); setEditRecipe(null) }} className="w-full sm:w-auto">Batal</Button>
                <Button loading={submitting} onClick={handleSave} className="w-full sm:w-auto">{editRecipe ? 'Simpan' : 'Tambah'}</Button>
              </>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Produk (Opsional)" value={form.kd_produk} onChange={e => setForm(prev => ({ ...prev, kd_produk: e.target.value }))} options={barangOptions} placeholder="Pilih Produk" />
              <Input label="Nama Resep *" value={form.nama_resep} onChange={e => setForm(prev => ({ ...prev, nama_resep: e.target.value }))} placeholder="Nama resep" />
              <Input label="Hasil Produksi *" type="number" value={form.hasil_produksi} onChange={e => setForm(prev => ({ ...prev, hasil_produksi: e.target.value }))} placeholder="1" />
              <Input label="Satuan Hasil *" value={form.satuan_hasil} onChange={e => setForm(prev => ({ ...prev, satuan_hasil: e.target.value }))} placeholder="porsi, gelas, pack" />
              <Select label="Kategori" value={form.kategori} onChange={e => setForm(prev => ({ ...prev, kategori: e.target.value as Resep['kategori'] }))} options={kategoriOpts} />
              <Input label="Waktu Produksi (menit)" type="number" value={form.waktu_produksi_menit} onChange={e => setForm(prev => ({ ...prev, waktu_produksi_menit: e.target.value }))} placeholder="30" />
              <div className="sm:col-span-2">
                <Textarea label="Petunjuk" value={form.petunjuk} onChange={e => setForm(prev => ({ ...prev, petunjuk: e.target.value }))} placeholder="Langkah-langkah pembuatan..." />
              </div>
            </div>
          </Modal>

          {/* Detail Modal */}
          <Modal
            open={modal === 'detail' && !!selectedRecipe}
            onClose={() => { setModal(null); setSelectedRecipe(null); setIngredients([]) }}
            title={selectedRecipe?.nama_resep ?? ''}
            size="lg"
          >
            {selectedRecipe && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-xs text-slate-500">Kategori</p>
                    <Badge label={selectedRecipe.kategori} variant={selectedRecipe.kategori === 'MAKANAN' ? 'amber' : selectedRecipe.kategori === 'MINUMAN' ? 'blue' : selectedRecipe.kategori === 'SNACK' ? 'yellow' : 'gray'} />
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-xs text-slate-500">Hasil</p>
                    <p className="font-bold text-slate-700 dark:text-slate-200">{selectedRecipe.hasil_produksi} {selectedRecipe.satuan_hasil}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-xs text-slate-500">Biaya Produksi</p>
                    <p className="font-bold text-primary-600">{formatRupiah(selectedRecipe.biaya_produksi ?? totalBiaya)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-xs text-slate-500">Margin</p>
                    <p className={`font-bold ${selectedRecipe.margin != null && selectedRecipe.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {selectedRecipe.margin != null ? `${selectedRecipe.margin >= 0 ? '+' : ''}${selectedRecipe.margin}%` : '-'}
                    </p>
                  </div>
                </div>

                {selectedRecipe.petunjuk && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-xs text-slate-500 mb-1">Petunjuk</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{selectedRecipe.petunjuk}</p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-700 dark:text-slate-200">Bahan Baku</h4>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" icon={<Calculator size={14} />} onClick={handleCalcCost}>Hitung Biaya</Button>
                    <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditIngredient(null); resetIngredientForm(); setIngredientModal(true) }}>Tambah Bahan</Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Nama Bahan</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">Qty</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">Satuan</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Harga/Unit</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Sub Total</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">% Terpakai</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {ingredients.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-8 text-center text-slate-400">Belum ada bahan</td>
                        </tr>
                      ) : (
                        ingredients.map(b => (
                          <tr key={b.kd_bahan_resep} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                            <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">{b.nama_bahan}</td>
                            <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">{b.qty}</td>
                            <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">{b.satuan}</td>
                            <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">{formatRupiah(b.harga_per_unit)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200">{formatRupiah(b.sub_total)}</td>
                            <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">{b.persen_terpakai != null ? `${b.persen_terpakai}%` : '-'}</td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => { setEditIngredient(b); resetIngredientForm(b); setIngredientModal(true) }} className="p-1 rounded hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500"><Edit3 size={12} /></button>
                                <button onClick={() => setDeleteIngredient(b)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={12} /></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {ingredients.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold">
                          <td colSpan={4} className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">Total Biaya</td>
                          <td className="px-3 py-2 text-right text-primary-600">{formatRupiah(totalBiaya)}</td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </Modal>

          {/* Ingredient Modal */}
          <Modal
            open={ingredientModal}
            onClose={() => { setIngredientModal(false); setEditIngredient(null) }}
            title={editIngredient ? 'Edit Bahan' : 'Tambah Bahan'}
            size="sm"
            footer={
              <>
                <Button variant="secondary" onClick={() => { setIngredientModal(false); setEditIngredient(null) }} className="w-full sm:w-auto">Batal</Button>
                <Button loading={submitting} onClick={handleSaveIngredient} className="w-full sm:w-auto">{editIngredient ? 'Simpan' : 'Tambah'}</Button>
              </>
            }
          >
            <div className="space-y-3">
              <Input label="Nama Bahan *" value={ingredientForm.nama_bahan} onChange={e => setIngredientForm(prev => ({ ...prev, nama_bahan: e.target.value }))} placeholder="Tepung terigu" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Qty *" type="number" value={ingredientForm.qty} onChange={e => setIngredientForm(prev => ({ ...prev, qty: e.target.value }))} placeholder="1" />
                <Input label="Satuan *" value={ingredientForm.satuan} onChange={e => setIngredientForm(prev => ({ ...prev, satuan: e.target.value }))} placeholder="kg, liter, pcs" />
              </div>
              <Input label="Harga per Unit *" type="number" value={ingredientForm.harga_per_unit} onChange={e => setIngredientForm(prev => ({ ...prev, harga_per_unit: e.target.value }))} placeholder="10000" />
              <Input label="% Terpakai" type="number" value={ingredientForm.persen_terpakai} onChange={e => setIngredientForm(prev => ({ ...prev, persen_terpakai: e.target.value }))} placeholder="100" helperText="Persentase bahan yang terpakai" />
            </div>
          </Modal>

          <ConfirmDialog
            open={!!deleteIngredient}
            onClose={() => setDeleteIngredient(null)}
            onConfirm={handleDeleteIngredient}
            title="Hapus Bahan"
            message={`Hapus bahan "${deleteIngredient?.nama_bahan}" dari resep?`}
            confirmText="Hapus"
            variant="danger"
            loading={submitting}
          />

          <ConfirmDialog
            open={!!deleteRecipe}
            onClose={() => setDeleteRecipe(null)}
            onConfirm={handleDeleteRecipe}
            title="Hapus Resep"
            message={`Resep "${deleteRecipe?.nama_resep}" akan dihapus.`}
            confirmText="Hapus"
            variant="danger"
            loading={submitting}
          >
            {deleteRecipe && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/70">
                <div className="flex justify-between"><span className="text-slate-500">Nama:</span><span className="font-semibold text-slate-800">{deleteRecipe.nama_resep}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Kategori:</span><span className="font-semibold text-slate-800">{deleteRecipe.kategori}</span></div>
              </div>
            )}
          </ConfirmDialog>
        </>
      )}
    </div>
  )
}
