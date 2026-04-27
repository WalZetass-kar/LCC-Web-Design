import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}

const variants = {
  primary: 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 active:scale-[0.98]',
  secondary: 'bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-300 dark:hover:border-slate-500 shadow-md',
  danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 active:scale-[0.98]',
  success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 active:scale-[0.98]',
  ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-5 py-2.5 text-sm gap-2 rounded-xl',
  lg: 'px-6 py-3 text-base gap-2.5 rounded-xl',
}

export default function Button({
  variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-200
        ${variants[variant]} ${sizes[size]} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}
