import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, FileWarning } from 'lucide-react'
import Card from '../../components/Card'
import Button from '../../components/Button'
import Badge from '../../components/Badge'
import { Skeleton } from '../../components/Skeleton'
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
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    api<ErrorResponse>('license:getErrors', { type }).then(r => {
      if (r.success) setData(r.data ?? null)
      else toast(r.message || 'Gagal memuat error log', 'error')
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [type])

  const typeEntries = Object.entries(data?.by_type ?? {})

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <Skeleton className="h-5 w-5 rounded mb-3" />
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-7 w-12" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <AlertTriangle className="mb-3 h-5 w-5 text-red-600" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Error</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{data?.total ?? 0}</p>
          </div>
          {typeEntries.slice(0, 3).map(([key, value]) => (
            <button key={key} onClick={() => setType(type === key ? '' : key)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                type === key
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
              }`}>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{key}</p>
              <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filter + Refresh */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <select value={type} onChange={e => setType(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <option value="">Semua error</option>
            {typeEntries.map(([item, count]) => (
              <option key={item} value={item}>{item} ({count})</option>
            ))}
          </select>
          <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={load} loading={loading}>Refresh</Button>
          {type && (
            <button onClick={() => setType('')} className="ml-auto text-xs text-primary-500 hover:text-primary-600 font-medium">
              Reset filter
            </button>
          )}
        </div>
      </Card>

      {/* Error List */}
      <Card title={`Error Log (${data?.total ?? 0})`}>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-slate-100 dark:border-slate-800 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : (data?.rows ?? []).length > 0 ? (
          <div className="space-y-2 -mx-6">
            {(data?.rows ?? []).map(error => (
              <button key={error.id} onClick={() => setExpandedId(expandedId === error.id ? null : error.id)}
                className="w-full text-left px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge label={error.error_type} variant="red" />
                  {error.app_version && <span className="text-[10px] text-slate-400 font-mono">v{error.app_version}</span>}
                  {error.platform && <Badge label={error.platform} variant="gray" />}
                  <span className="ml-auto text-[10px] text-slate-400">
                    {new Date(error.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{error.error_message}</p>
                <p className="text-xs text-slate-400 mt-0.5">{error.user_name} · {error.user_email}</p>
                {expandedId === error.id && error.stack_trace && (
                  <pre className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 overflow-x-auto max-h-40 font-mono leading-relaxed">
                    {error.stack_trace}
                  </pre>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400">
            <FileWarning size={36} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm font-medium">Tidak ada error</p>
            <p className="text-xs mt-1">{type ? `Tidak ada error tipe "${type}"` : 'Semua berjalan lancar'}</p>
          </div>
        )}
      </Card>
    </div>
  )
}
