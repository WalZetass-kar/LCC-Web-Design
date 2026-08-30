import { useState, useEffect, useCallback } from 'react'
import { Eye, Save } from 'lucide-react'
import { api } from '../../utils/api'
import { useToast } from '../../contexts/ToastContext'
import { SkeletonPage } from '../../components/Skeleton'

interface PopupRow {
  id: string
  code: string
  title: string
  description: string | null
  cta_text: string | null
  cta_url: string | null
  whatsapp_number: string | null
  image_url: string | null
  pricing_html: string | null
  is_active: number | boolean
  force_popup?: number | boolean
  force_popup_until?: string | null
  severity?: 'info' | 'warning' | 'danger'
  dismissible?: number | boolean
}

const POPUP_META: Record<string, { label: string; color: string; desc: string }> = {
  DEMO_LIMIT:     { label: 'Demo Limit',     color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', desc: 'Muncul saat user demo melewati batas harian' },
  EXPIRED:        { label: 'Expired',        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',             desc: 'Muncul saat lisensi tidak aktif' },
  FEATURE_LOCKED: { label: 'Fitur Terkunci', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', desc: 'Muncul saat user klik fitur yang tidak ada di paket' },
}

export default function LicensePopupsPage() {
  const toast = useToast()
  const [popups, setPopups] = useState<PopupRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api<PopupRow[]>('license:getPopups')
    if (r.success) setPopups(r.data ?? [])
    else toast(r.message || 'Gagal memuat', 'error')
    setLoading(false)
  }, [toast])

  useEffect(() => { void load() }, [load])

  if (loading) return <SkeletonPage rows={6} />

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Popup ini muncul di aplikasi POS user. Perubahan langsung berlaku di semua device.
      </p>
      {loading ? <p className="text-slate-400 text-sm">Memuat…</p> : popups.map(p => <PopupCard key={p.id} popup={p} onSaved={load} />)}
    </div>
  )
}

function PopupCard({ popup, onSaved }: { popup: PopupRow; onSaved: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState<PopupRow>(popup)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const meta = POPUP_META[popup.code] || { label: popup.code, color: 'bg-slate-100 text-slate-600', desc: '' }

  async function save() {
    setSaving(true)
    const r = await api('license:updatePopup', popup.id, {
      title: form.title, description: form.description ?? '', cta_text: form.cta_text ?? '',
      cta_url: form.cta_url ?? '', whatsapp_number: form.whatsapp_number ?? '',
      image_url: form.image_url ?? '', pricing_html: form.pricing_html ?? '', is_active: !!form.is_active,
      force_popup: !!form.force_popup,
      force_popup_until: form.force_popup_until ?? '',
      severity: form.severity ?? 'info',
      dismissible: form.dismissible !== false && form.dismissible !== 0,
    })
    setSaving(false)
    if (r.success) { setSaved(true); setTimeout(() => setSaved(false), 2000); onSaved() }
    else toast(r.message || 'Gagal', 'error')
  }

  const inp = "w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${meta.color}`}>{meta.label}</span>
          <div>
            <p className="font-semibold text-slate-800 dark:text-white text-sm">{form.title}</p>
            <p className="text-xs text-slate-400">{meta.desc}</p>
          </div>
        </div>
        <div onClick={() => setForm({ ...form, is_active: form.is_active ? 0 : 1 })}
          className={`w-10 h-5 rounded-full cursor-pointer relative transition-colors ${form.is_active ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </div>
      </div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        {[['Judul','title'],['CTA Text','cta_text'],['CTA URL','cta_url'],['WhatsApp','whatsapp_number'],['Image URL','image_url']].map(([label, key]) => (
          <div key={key} className={key === 'image_url' ? 'col-span-2' : ''}>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">{label}</label>
            <input value={(form as any)[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} className={inp} />
          </div>
        ))}
        <div className="col-span-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Deskripsi</label>
          <textarea rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className={inp} />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Pricing HTML</label>
          <textarea rows={3} value={form.pricing_html || ''} onChange={e => setForm({ ...form, pricing_html: e.target.value })} className={`${inp} font-mono text-xs`} placeholder="<ul><li>Basic Rp 99.000/bln</li></ul>" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Severity</label>
          <select value={form.severity || 'info'} onChange={e => setForm({ ...form, severity: e.target.value as PopupRow['severity'] })} className={inp}>
            <option value="info">info</option>
            <option value="warning">warning</option>
            <option value="danger">danger</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Force Popup Until</label>
          <input type="datetime-local" value={toDateTimeLocal(form.force_popup_until)} onChange={e => setForm({ ...form, force_popup_until: e.target.value ? new Date(e.target.value).toISOString() : null })} className={inp} />
        </div>
        <label className="col-span-2 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
          <span>
            <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Force popup ke semua device</span>
            <span className="block text-xs text-slate-400">Jika aktif, semua aplikasi menampilkan popup ini pada sync berikutnya.</span>
          </span>
          <input type="checkbox" checked={!!form.force_popup} onChange={e => setForm({ ...form, force_popup: e.target.checked })} />
        </label>
        <label className="col-span-2 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Bisa ditutup user</span>
          <input type="checkbox" checked={form.dismissible !== false && form.dismissible !== 0} onChange={e => setForm({ ...form, dismissible: e.target.checked })} />
        </label>
      </div>
      <div className="px-5 pb-5 flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-medium">
          <Save className="w-4 h-4" />{saving ? 'Menyimpan…' : 'Simpan'}
        </button>
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('license:remote-popup', {
              detail: {
                popup: {
                  ...form,
                  cta_text: form.cta_text || 'Upgrade Sekarang',
                  severity: form.severity || 'warning',
                  dismissible: form.dismissible !== false && form.dismissible !== 0,
                },
                force: false,
              },
            }))
          }}
          className="flex items-center gap-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl px-4 py-2 text-sm font-medium transition"
        >
          <Eye className="w-4 h-4" /> Preview Popup
        </button>
        {saved && <span className="text-xs text-green-600 dark:text-green-400 font-medium"> Tersimpan</span>}
      </div>
    </div>
  )
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
