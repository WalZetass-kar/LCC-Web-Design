import { AlertTriangle, Trash2, Info, CheckCircle } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info' | 'success'
  loading?: boolean
  children?: React.ReactNode
}

const variants = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    buttonVariant: 'danger' as const
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    buttonVariant: 'primary' as const
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    buttonVariant: 'primary' as const
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    buttonVariant: 'primary' as const
  }
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'danger',
  loading = false,
  children
}: ConfirmDialogProps) {
  const config = variants[variant]
  const Icon = config.icon

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto" disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={config.buttonVariant} onClick={onConfirm} loading={loading} className="w-full sm:w-auto">
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className={`shrink-0 w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center`}>
            <Icon size={24} className={config.iconColor} />
          </div>
          <div className="flex-1 pt-1">
            <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
          </div>
        </div>
        {children}
      </div>
    </Modal>
  )
}
