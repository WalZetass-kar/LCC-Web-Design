import { useEffect, useState } from 'react'
import { LayoutGrid, Table2, Plus, Edit3, Trash2, Circle, Square } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import ConfirmDialog from '../components/ConfirmDialog'
import Select from '../components/Select'
import { SkeletonStatGrid, SkeletonSpinner } from '../components/Skeleton'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'

interface FloorLayout {
  kd_layout: string
  nama: string
  created_at: string
}

interface Meja {
  kd_meja: string
  kd_layout?: string
  nomor_meja: number
  label: string
  kapasitas: number
  posisi_x: number
  posisi_y: number
  bentuk: 'BULAT' | 'PERSEGI'
  status: 'KOSONG' | 'TERISI' | 'RESERVASI' | 'MAINTENANCE'
}

interface TableSummary {
  total: number
  terisi: number
  kosong: number
  reservasi: number
}

const statusColors: Record<string, { badge: 'green' | 'red' | 'yellow' | 'gray'; bg: string; border: string }> = {
  KOSONG: { badge: 'green', bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-300 dark:border-emerald-700' },
  TERISI: { badge: 'red', bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-300 dark:border-red-700' },
  RESERVASI: { badge: 'yellow', bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-300 dark:border-amber-700' },
  MAINTENANCE: { badge: 'gray', bg: 'bg-slate-100 dark:bg-slate-800', border: 'border-slate-300 dark:border-slate-600' },
}

export default function TableManagement() {
  const toast = useToast()
  const [tables, setTables] = useState<Meja[]>([])
  const [layouts, setLayouts] = useState<FloorLayout[]>([])
  const [summary, setSummary] = useState<TableSummary>({ total: 0, terisi: 0, kosong: 0, reservasi: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState<Meja | null>(null)
  const [modal, setModal] = useState<'table' | 'layout' | null>(null)
  const [editTable, setEditTable] = useState<Meja | null>(null)
  const [editLayout, setEditLayout] = useState<FloorLayout | null>(null)
  const [deleteTable, setDeleteTable] = useState<Meja | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [activeLayout, setActiveLayout] = useState('')

  const [formTable, setFormTable] = useState({ nomor_meja: '', label: '', kapasitas: '', posisi_x: '', posisi_y: '', bentuk: 'BULAT' as 'BULAT' | 'PERSEGI', status: 'KOSONG' as Meja['status'], kd_layout: '' })
  const [formLayout, setFormLayout] = useState({ nama: '' })

  const load = async () => {
    const [r1, r2, r3] = await Promise.all([
      api<Meja[]>('table:getAll'),
      api<FloorLayout[]>('floor:getAll'),
      api<TableSummary>('table:getSummary'),
    ])
    if (r1.success) setTables(r1.data ?? [])
    if (r2.success) setLayouts(r2.data ?? [])
    if (r3.success) setSummary(r3.data ?? { total: 0, terisi: 0, kosong: 0, reservasi: 0 })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const resetFormTable = (meja?: Meja | null) => {
    setFormTable(meja ? {
      nomor_meja: String(meja.nomor_meja),
      label: meja.label,
      kapasitas: String(meja.kapasitas),
      posisi_x: String(meja.posisi_x),
      posisi_y: String(meja.posisi_y),
      bentuk: meja.bentuk,
      status: meja.status,
      kd_layout: meja.kd_layout ?? '',
    } : { nomor_meja: '', label: '', kapasitas: '', posisi_x: '', posisi_y: '', bentuk: 'BULAT', status: 'KOSONG', kd_layout: '' })
  }

  const handleSaveTable = async () => {
    if (!formTable.nomor_meja || !formTable.label || !formTable.kapasitas) {
      return toast('Nomor meja, label, dan kapasitas wajib diisi', 'error')
    }
    setSubmitting(true)
    const payload = {
      ...formTable,
      nomor_meja: parseInt(formTable.nomor_meja),
      kapasitas: parseInt(formTable.kapasitas),
      posisi_x: parseInt(formTable.posisi_x || '0'),
      posisi_y: parseInt(formTable.posisi_y || '0'),
    }
    const r = editTable
      ? await api('table:update', editTable.kd_meja, payload)
      : await api('table:create', payload)
    setSubmitting(false)
    if (r.success) {
      toast(editTable ? 'Meja diperbarui' : 'Meja ditambahkan')
      setModal(null)
      setEditTable(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleSaveLayout = async () => {
    if (!formLayout.nama) return toast('Nama layout wajib diisi', 'error')
    setSubmitting(true)
    const r = editLayout
      ? await api('floor:update', editLayout.kd_layout, formLayout)
      : await api('floor:create', formLayout)
    setSubmitting(false)
    if (r.success) {
      toast(editLayout ? 'Layout diperbarui' : 'Layout ditambahkan')
      setModal(null)
      setEditLayout(null)
      setFormLayout({ nama: '' })
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleUpdateStatus = async (meja: Meja, status: Meja['status']) => {
    const r = await api('table:updateStatus', meja.kd_meja, status)
    if (r.success) {
      toast(`Status meja ${meja.nomor_meja} diubah`)
      setSelectedTable(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleDeleteTable = async () => {
    if (!deleteTable) return
    setSubmitting(true)
    const r = await api('table:delete', deleteTable.kd_meja)
    setSubmitting(false)
    if (r.success) {
      toast('Meja dihapus')
      setDeleteTable(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const layoutTables = tables.filter(t => !activeLayout || t.kd_layout === activeLayout)
  const layoutNames = layouts.map(l => ({ value: l.kd_layout, label: l.nama }))

  const statItems = [
    { label: 'Total Meja', value: summary.total, icon: <Table2 size={20} className="text-primary-500" /> },
    { label: 'Terisi', value: summary.terisi, icon: <Table2 size={20} className="text-red-500" /> },
    { label: 'Kosong', value: summary.kosong, icon: <Table2 size={20} className="text-emerald-500" /> },
    { label: 'Reservasi', value: summary.reservasi, icon: <Table2 size={20} className="text-amber-500" /> },
  ]

  return (
    <div className="space-y-4">
      {loading ? (
        <>
          <SkeletonStatGrid count={4} />
          <SkeletonSpinner label="Memuat denah meja..." />
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
              <Select
                value={activeLayout}
                onChange={e => setActiveLayout(e.target.value)}
                options={layoutNames}
                placeholder="Semua Layout"
                className="w-48"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" icon={<LayoutGrid size={16} />} onClick={() => { setEditLayout(null); setFormLayout({ nama: '' }); setModal('layout') }}>
                Kelola Layout
              </Button>
              <Button size="sm" icon={<Plus size={16} />} onClick={() => { setEditTable(null); resetFormTable(); setModal('table') }}>
                Tambah Meja
              </Button>
            </div>
          </div>

          {/* Floor Plan */}
          <Card title="Denah Meja" action={activeLayout && <Badge label={layouts.find(l => l.kd_layout === activeLayout)?.nama ?? ''} variant="blue" />}>
            <div className="relative min-h-[400px] bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-4">
              {layoutTables.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-slate-400 dark:text-slate-500 text-sm">Belum ada meja. Tambah meja untuk memulai.</p>
                </div>
              ) : (
                layoutTables.map(meja => {
                  const sc = statusColors[meja.status] ?? statusColors.KOSONG
                  const isCircle = meja.bentuk === 'BULAT'
                  return (
                    <div
                      key={meja.kd_meja}
                      className={`absolute cursor-pointer border-2 ${sc.border} ${sc.bg} rounded-xl p-2 flex flex-col items-center justify-center transition-all hover:scale-110 hover:shadow-lg`}
                      style={{ left: meja.posisi_x, top: meja.posisi_y, width: 96, height: isCircle ? 96 : 80, borderRadius: isCircle ? '50%' : undefined }}
                      onClick={() => setSelectedTable(meja)}
                    >
                      {isCircle ? <Circle size={16} className="text-slate-400" /> : <Square size={14} className="text-slate-400" />}
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{meja.nomor_meja}</span>
                      <span className="text-[10px] text-slate-500">{meja.kapasitas} org</span>
                    </div>
                  )
                })
              )}
            </div>
          </Card>

          {/* Table List */}
          <Card title="Daftar Meja">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[640px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nomor</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Label</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Kapasitas</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Bentuk</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {layoutTables.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 sm:px-4 py-10 text-center text-slate-400">Belum ada meja</td>
                      </tr>
                    ) : (
                      layoutTables.map(meja => {
                        const sc = statusColors[meja.status] ?? statusColors.KOSONG
                        return (
                          <tr key={meja.kd_meja} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-3 sm:px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{meja.nomor_meja}</td>
                            <td className="px-3 sm:px-4 py-3 text-slate-600 dark:text-slate-300">{meja.label}</td>
                            <td className="px-3 sm:px-4 py-3 text-center text-slate-600 dark:text-slate-300">{meja.kapasitas}</td>
                            <td className="px-3 sm:px-4 py-3 text-center text-slate-600 dark:text-slate-300">{meja.bentuk}</td>
                            <td className="px-3 sm:px-4 py-3 text-center">
                              <Badge label={meja.status} variant={sc.badge} />
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => { setEditTable(meja); resetFormTable(meja); setModal('table') }}
                                  className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 transition-colors"
                                  title="Edit"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => setDeleteTable(meja)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                                  title="Hapus"
                                >
                                  <Trash2 size={14} />
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

          {/* Table Detail Modal */}
          <Modal open={!!selectedTable} onClose={() => setSelectedTable(null)} title={`Meja ${selectedTable?.nomor_meja ?? ''}`} size="sm">
            {selectedTable && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status</span>
                  <Badge label={selectedTable.status} variant={statusColors[selectedTable.status]?.badge ?? 'gray'} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Label</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedTable.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Kapasitas</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedTable.kapasitas} orang</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Bentuk</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedTable.bentuk}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Posisi</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">X:{selectedTable.posisi_x} Y:{selectedTable.posisi_y}</span>
                </div>
                <div className="pt-2 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Ubah Status</p>
                  <div className="flex flex-wrap gap-2">
                    {(['KOSONG', 'TERISI', 'RESERVASI', 'MAINTENANCE'] as Meja['status'][]).map(s => (
                      <Button
                        key={s}
                        size="sm"
                        variant={selectedTable.status === s ? 'primary' : 'secondary'}
                        onClick={() => handleUpdateStatus(selectedTable, s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Modal>

          {/* Table Form Modal */}
          <Modal
            open={modal === 'table'}
            onClose={() => { setModal(null); setEditTable(null) }}
            title={editTable ? 'Edit Meja' : 'Tambah Meja'}
            size="md"
            footer={
              <>
                <Button variant="secondary" onClick={() => { setModal(null); setEditTable(null) }} className="w-full sm:w-auto">Batal</Button>
                <Button loading={submitting} onClick={handleSaveTable} className="w-full sm:w-auto">{editTable ? 'Simpan' : 'Tambah'}</Button>
              </>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Nomor Meja *" type="number" value={formTable.nomor_meja} onChange={e => setFormTable(prev => ({ ...prev, nomor_meja: e.target.value }))} />
              <Input label="Label *" value={formTable.label} onChange={e => setFormTable(prev => ({ ...prev, label: e.target.value }))} placeholder="Meja 1" />
              <Input label="Kapasitas *" type="number" value={formTable.kapasitas} onChange={e => setFormTable(prev => ({ ...prev, kapasitas: e.target.value }))} placeholder="4" />
              <Select label="Bentuk" value={formTable.bentuk} onChange={e => setFormTable(prev => ({ ...prev, bentuk: e.target.value as 'BULAT' | 'PERSEGI' }))} options={[{ value: 'BULAT', label: 'Bulat' }, { value: 'PERSEGI', label: 'Persegi' }]} />
              <Input label="Posisi X" type="number" value={formTable.posisi_x} onChange={e => setFormTable(prev => ({ ...prev, posisi_x: e.target.value }))} placeholder="0" />
              <Input label="Posisi Y" type="number" value={formTable.posisi_y} onChange={e => setFormTable(prev => ({ ...prev, posisi_y: e.target.value }))} placeholder="0" />
              <Select label="Layout" value={formTable.kd_layout} onChange={e => setFormTable(prev => ({ ...prev, kd_layout: e.target.value }))} options={layoutNames} placeholder="Pilih Layout" />
              <Select label="Status" value={formTable.status} onChange={e => setFormTable(prev => ({ ...prev, status: e.target.value as Meja['status'] }))} options={[
                { value: 'KOSONG', label: 'Kosong' }, { value: 'TERISI', label: 'Terisi' }, { value: 'RESERVASI', label: 'Reservasi' }, { value: 'MAINTENANCE', label: 'Maintenance' },
              ]} />
            </div>
          </Modal>

          {/* Layout Form Modal */}
          <Modal
            open={modal === 'layout'}
            onClose={() => { setModal(null); setEditLayout(null) }}
            title={editLayout ? 'Edit Layout' : 'Tambah Layout'}
            size="sm"
            footer={
              <>
                <Button variant="secondary" onClick={() => { setModal(null); setEditLayout(null) }} className="w-full sm:w-auto">Batal</Button>
                <Button loading={submitting} onClick={handleSaveLayout} className="w-full sm:w-auto">{editLayout ? 'Simpan' : 'Tambah'}</Button>
              </>
            }
          >
            <Input label="Nama Layout *" value={formLayout.nama} onChange={e => setFormLayout({ nama: e.target.value })} placeholder="Lantai 1" />
            {layouts.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase">Layout Existing</p>
                {layouts.map(l => (
                  <div key={l.kd_layout} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <span className="text-sm text-slate-700 dark:text-slate-200">{l.nama}</span>
                    <button
                      onClick={() => { setEditLayout(l); setFormLayout({ nama: l.nama }) }}
                      className="p-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500"
                    >
                      <Edit3 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Modal>

          <ConfirmDialog
            open={!!deleteTable}
            onClose={() => setDeleteTable(null)}
            onConfirm={handleDeleteTable}
            title="Hapus Meja"
            message={`Meja ${deleteTable?.label ?? ''} akan dihapus.`}
            confirmText="Hapus"
            variant="danger"
            loading={submitting}
          >
            {deleteTable && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/70">
                <div className="flex justify-between gap-3"><span className="text-slate-500">Nomor</span><span className="font-semibold text-slate-800">{deleteTable.nomor_meja}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Label</span><span className="font-semibold text-slate-800">{deleteTable.label}</span></div>
              </div>
            )}
          </ConfirmDialog>
        </>
      )}
    </div>
  )
}
