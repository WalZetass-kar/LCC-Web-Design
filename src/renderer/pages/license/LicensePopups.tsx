import { useState, useEffect, useCallback } from 'react'
import { Save } from 'lucide-react'
import { api } from '../../utils/api'
import { useToast } from '../../contexts/ToastContext'

interface PopupRow { id: string; code: string; title: string; description: string | null; cta_text: string | null; cta_url: string | null; whatsapp_number: string | null; image_url: string | null; pricing_html: string | null; is_active: number | boolean }

const POPUP_META: Record<string, { label: string; color: string; desc: string }> = {
  DEMO_LIMIT:     { label: 'Demo Limit',     color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', desc: 'Muncul saat user demo melewati batas harian' },
  EXPIRED:        { label: 'Expired',        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',             desc: 'Muncul saat langganan habis' },
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
      </div>
      <div className="px-5 pb-5 flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-medium">
          <Save className="w-4 h-4" />{saving ? 'Menyimpan…' : 'Simpan'}
        </button>
        {saved && <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Tersimpan</span>}
      </div>
    </div>
  )
}
