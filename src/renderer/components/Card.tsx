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
    <div className={`glass-card p-6 ${hover ? 'hover:shadow-2xl hover:-translate-y-1 transition-all duration-300' : ''} ${className}`}>
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between mb-5">
          <div>
            {title && <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>}
            {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
