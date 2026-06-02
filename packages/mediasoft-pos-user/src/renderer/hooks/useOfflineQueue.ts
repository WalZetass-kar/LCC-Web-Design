import { useEffect, useState } from 'react'
import { useToast } from '../contexts/ToastContext'
import { api } from '../utils/api'
import { secureStorage } from '../utils/secureStorage'

interface QueuedOperation {
  id: string
  type: string
  data: any
  timestamp: number
  retries: number
}

const QUEUE_KEY = 'offline_queue'
const MAX_RETRIES = 3

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [queue, setQueue] = useState<QueuedOperation[]>([])
  const [syncing, setSyncing] = useState(false)
  const toast = useToast()

  // Load queue from encrypted local storage
  useEffect(() => {
    const saved = secureStorage.getItem(QUEUE_KEY)
    if (saved) {
      try {
        setQueue(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to load queue:', error)
      }
    }
  }, [])

  // Save queue to encrypted local storage
  useEffect(() => {
    secureStorage.setJSON(QUEUE_KEY, queue)
  }, [queue])

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast('Koneksi kembali! Sinkronisasi data...', 'success')
      syncQueue()
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast('Mode Offline: Data akan disimpan dan disinkronkan saat online', 'info')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Add operation to queue
  const addToQueue = (type: string, data: any) => {
    const operation: QueuedOperation = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
    }
    setQueue(prev => [...prev, operation])
    return operation.id
  }

  // Sync queue when online
  const syncQueue = async () => {
    if (!isOnline || syncing || queue.length === 0) return

    setSyncing(true)
    const failedOps: QueuedOperation[] = []

    for (const op of queue) {
      try {
        // Execute the queued operation
        await api(op.type, op.data)
      } catch (error) {
        console.error(`Failed to sync operation ${op.id}:`, error)
        
        if (op.retries < MAX_RETRIES) {
          failedOps.push({ ...op, retries: op.retries + 1 })
        } else {
          toast(`Gagal sinkronisasi operasi ${op.type} setelah ${MAX_RETRIES} percobaan`, 'error')
        }
      }
    }

    setQueue(failedOps)
    setSyncing(false)

    if (failedOps.length === 0) {
      toast('Semua data berhasil disinkronkan!', 'success')
    } else {
      toast(`${failedOps.length} operasi gagal disinkronkan`, 'info')
    }
  }

  // Clear queue
  const clearQueue = () => {
    setQueue([])
    secureStorage.removeItem(QUEUE_KEY)
  }

  return {
    isOnline,
    queue,
    queueCount: queue.length,
    syncing,
    addToQueue,
    syncQueue,
    clearQueue,
  }
}
