import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  confirmLabel?: string
  loading?: boolean
}

export default function ConfirmDialog({
  open, onClose, onConfirm, title = 'Konfirmasi Hapus',
  message, confirmLabel = 'Hapus', loading,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">Batal</Button>
          <Button variant="danger" loading={loading} onClick={onConfirm} className="w-full sm:w-auto">{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex gap-3 items-start">
        <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
      </div>
    </Modal>
  )
}
