import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
  subtitle?: string
  action?: ReactNode
  hover?: boolean
}

export default function Card({ children, className = '', title, subtitle, action, hover = false }: CardProps) {
  return (
    <div className={`glass-card p-5 ${hover ? 'hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200' : ''} ${className}`}>
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>}
            {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
