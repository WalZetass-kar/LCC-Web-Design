import { useState, useEffect, useCallback } from 'react'
import { FileText, Plus, Pencil, Trash2, Calendar, Search } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Textarea from '../components/Textarea'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { Skeleton, NoteCardSkeleton, FilterBarSkeleton } from '../components/Skeleton'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

interface Note {
  id: number
  tanggal: string
  judul: string
  isi: string
  jenis: 'info' | 'target' | 'masalah' | 'serah_terima'
  username: string
  created_at: string
}

const today = new Date().toISOString().split('T')[0]

export default function DailyNotes() {
  const toast = useToast()
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [selected, setSelected] = useState<Note | null>(null)
  const [search, setSearch] = useState('')
  const [filterDate, setFilterDate] = useState(today)
  const [form, setForm] = useState({ judul: '', isi: '', jenis: 'info' as Note['jenis'], tanggal: today })

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api<Note[]>('dailyNotes:getAll', filterDate, search)
    if (r.success) setNotes(r.data ?? [])
    setLoading(false)
  }, [filterDate, search])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setForm({ judul: '', isi: '', jenis: 'info', tanggal: today })
    setModal('add')
  }

  const openEdit = (n: Note) => {
    setSelected(n)
    setForm({ judul: n.judul, isi: n.isi, jenis: n.jenis, tanggal: n.tanggal })
    setModal('edit')
  }

  const handleSave = async () => {
    if (!form.judul.trim()) return toast('Judul wajib diisi', 'error')
    if (!form.isi.trim()) return toast('Isi catatan wajib diisi', 'error')

    const r = modal === 'add'
      ? await api('dailyNotes:create', { ...form, username: user?.nama_pengguna ?? '' })
      : await api('dailyNotes:update', selected!.id, form)

    if (r.success) {
      toast(modal === 'add' ? 'Catatan ditambahkan' : 'Catatan diperbarui', 'success')
      setModal(null)
      setSelected(null)
      load()
    } else {
      toast(r.message as string ?? 'Gagal menyimpan', 'error')
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    const r = await api('dailyNotes:delete', selected.id)
    if (r.success) {
      toast('Catatan dihapus', 'success')
      setConfirmDelete(false)
      setSelected(null)
      load()
    } else {
      toast(r.message as string ?? 'Gagal menghapus', 'error')
    }
  }

  const JENIS_STYLE: Record<string, string> = {
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    target: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    masalah: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    serah_terima: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  }

  const JENIS_LABEL: Record<string, string> = {
    info: 'Info',
    target: 'Target',
    masalah: 'Masalah',
    serah_terima: 'Serah Terima',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white">
          <FileText size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Daily Notes</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Catatan harian kasir & owner untuk komunikasi antar shift</p>
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <Input label="Tanggal" type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-40" />
          <div className="flex-1">
            <Input placeholder="Cari catatan..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={14} />} />
          </div>
          <Button icon={<Plus size={14} />} onClick={openAdd}>Tambah Catatan</Button>
        </div>
      </Card>

      {loading ? (
        <>
          <FilterBarSkeleton />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <NoteCardSkeleton key={i} />)}
          </div>
        </>
      ) : notes.length === 0 ? (
        <Card>
          <div className="py-16 text-center text-slate-400">
            <FileText size={40} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">Belum ada catatan</p>
            <p className="text-sm mt-1">Klik "Tambah Catatan" untuk membuat catatan pertama</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <Card key={note.id}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${JENIS_STYLE[note.jenis] ?? JENIS_STYLE.info}`}>
                      {JENIS_LABEL[note.jenis] ?? note.jenis}
                    </span>
                    <span className="text-xs text-slate-400">{note.username}</span>
                    <span className="text-xs text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-xs text-slate-400">
                      {new Date(note.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-1">{note.judul}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{note.isi}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(note)} aria-label="Edit catatan" className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-700 text-primary-500 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => { setSelected(note); setConfirmDelete(true) }} aria-label="Hapus catatan" className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modal === 'add' || modal === 'edit'}
        onClose={() => { setModal(null); setSelected(null) }}
        title={modal === 'add' ? 'Tambah Catatan' : 'Edit Catatan'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setModal(null); setSelected(null) }}>Batal</Button>
            <Button onClick={handleSave}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Tanggal" type="date" value={form.tanggal} onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))} />
          <Input label="Judul" value={form.judul} onChange={e => setForm(p => ({ ...p, judul: e.target.value }))} placeholder="Contoh: Target hari ini, Serah terima shift..." />
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Jenis</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(JENIS_LABEL) as Note['jenis'][]).map(j => (
                <button key={j} onClick={() => setForm(p => ({ ...p, jenis: j }))}
                  className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    form.jenis === j
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                  }`}>
                  {JENIS_LABEL[j]}
                </button>
              ))}
            </div>
          </div>
          <Textarea label="Isi Catatan" rows={5} value={form.isi} onChange={e => setForm(p => ({ ...p, isi: e.target.value }))} placeholder="Tulis catatan di sini..." />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => { setConfirmDelete(false); setSelected(null) }}
        onConfirm={handleDelete}
        title="Hapus Catatan"
        message={`Yakin ingin menghapus catatan "${selected?.judul}"?`}
      />
    </div>
  )
}
