import { useEffect, useState } from 'react'
import { Tag, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Gift, Percent, Clock, Package } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import { SkeletonPage } from '../components/Skeleton'
import { formatRupiah } from '../utils/format'

interface Promo {
  id: number
  code: string
  name: string
  type: 'PERCENTAGE' | 'FIXED' | 'BUY_X_GET_Y' | 'BUNDLE' | 'HAPPY_HOUR'
  value: number
  min_purchase: number
  max_discount?: number
  start_date?: string
  end_date?: string
  start_time?: string
  end_time?: string
  usage_limit?: number
  usage_count: number
  is_active: number
  conditions?: string
}

const TYPE_LABELS: Record<string, string> = {
  PERCENTAGE: 'Persentase (%)',
  FIXED: 'Potongan Tetap (Rp)',
  BUY_X_GET_Y: 'Beli X Gratis Y',
  BUNDLE: 'Paket Bundling',
  HAPPY_HOUR: 'Happy Hour',
}

const TYPE_ICONS: Record<string, any> = {
  PERCENTAGE: Percent,
  FIXED: Tag,
  BUY_X_GET_Y: Gift,
  BUNDLE: Package,
  HAPPY_HOUR: Clock,
}

export default function Promo() {
  const toast = useToast()
  const [promos, setPromos] = useState<Promo[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [selected, setSelected] = useState<Promo | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Promo | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'PERCENTAGE' as Promo['type'],
    value: '',
    min_purchase: '',
    max_discount: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    usage_limit: '',
    is_active: 1,
  })

  const load = async () => {
    setLoading(true)
    const r = await api<Promo[]>('promo:getAll')
    if (r.success) setPromos(r.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setForm({
      code: '',
      name: '',
      type: 'PERCENTAGE',
      value: '',
      min_purchase: '',
      max_discount: '',
      start_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      usage_limit: '',
      is_active: 1,
    })
  }

  const openAdd = () => {
    resetForm()
    setModal('add')
  }

  const openEdit = (promo: Promo) => {
    setSelected(promo)
    setForm({
      code: promo.code,
      name: promo.name,
      type: promo.type,
      value: promo.value.toString(),
      min_purchase: promo.min_purchase.toString(),
      max_discount: promo.max_discount?.toString() || '',
      start_date: promo.start_date?.split('T')[0] || '',
      end_date: promo.end_date?.split('T')[0] || '',
      start_time: promo.start_time || '',
      end_time: promo.end_time || '',
      usage_limit: promo.usage_limit?.toString() || '',
      is_active: promo.is_active,
    })
    setModal('edit')
  }

  const handleSave = async () => {
    if (!form.code || !form.name || !form.value || !form.min_purchase) {
      return toast('Mohon lengkapi semua kolom wajib', 'error')
    }

    const data = {
      code: form.code.toUpperCase(),
      name: form.name,
      type: form.type,
      value: parseFloat(form.value),
      min_purchase: parseFloat(form.min_purchase),
      max_discount: form.max_discount ? parseFloat(form.max_discount) : undefined,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      start_time: form.type === 'HAPPY_HOUR' ? form.start_time : null,
      end_time: form.type === 'HAPPY_HOUR' ? form.end_time : null,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : undefined,
      is_active: form.is_active,
    }

    setSaving(true)
    if (modal === 'add') {
      const r = await api('promo:create', data)
      setSaving(false)
      if (r.success) {
        toast('Promo berhasil dibuat')
        setModal(null)
        load()
      } else {
        toast(r.message as string, 'error')
      }
    } else if (selected) {
      const r = await api('promo:update', selected.id, data)
      setSaving(false)
      if (r.success) {
        toast('Promo berhasil diperbarui')
        setModal(null)
        load()
      } else {
        toast(r.message as string, 'error')
      }
    }
  }

  const handleToggle = async (promo: Promo) => {
    const newStatus = promo.is_active === 1 ? 0 : 1
    const r = await api('promo:update', promo.id, { is_active: newStatus })
    if (r.success) {
      toast(`Promo ${newStatus === 1 ? 'diaktifkan' : 'dinonaktifkan'}`)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    const r = await api('promo:delete', deleteConfirm.id)
    setDeleting(false)
    if (r.success) {
      toast('Promo berhasil dihapus')
      setDeleteConfirm(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  if (loading) return <SkeletonPage rows={5} />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="text-primary-500" size={28} />
            Kelola Promo & Diskon
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Buat dan kelola kode promo, diskon, dan penawaran khusus</p>
        </div>
        <Button onClick={openAdd} icon={<Plus size={16} />} className="w-full sm:w-auto">
          Buat Promo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-slate-500 text-sm">Total Promo</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{promos.length}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-slate-500 text-sm">Promo Aktif</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{promos.filter(p => p.is_active === 1).length}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-slate-500 text-sm">Promo Nonaktif</p>
            <p className="text-2xl font-bold text-slate-400 mt-1">{promos.filter(p => p.is_active === 0).length}</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-[900px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Kode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nama Promo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Tipe</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Nilai</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Min. Beli</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Terpakai</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {promos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-sm">
                      Belum ada promo. Buat promo pertama Anda!
                    </td>
                  </tr>
                ) : (
                  promos.map(promo => {
                    const Icon = TYPE_ICONS[promo.type] || Tag
                    return (
                      <tr key={promo.id} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded">
                            {promo.code}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{promo.name}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge label={TYPE_LABELS[promo.type] || promo.type} variant="blue" />
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-200">
                          {promo.type === 'PERCENTAGE' || promo.type === 'HAPPY_HOUR' 
                            ? `${promo.value}%` 
                            : formatRupiah(promo.value)}
                          {promo.max_discount && promo.type === 'PERCENTAGE' && (
                            <span className="text-xs text-slate-400 ml-1">max {formatRupiah(promo.max_discount)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-200">{formatRupiah(promo.min_purchase)}</td>
                        <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-200">
                          {promo.usage_limit ? `${promo.usage_count}/${promo.usage_limit}` : promo.usage_count}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {promo.is_active === 1 ? (
                            <Badge label="Aktif" variant="green" />
                          ) : (
                            <Badge label="Nonaktif" variant="gray" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => handleToggle(promo)}
                              className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-600 text-primary-500 transition-colors"
                              title={promo.is_active === 1 ? 'Nonaktifkan' : 'Aktifkan'}
                            >
                              {promo.is_active === 1 ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                            </button>
                            <button
                              onClick={() => openEdit(promo)}
                              className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-600 text-primary-500 transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(promo)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                              title="Hapus"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Buat Promo Baru' : 'Edit Promo'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto">Batal</Button>
            <Button onClick={handleSave} loading={saving} className="w-full sm:w-auto">Simpan</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Kode Promo *"
            value={form.code}
            onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="DISCOUNT20"
          />
          <Input
            label="Nama Promo *"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Disconto 20%"
          />
          
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Tipe Promo *</label>
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value as Promo['type'] })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <Input
            label={form.type === 'PERCENTAGE' || form.type === 'HAPPY_HOUR' ? 'Persentase (%) *' : 'Nilai Potongan (Rp) *'}
            type="number"
            value={form.value}
            onChange={e => setForm({ ...form, value: e.target.value })}
            placeholder={form.type === 'PERCENTAGE' ? '20' : '50000'}
          />

          <Input
            label="Min. Pembelian (Rp) *"
            type="number"
            value={form.min_purchase}
            onChange={e => setForm({ ...form, min_purchase: e.target.value })}
            placeholder="100000"
          />

          <Input
            label="Max. Diskon (Rp)"
            type="number"
            value={form.max_discount}
            onChange={e => setForm({ ...form, max_discount: e.target.value })}
            placeholder="50000"
          />

          <Input
            label="Tanggal Mulai"
            type="date"
            value={form.start_date}
            onChange={e => setForm({ ...form, start_date: e.target.value })}
          />

          <Input
            label="Tanggal Berakhir"
            type="date"
            value={form.end_date}
            onChange={e => setForm({ ...form, end_date: e.target.value })}
          />

          {(form.type === 'HAPPY_HOUR') && (
            <>
              <Input
                label="Jam Mulai (HH:MM)"
                type="time"
                value={form.start_time}
                onChange={e => setForm({ ...form, start_time: e.target.value })}
              />
              <Input
                label="Jam Berakhir (HH:MM)"
                type="time"
                value={form.end_time}
                onChange={e => setForm({ ...form, end_time: e.target.value })}
              />
            </>
          )}

          <Input
            label="Batasan Penggunaan (isi untuk unlimited)"
            type="number"
            value={form.usage_limit}
            onChange={e => setForm({ ...form, usage_limit: e.target.value })}
            placeholder="100"
          />
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Hapus Promo"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)} className="w-full sm:w-auto">Batal</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting} className="w-full sm:w-auto">Hapus</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
          Yakin ingin menghapus promo "{deleteConfirm?.name}"?
        </p>
      </Modal>
    </div>
  )
}