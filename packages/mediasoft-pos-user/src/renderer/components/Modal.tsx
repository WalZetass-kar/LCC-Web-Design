import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = { 
  sm: 'max-w-sm', 
  md: 'max-w-md', 
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
}

export default function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className={`relative w-full ${sizes[size]} glass-card shadow-xl zoom-in-95 p-4 sm:p-5 max-h-[95vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
          >
            <X size={20} />
          </button>
        </div>
        <div className="text-slate-600 dark:text-slate-300">{children}</div>
        {footer && <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">{footer}</div>}
      </div>
    </div>
  )
}
