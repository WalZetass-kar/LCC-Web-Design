import { useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'

const IDLE_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const WARNING_TIME = 2 * 60 * 1000 // 2 minutes before timeout

export function useSessionTimeout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const timeoutRef = useRef<NodeJS.Timeout>()
  const warningRef = useRef<NodeJS.Timeout>()
  const lastActivityRef = useRef<number>(Date.now())

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)

    // Set warning timer (2 minutes before logout)
    warningRef.current = setTimeout(() => {
      toast('Sesi akan berakhir dalam 2 menit. Lakukan aktivitas untuk tetap login.', 'info')
    }, IDLE_TIMEOUT - WARNING_TIME)

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      logout()
      navigate('/login')
      toast('Sesi berakhir karena tidak ada aktivitas selama 30 menit', 'error')
    }, IDLE_TIMEOUT)
  }, [logout, navigate, toast])

  useEffect(() => {
    if (!user) return

    // Events that count as activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

    const handleActivity = () => {
      resetTimer()
    }

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity)
    })

    // Initial timer
    resetTimer()

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
    }
  }, [user, resetTimer])

  return {
    lastActivity: lastActivityRef.current,
    resetTimer,
  }
}
