import { useEffect, useState } from 'react'
import { WifiOff, AlertCircle, CheckCircle } from 'lucide-react'
import { api } from '../utils/api'

type Status = 'ok' | 'error' | 'checking'

export default function OfflineIndicator() {
  const [status, setStatus] = useState<Status>('checking')
  const [showOk, setShowOk] = useState(false)

  const check = async () => {
    try {
      const r = await api('identitas:get')
      if (r.success) {
        setStatus('ok')
        setShowOk(true)
        setTimeout(() => setShowOk(false), 3000)
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

  if (status === 'ok' && !showOk) return null

  if (status === 'ok') {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500 text-white text-xs font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2">
        <CheckCircle size={14} />
        Database terhubung
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500 text-white text-xs font-medium shadow-lg">
        <WifiOff size={14} />
        <span>Database bermasalah</span>
        <button onClick={check} className="ml-1 underline hover:no-underline">Coba lagi</button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-medium shadow-lg">
      <AlertCircle size={14} className="animate-pulse" />
      Memeriksa koneksi...
    </div>
  )
}
