import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { api } from '../../utils/api'
import { useToast } from '../../contexts/ToastContext'

interface ErrorResponse {
  total: number
  by_type: Record<string, number>
  rows: Array<{
    id: string
    user_name: string
    user_email: string
    device_id: string | null
    error_type: string
    error_message: string
    stack_trace: string | null
    app_version: string | null
    platform: string | null
    created_at: string
  }>
}

export default function LicenseErrorsPage() {
  const toast = useToast()
  const [data, setData] = useState<ErrorResponse | null>(null)
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    const r = await api<ErrorResponse>('license:getErrors', { type })
    setLoading(false)
    if (r.success) setData(r.data ?? null)
    else toast(r.message || 'Gagal memuat error log', 'error')
  }

  useEffect(() => { void load() }, [type])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <AlertTriangle className="mb-3 h-5 w-5 text-red-600" />
          <p className="text-xs text-slate-500">Jumlah Error</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{data?.total ?? 0}</p>
        </div>
        {Object.entries(data?.by_type ?? {}).slice(0, 3).map(([key, value]) => (
          <div key={key} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-500">{key}</p>
            <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <select value={type} onChange={e => setType(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="">Semua error</option>
          {Object.keys(data?.by_type ?? {}).map(item => <option key={item} value={item}>{item}</option>)}
        </select>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
          <RefreshCcw className="h-4 w-4" />Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50">
            <tr><th className="px-4 py-3">Error</th><th>User</th><th>Device</th><th>Waktu</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr><td colSpan={4} className="py-10 text-center text-slate-400">Memuat...</td></tr>
            ) : (data?.rows ?? []).length === 0 ? (
              <tr><td colSpan={4} className="py-10 text-center text-slate-400">Belum ada error.</td></tr>
            ) : data?.rows.map(row => (
              <tr key={row.id} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-800 dark:text-white">{row.error_type}</p>
                  <p className="mt-1 max-w-xl break-words text-xs text-slate-500">{row.error_message}</p>
                  {row.stack_trace && <details className="mt-2 text-xs text-slate-400"><summary>Stack trace</summary><pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-slate-200">{row.stack_trace}</pre></details>}
                </td>
                <td className="py-3"><p className="font-medium">{row.user_name}</p><p className="text-xs text-slate-400">{row.user_email}</p></td>
                <td className="py-3 text-xs text-slate-500">{row.platform || '-'} / {row.app_version || '-'}<br />{row.device_id || '-'}</td>
                <td className="py-3 pr-4 text-xs text-slate-400">{new Date(row.created_at).toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
