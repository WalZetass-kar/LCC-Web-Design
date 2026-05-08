import { useEffect, useState, useCallback } from 'react'
import {
  BookOpen, Plus, Edit2, Trash2, X, Check, ChevronRight,
  Clock, Search, FileText,
} from 'lucide-react'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import type { Tutorial } from '../../shared/types'

// Simple markdown-like renderer (bold, headings, lists, code)
function renderContent(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    if (line.startsWith('## '))
      return <h2 key={i} className="text-lg font-bold text-slate-800 dark:text-white mt-6 mb-3 first:mt-0">{line.slice(3)}</h2>
    if (line.startsWith('### '))
      return <h3 key={i} className="text-base font-semibold text-slate-700 dark:text-slate-200 mt-4 mb-2">{line.slice(4)}</h3>
    if (line.startsWith('- ') || line.startsWith('* '))
      return (
        <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 ml-4 mb-1.5">
          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: boldify(line.slice(2)) }} />
        </li>
      )
    if (/^\d+\./.test(line)) {
      const [num, ...rest] = line.split('. ')
      return (
        <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 ml-4 mb-1.5">
          <span className="shrink-0 font-semibold text-primary-600 dark:text-primary-500 min-w-[1.5rem]">{num}.</span>
          <span dangerouslySetInnerHTML={{ __html: boldify(rest.join('. ')) }} />
        </li>
      )
    }
    if (line.trim() === '') return <div key={i} className="h-3" />
    return (
      <p key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-2"
        dangerouslySetInnerHTML={{ __html: boldify(line) }}
      />
    )
  })
}

function boldify(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-800 dark:text-white">$1</strong>')
    .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs font-mono text-primary-600 dark:text-primary-400">$1</code>')
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Form Modal ─────────────────────────────────────────────────────────────

interface FormModalProps {
  initial?: Tutorial | null
  onClose: () => void
  onSave: () => void
}

function FormModal({ initial, onClose, onSave }: FormModalProps) {
  const toast = useToast()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return toast('Judul wajib diisi', 'error')
    if (!content.trim()) return toast('Konten wajib diisi', 'error')
    setSaving(true)
    const r = initial
      ? await api('tutorial:update', initial.id, { title, content })
      : await api('tutorial:create', { title, content })
    setSaving(false)
    if (r.success) {
      toast(r.message as string || 'Berhasil disimpan')
      onSave()
    } else {
      toast(r.message as string || 'Gagal menyimpan', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <h3 className="font-bold text-slate-800 dark:text-white">
            {initial ? 'Edit Tutorial' : 'Tambah Tutorial'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
            <X size={18} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Judul</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary-400"
              placeholder="Judul tutorial..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
              Konten <span className="text-slate-400 font-normal normal-case">(Markdown: **bold**, ## Heading, - List, `code`)</span>
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={14}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary-400 font-mono resize-none"
              placeholder="Tulis konten tutorial..."
            />
          </div>
        </div>
        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:from-primary-700 hover:to-primary-600 transition-all shadow-md disabled:opacity-60 flex items-center gap-2"
          >
            {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check size={14} />}
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Tutorials() {
  const toast = useToast()
  const { user } = useAuth()
  const [tutorials, setTutorials] = useState<Tutorial[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Tutorial | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Tutorial | null>(null)

  const isAdmin = ['developer', 'superadmin', 'admin'].includes(user?.hak_akses ?? '')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api<Tutorial[]>('tutorial:getAll')
    if (r.success) {
      setTutorials(r.data ?? [])
      if (!selected && (r.data ?? []).length > 0) setSelected((r.data ?? [])[0])
    }
    setLoading(false)
  }, [selected])

  useEffect(() => { load() }, [load])

  const filtered = tutorials.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (t: Tutorial) => {
    if (!confirm(`Hapus tutorial "${t.title}"?`)) return
    const r = await api('tutorial:delete', t.id)
    if (r.success) {
      toast('Tutorial dihapus')
      if (selected?.id === t.id) setSelected(null)
      load()
    } else {
      toast(r.message as string || 'Gagal menghapus', 'error')
    }
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* Sidebar List */}
      <div className="w-64 shrink-0 flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari tutorial..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        {/* Add button (admin only) */}
        {isAdmin && (
          <button
            onClick={() => { setEditTarget(null); setShowForm(true) }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md hover:from-primary-700 hover:to-primary-600 transition-all"
          >
            <Plus size={14} /> Tambah Tutorial
          </button>
        )}

        {/* Tutorial list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
              Belum ada tutorial
            </div>
          ) : filtered.map(t => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 group
                ${selected?.id === t.id
                  ? 'bg-gradient-to-r from-primary-500 to-primary-400 text-white shadow-md'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
            >
              <p className={`text-sm font-medium truncate leading-tight ${selected?.id === t.id ? 'text-white' : ''}`}>
                {t.title}
              </p>
              <p className={`text-xs mt-0.5 flex items-center gap-1 ${selected?.id === t.id ? 'text-white/70' : 'text-slate-400'}`}>
                <Clock size={10} /> {formatDate(t.created_at)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="flex-1 glass-card overflow-y-auto scrollbar-thin">
        {!selected ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <FileText size={48} className="mb-3 opacity-20" />
            <p className="text-sm">Pilih tutorial di sebelah kiri</p>
          </div>
        ) : (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex-1">
                {/* Breadcrumb */}
                <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
                  <BookOpen size={12} />
                  <span>Tutorial</span>
                  <ChevronRight size={10} />
                  <span className="text-primary-500 font-medium truncate">{selected.title}</span>
                </div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">{selected.title}</h1>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Clock size={10} /> Ditambahkan {formatDate(selected.created_at)}
                </p>
              </div>
              {/* Admin actions */}
              {isAdmin && (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => { setEditTarget(selected); setShowForm(true) }}
                    className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-500 transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(selected)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                    title="Hapus"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-100 dark:bg-slate-700 mb-5" />

            {/* Content */}
            <div className="prose prose-sm max-w-none space-y-2">
              {renderContent(selected.content)}
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <FormModal
          initial={editTarget}
          onClose={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false)
            load().then(() => {
              // if editing, refresh selected with updated data
              if (editTarget) {
                const updated = tutorials.find(t => t.id === editTarget.id)
                if (updated) setSelected(updated)
              }
            })
          }}
        />
      )}
    </div>
  )
}
