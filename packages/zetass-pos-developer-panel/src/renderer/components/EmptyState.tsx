import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: ReactNode
  title?: string
  description?: string
  action?: ReactNode
  className?: string
}

export default function EmptyState({
  icon,
  title = 'Tidak ada data',
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <div className="mb-3 text-slate-300 dark:text-slate-600">
        {icon ?? <Inbox size={48} strokeWidth={1.5} />}
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      {description && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
