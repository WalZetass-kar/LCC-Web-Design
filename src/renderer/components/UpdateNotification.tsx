import { useState, useEffect } from 'react'
import { Download, X, AlertCircle } from 'lucide-react'
import Button from './Button'
import { api } from '../utils/api'

export default function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    checkForUpdates()
    const interval = setInterval(checkForUpdates, 1000 * 60 * 60) // Check every hour
    return () => clearInterval(interval)
  }, [])

  const checkForUpdates = async () => {
    const r = await api<any>('update:check')
    if (r.success && r.data?.hasUpdate) {
      setUpdateInfo(r.data)
    }
  }

  if (!updateInfo || dismissed || !updateInfo.hasUpdate) return null

  return (
    <div className={`fixed bottom-4 right-4 max-w-md p-4 rounded-lg shadow-lg ${
      updateInfo.isCritical ? 'bg-red-500' : 'bg-pink-500'
    } text-white z-50`}>
      <div className="flex items-start gap-3">
        {updateInfo.isCritical && <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
        <div className="flex-1">
          <h3 className="font-bold mb-1">
            {updateInfo.isCritical ? 'Update Penting Tersedia!' : 'Update Tersedia'}
          </h3>
          <p className="text-sm opacity-90 mb-2">
            Versi {updateInfo.latestVersion} telah tersedia
          </p>
          {updateInfo.releaseNotes && (
            <p className="text-xs opacity-75 mb-3">{updateInfo.releaseNotes}</p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.open(updateInfo.downloadUrl, '_blank')}
              icon={Download}
            >
              Download
            </Button>
            {!updateInfo.isCritical && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setDismissed(true)}
              >
                Nanti
              </Button>
            )}
          </div>
        </div>
        {!updateInfo.isCritical && (
          <button onClick={() => setDismissed(true)} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
