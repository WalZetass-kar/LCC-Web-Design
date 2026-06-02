import { useEffect, useState } from 'react'
import { Award, Plus, Edit2, Trash2, Star, Gift, TrendingUp } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import { SkeletonPage } from '../components/Skeleton'

interface LoyaltyTier {
  id: number
  name: string
  min_points: number
  discount_percent: number
  benefits: string
  color: string
}

const DEFAULT_TIERS = [
  { name: 'Bronze', min_points: 0, discount_percent: 0, benefits: '1 point per Rp 10.000', color: '#CD7F32' },
  { name: 'Silver', min_points: 500, discount_percent: 2, benefits: '1.2x point + 2% diskon', color: '#C0C0C0' },
  { name: 'Gold', min_points: 2000, discount_percent: 5, benefits: '1.5x point + 5% diskon', color: '#FFD700' },
  { name: 'Platinum', min_points: 5000, discount_percent: 10, benefits: '2x point + 10% diskon', color: '#E5E4E2' },
]

export default function Loyalty() {
  const toast = useToast()
  const [tiers, setTiers] = useState<LoyaltyTier[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [selected, setSelected] = useState<LoyaltyTier | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<LoyaltyTier | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    min_points: '',
    discount_percent: '',
    benefits: '',
    color: '#FFD700',
  })

  const load = async () => {
    setLoading(true)
    const r = await api<LoyaltyTier[]>('loyalty:getTiers')
    if (r.success && r.data && r.data.length > 0) {
      setTiers(r.data)
    } else {
      // Initialize default tiers
      for (const tier of DEFAULT_TIERS) {
        await api('loyalty:createTier', tier)
      }
      const r2 = await api<LoyaltyTier[]>('loyalty:getTiers')
      if (r2.success) setTiers(r2.data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setForm({ name: '', min_points: '', discount_percent: '', benefits: '', color: '#FFD700' })
  }

  const openAdd = () => {
    resetForm()
    setModal('add')
  }

  const openEdit = (tier: LoyaltyTier) => {
    setSelected(tier)
    setForm({
      name: tier.name,
      min_points: tier.min_points.toString(),
      discount_percent: tier.discount_percent.toString(),
      benefits: tier.benefits || '',
      color: tier.color || '#FFD700',
    })
    setModal('edit')
  }

  const handleSave = async () => {
    if (!form.name || !form.min_points) {
      return toast('Nama dan poin minimum wajib diisi', 'error')
    }

    const data = {
      name: form.name,
      min_points: parseInt(form.min_points),
      discount_percent: parseInt(form.discount_percent) || 0,
      benefits: form.benefits,
      color: form.color,
    }

    setSaving(true)
    if (modal === 'add') {
      const r = await api('loyalty:createTier', data)
      setSaving(false)
      if (r.success) {
        toast('Tier berhasil dibuat')
        setModal(null)
        load()
      } else {
        toast(r.message as string, 'error')
      }
    } else if (selected) {
      const r = await api('loyalty:updateTier', selected.id, data)
      setSaving(false)
      if (r.success) {
        toast('Tier berhasil diperbarui')
        setModal(null)
        load()
      } else {
        toast(r.message as string, 'error')
      }
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    const r = await api('loyalty:deleteTier', deleteConfirm.id)
    setDeleting(false)
    if (r.success) {
      toast('Tier berhasil dihapus')
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
            <Award className="text-primary-500" size={28} />
            Program Loyalty & Poin
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Kelola tier dan sistem poin pelanggan</p>
        </div>
        <Button onClick={openAdd} icon={<Plus size={16} />} className="w-full sm:w-auto">
          Tambah Tier
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-amber-500 to-orange-600 border-none">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <Gift className="text-white w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Sistem Poin</h2>
            <p className="text-amber-100">1 point per Rp 10.000 | 1 point = Rp 1.000 diskon</p>
          </div>
        </div>
      </Card>

      {/* Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiers.map((tier, idx) => (
          <Card key={tier.id} className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10" style={{ backgroundColor: tier.color }} />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: tier.color + '30' }}>
                <Star className="w-6 h-6" style={{ color: tier.color }} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">{tier.name}</h3>
                <p className="text-xs text-slate-500">Min. {tier.min_points} poin</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Diskon</span>
                <span className="font-semibold text-green-600">{tier.discount_percent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Multiplier</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{1 + idx * 0.25}x</span>
              </div>
            </div>
            {tier.benefits && (
              <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                {tier.benefits}
              </p>
            )}
            <div className="flex gap-1 mt-4">
              <Button variant="secondary" size="sm" onClick={() => openEdit(tier)} className="flex-1">
                <Edit2 size={14} />
              </Button>
              <Button variant="danger" size="sm" onClick={() => setDeleteConfirm(tier)} className="flex-1">
                <Trash2 size={14} />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* How it works */}
      <Card title="Cara Kerja">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-2">
              <span className="text-primary-600 font-bold">1</span>
            </div>
            <p className="font-medium">Belanja Dapat Poin</p>
            <p className="text-slate-500 text-xs">Setiap Rp 10.000 mendapat 1 point</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-2">
              <span className="text-primary-600 font-bold">2</span>
            </div>
            <p className="font-medium">Naik Tier</p>
            <p className="text-slate-500 text-xs">Kumpulkan poin untuk naik ke tier lebih tinggi</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-2">
              <span className="text-primary-600 font-bold">3</span>
            </div>
            <p className="font-medium">Tukar Poin</p>
            <p className="text-slate-500 text-xs">1 point = Rp 1.000 diskon untuk pembelian berikutnya</p>
          </div>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Tambah Tier' : 'Edit Tier'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto">Batal</Button>
            <Button onClick={handleSave} loading={saving} className="w-full sm:w-auto">Simpan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nama Tier *"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Gold"
          />
          <Input
            label="Poin Minimum *"
            type="number"
            value={form.min_points}
            onChange={e => setForm({ ...form, min_points: e.target.value })}
            placeholder="1000"
          />
          <Input
            label="Diskon (%)"
            type="number"
            value={form.discount_percent}
            onChange={e => setForm({ ...form, discount_percent: e.target.value })}
            placeholder="5"
          />
          <Input
            label="Warna"
            type="color"
            value={form.color}
            onChange={e => setForm({ ...form, color: e.target.value })}
            className="h-10"
          />
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Benefit</label>
            <textarea
              value={form.benefits}
              onChange={e => setForm({ ...form, benefits: e.target.value })}
              placeholder="1.5x point + 5% diskon"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              rows={2}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Hapus Tier"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)} className="w-full sm:w-auto">Batal</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting} className="w-full sm:w-auto">Hapus</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Yakin ingin menghapus tier "{deleteConfirm?.name}"?
        </p>
      </Modal>
    </div>
  )
}