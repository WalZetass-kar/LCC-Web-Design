import { useEffect, useRef, useCallback } from 'react'
import { useToast } from '../contexts/ToastContext'

interface UndoAction {
  id: string
  label: string
  undo: () => Promise<void> | void
}

export function useUndo() {
  const toast = useToast()
  const activeUndosRef = useRef(new Map<string, UndoAction>())
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const undoIdCounterRef = useRef(0)

  const showUndo = useCallback((label: string, undoFn: () => Promise<void> | void, duration = 5000) => {
    const id = `undo_${++undoIdCounterRef.current}`
    const action: UndoAction = { id, label, undo: undoFn }
    activeUndosRef.current.set(id, action)

    toast(`${label} — tekan Ctrl+Z untuk undo`, 'success')

    const timer = setTimeout(() => {
      activeUndosRef.current.delete(id)
      timersRef.current.delete(id)
    }, duration)
    timersRef.current.set(id, timer)

    return id
  }, [toast])

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        const entries = Array.from(activeUndosRef.current.entries())
        if (entries.length === 0) return

        const [id, action] = entries[entries.length - 1]
        e.preventDefault()

        if (timersRef.current.has(id)) {
          clearTimeout(timersRef.current.get(id))
          timersRef.current.delete(id)
        }
        activeUndosRef.current.delete(id)

        try {
          await action.undo()
          toast('Undo berhasil', 'success')
        } catch {
          toast('Undo gagal', 'error')
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      timersRef.current.forEach(timer => clearTimeout(timer))
      timersRef.current.clear()
      activeUndosRef.current.clear()
    }
  }, [toast])

  return { showUndo }
}
