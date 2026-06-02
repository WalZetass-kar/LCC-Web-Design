import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string | number
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options: SelectOption[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, placeholder, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-label">{label}</label>
      )}
      <div className="relative group">
        <select
          ref={ref}
          {...props}
          className={`w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
            px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 appearance-none
            focus:outline-none focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500
            transition-all duration-200
            ${error ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500' : ''}
            ${className}`}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors pointer-events-none"
        />
      </div>
      {helperText && !error && (
        <p className="text-caption">{helperText}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
      )}
    </div>
  )
)

Select.displayName = 'Select'
export default Select
