import { useState, useEffect, useCallback } from 'react'
import { Check } from 'lucide-react'
import { api } from '../../utils/api'
import { useToast } from '../../contexts/ToastContext'

interface PlanRow { id: string; code: string; name: string; price: number; duration_days: number; description: string | null; is_active: number | boolean }
interface FeatureRow { id: string; code: string; name: string; category: string | null; sort_order: number; is_enabled: number; limit_value: number | null }

const PLAN_COLORS: Record<string, string> = {
  DEMO: 'from-slate-500 to-slate-400',
  TRIAL_3_DAYS: 'from-slate-500 to-slate-400',
  BASIC: 'from-blue-500 to-blue-400',
  BASIC_MONTHLY: 'from-blue-500 to-blue-400',
  PRO: 'from-primary-600 to-primary-400',
  PRO_MONTHLY: 'from-primary-600 to-primary-400',
  ENTERPRISE: 'from-violet-600 to-purple-400',
}

export default function LicensePlansPage() {
  const toast = useToast()
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [editing, setEditing] = useState<PlanRow | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api<PlanRow[]>('license:getPlans')
    if (r.success) setPlans(r.data ?? [])
    else toast(r.message || 'Gagal memuat', 'error')
    setLoading(false)
  }, [toast])

  useEffect(() => { void load() }, [load])

  return (
    <div className="space-y-4">
      {loading ? <p className="text-slate-400 text-sm">Memuat…</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(p => {
            const gradient = PLAN_COLORS[p.code] || 'from-slate-500 to-slate-400'
            return (
              <div key={p.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                <div className={`bg-gradient-to-br ${gradient} p-5`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">{p.code}</p>
                      <h3 className="text-white text-xl font-bold">{p.name}</h3>
                    </div>
                    <button onClick={async () => { await api('license:updatePlan', p.id, { is_active: !p.is_active }); load() }}
                      className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${p.is_active ? 'bg-white/20 text-white' : 'bg-black/20 text-white/60'}`}>
                      {p.is_active ? 'Aktif' : 'Off'}
                    </button>
                  </div>
                  <p className="text-white text-2xl font-bold">{p.price === 0 ? 'Gratis' : `Rp ${Number(p.price).toLocaleString('id-ID')}`}</p>
                  <p className="text-white/70 text-xs mt-0.5">{p.duration_days} hari</p>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex-1">{p.description || '—'}</p>
                  <button onClick={() => setEditing(p)}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-2 text-sm font-medium">
                    Atur Fitur
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {editing && <PlanFeaturesModal plan={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function PlanFeaturesModal({ plan, onClose }: { plan: PlanRow; onClose: () => void }) {
  const toast = useToast()
  const [features, setFeatures] = useState<FeatureRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api<FeatureRow[]>('license:getPlanFeatures', plan.id).then(r => {
      if (r.success) setFeatures(r.data ?? [])
      setLoading(false)
    })
  }, [plan.id])

  function toggle(code: string) {
    setFeatures(arr => arr.map(f => f.code === code ? { ...f, is_enabled: f.is_enabled ? 0 : 1 } : f))
  }
  function setLimit(code: string, val: string) {
    setFeatures(arr => arr.map(f => f.code === code ? { ...f, limit_value: val === '' ? null : Number(val) } : f))
  }

  async function save() {
    setSaving(true)
    const r = await api('license:setPlanFeatures', plan.id, {
      features: features.map(f => ({ code: f.code, enabled: !!f.is_enabled, limit: f.limit_value }))
    })
    setSaving(false)
    if (r.success) { toast('Fitur berhasil disimpan', 'success'); onClose() }
    else toast(r.message || 'Gagal', 'error')
  }

  const grouped = features.reduce<Record<string, FeatureRow[]>>((acc, f) => {
    const k = f.category || 'lainnya'; (acc[k] = acc[k] || []).push(f); return acc
  }, {})

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-white">Fitur — {plan.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <div className="p-5">
          {loading ? <p className="text-slate-400 text-sm">Memuat…</p> : (
            <>
              <p className="text-xs text-slate-500 mb-4">Centang fitur aktif. Isi Limit untuk batasi per hari (kosong = unlimited).</p>
              <div className="max-h-[50vh] overflow-auto space-y-4 pr-1">
                {Object.entries(grouped).map(([cat, list]) => (
                  <div key={cat}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{cat}</p>
                    <div className="space-y-1">
                      {list.map(f => (
                        <div key={f.code} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${f.is_enabled ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                          <button type="button" onClick={() => toggle(f.code)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${f.is_enabled ? 'bg-primary-600 border-primary-600' : 'border-slate-300 dark:border-slate-600'}`}>
                            {f.is_enabled ? <Check className="w-3 h-3 text-white" /> : null}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{f.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{f.code}</p>
                          </div>
                          <input type="number" placeholder="∞" value={f.limit_value ?? ''}
                            onChange={e => setLimit(f.code, e.target.value)}
                            className="w-24 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-center bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm">Batal</button>
                <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm disabled:opacity-50">{saving ? 'Menyimpan…' : 'Simpan'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
