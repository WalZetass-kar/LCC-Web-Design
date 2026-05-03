import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function useKeyboardShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // Allow ESC to close modals
        if (e.key === 'Escape') return
        return
      }

      // F1-F12 shortcuts
      if (e.key === 'F1') {
        e.preventDefault()
        navigate('/transaksi')
      } else if (e.key === 'F2') {
        e.preventDefault()
        navigate('/produk')
      } else if (e.key === 'F3') {
        e.preventDefault()
        navigate('/riwayat')
      } else if (e.key === 'F4') {
        e.preventDefault()
        navigate('/customer')
      } else if (e.key === 'F5') {
        e.preventDefault()
        navigate('/supplier')
      } else if (e.key === 'F6') {
        e.preventDefault()
        navigate('/pembelian')
      } else if (e.key === 'F7') {
        e.preventDefault()
        navigate('/kas')
      } else if (e.key === 'F8') {
        e.preventDefault()
        navigate('/laporan')
      } else if (e.key === 'F9') {
        e.preventDefault()
        navigate('/settings')
      } else if (e.key === 'F10') {
        e.preventDefault()
        navigate('/dashboard')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])
}
