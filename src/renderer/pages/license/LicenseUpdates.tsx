import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { api } from '../../utils/api'
import { useToast } from '../../contexts/ToastContext'
import { SkeletonPage } from '../../components/Skeleton'

interface UpdateRule {
  id?: string
  platform: string
  latest_version: string
  minimum_version: string
  release_notes: string | null
  download_url: string | null
  mode: 'optional' | 'force'
  is_active: boolean
}

const emptyRule: UpdateRule = {
  platform: 'all',
  latest_version: '2.0.0',
  minimum_version: '2.0.0',
  release_notes: '',
  download_url: '',
  mode: 'optional',
  is_active: true,
}

export default function LicenseUpdatesPage() {
  const toast = useToast()
  const [rules, setRules] = useState<UpdateRule[]>([])
  const [form, setForm] = useState<UpdateRule>(emptyRule)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    const r = await api<UpdateRule[]>('license:getAppUpdates')
    if (r.success) {
      const rows = r.data ?? []
      setRules(rows)
      setForm(rows.find(row => row.platform === 'all') ?? emptyRule)
    } else toast(r.message || 'Gagal memuat update rule', 'error')
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const r = await api<UpdateRule>('license:saveAppUpdate', form)
    setSaving(false)
    if (r.success) {
      toast('Aturan update disimpan', 'success')
      await load()
    } else toast(r.message || 'Gagal menyimpan update', 'error')
  }

  const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800'

  if (loading) return <SkeletonPage rows={6} />

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Force Update Management</h3>
        <div className="mt-4 space-y-3">
          <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} className={input}>
            {['all', 'windows', 'linux', 'macos', 'android', 'ios'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input value={form.latest_version} onChange={e => setForm({ ...form, latest_version: e.target.value })} className={input} placeholder="Latest version" />
          <input value={form.minimum_version} onChange={e => setForm({ ...form, minimum_version: e.target.value })} className={input} placeholder="Minimum version" />
          <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value as 'optional' | 'force' })} className={input}>
            <option value="optional">OPTIONAL UPDATE</option>
            <option value="force">FORCE UPDATE</option>
          </select>
          <input value={form.download_url ?? ''} onChange={e => setForm({ ...form, download_url: e.target.value })} className={input} placeholder="Download URL" />
          <textarea value={form.release_notes ?? ''} onChange={e => setForm({ ...form, release_notes: e.target.value })} className={`${input} min-h-28`} placeholder="Release notes" />
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
            Aktif
          </label>
          <button disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
            <Save className="h-4 w-4" />{saving ? 'Menyimpan...' : 'Simpan Update Rule'}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Aturan Aktif</h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {rules.map(rule => (
            <button key={rule.id ?? rule.platform} onClick={() => setForm(rule)} className="block w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{rule.platform}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${rule.mode === 'force' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{rule.mode}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">latest {rule.latest_version} | minimum {rule.minimum_version}</p>
            </button>
          ))}
          {rules.length === 0 && <p className="p-6 text-sm text-slate-400">Belum ada aturan update.</p>}
        </div>
      </div>
    </div>
  )
}
