import { useEffect, useState } from 'react'
import { Percent, Plus, Check, X, Edit2, Trash2 } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import { SkeletonPage } from '../components/Skeleton'

interface TaxSetting {
  id: number
  name: string
  rate: number
  is_active: number
}

export default function Tax() {
  const toast = useToast()
  const [taxes, setTaxes] = useState<TaxSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [selected, setSelected] = useState<TaxSetting | null>(null)
  const [form, setForm] = useState({ name: '', rate: '' })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<TaxSetting | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    const r = await api<TaxSetting[]>('tax:getAll')
    if (r.success) setTaxes(r.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setForm({ name: '', rate: '' })
    setModal('add')
  }

  const openEdit = (tax: TaxSetting) => {
    setSelected(tax)
    setForm({ name: tax.name, rate: tax.rate.toString() })
    setModal('edit')
  }

  const handleSave = async () => {
    if (!form.name || !form.rate) {
      return toast('Nama dan persentase pajak wajib diisi', 'error')
    }
    const rateNum = parseFloat(form.rate)
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      return toast('Persentase harus antara 0-100', 'error')
    }

    setSaving(true)
    if (modal === 'add') {
      const r = await api('tax:create', { name: form.name, rate: rateNum })
      setSaving(false)
      if (r.success) {
        toast('Pajak berhasil ditambahkan')
        setModal(null)
        load()
      } else {
        toast(r.message as string, 'error')
      }
    } else if (selected) {
      const r = await api('tax:update', selected.id, { name: form.name, rate: rateNum })
      setSaving(false)
      if (r.success) {
        toast('Pajak berhasil diperbarui')
        setModal(null)
        load()
      } else {
        toast(r.message as string, 'error')
      }
    }
  }

  const handleSetActive = async (tax: TaxSetting) => {
    const r = await api('tax:setActive', tax.id)
    if (r.success) {
      toast(`Pajak "${tax.name}" ditetapkan sebagai aktif`)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    const r = await api('tax:delete', deleteConfirm.id)
    setDeleting(false)
    if (r.success) {
      toast('Pajak berhasil dihapus')
      setDeleteConfirm(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const activeTax = taxes.find(t => t.is_active === 1)

  if (loading) return <SkeletonPage rows={5} />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Percent className="text-primary-500" size={28} />
            Pengaturan Pajak
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Kelola persentase PPN dan pajak lainnya</p>
        </div>
        <Button onClick={openAdd} icon={<Plus size={16} />} className="w-full sm:w-auto">
          Tambah Pajak
        </Button>
      </div>

      {activeTax && (
        <Card className="bg-gradient-to-r from-primary-500 to-primary-600 border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm">Pajak Aktif Saat Ini</p>
              <h2 className="text-3xl font-bold text-white mt-1">{activeTax.name}</h2>
              <p className="text-primary-200 text-lg mt-1">{activeTax.rate}%</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <Check className="text-white w-8 h-8" />
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-[500px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Nama Pajak</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Persentase</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {taxes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-400 text-sm">
                      Belum ada pengaturan pajak
                    </td>
                  </tr>
                ) : (
                  taxes.map(tax => (
                    <tr key={tax.id} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{tax.name}</td>
                      <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-200">{tax.rate}%</td>
                      <td className="px-4 py-3 text-center">
                        {tax.is_active === 1 ? (
                          <Badge label="Aktif" variant="green" />
                        ) : (
                          <Badge label="Nonaktif" variant="gray" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          {tax.is_active !== 1 && (
                            <button
                              onClick={() => handleSetActive(tax)}
                              className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 transition-colors"
                              title="Jadikan Aktif"
                            >
                              <Check size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(tax)}
                            className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-600 text-primary-500 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(tax)}
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

      {/* Add/Edit Modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Tambah Pajak' : 'Edit Pajak'}
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
            label="Nama Pajak *"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Contoh: PPN 10%"
          />
          <Input
            label="Persentase (%) *"
            type="number"
            value={form.rate}
            onChange={e => setForm({ ...form, rate: e.target.value })}
            placeholder="10"
          />
          <p className="text-xs text-slate-500">Masukkan angka antara 0-100</p>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Hapus Pajak"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)} className="w-full sm:w-auto">Batal</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting} className="w-full sm:w-auto">Hapus</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
          Yakin ingin menghapus pajak "{deleteConfirm?.name}"?
        </p>
      </Modal>
    </div>
  )
}