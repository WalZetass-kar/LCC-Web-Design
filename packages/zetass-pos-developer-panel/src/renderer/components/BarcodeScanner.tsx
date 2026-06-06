import { useEffect, useRef } from 'react'
import { Scan } from 'lucide-react'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  enabled?: boolean
}

export default function BarcodeScanner({ onScan, enabled = true }: BarcodeScannerProps) {
  const bufferRef = useRef('')
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!enabled) return

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Clear timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current)

      // Add character to buffer
      if (e.key.length === 1) {
        bufferRef.current += e.key
      }

      // Process on Enter
      if (e.key === 'Enter' && bufferRef.current.length > 0) {
        e.preventDefault()
        onScan(bufferRef.current)
        bufferRef.current = ''
        return
      }

      // Clear buffer after 100ms of inactivity
      timeoutRef.current = setTimeout(() => {
        bufferRef.current = ''
      }, 100)
    }

    window.addEventListener('keypress', handleKeyPress)
    return () => {
      window.removeEventListener('keypress', handleKeyPress)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [enabled, onScan])

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <Scan className="w-4 h-4" />
      <span>Barcode Scanner Ready</span>
    </div>
  )
}
