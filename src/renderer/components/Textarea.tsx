import { forwardRef, type TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-label">{label}</label>
      )}
      <textarea
        ref={ref}
        {...props}
        className={`w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
          px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400
          focus:outline-none focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500
          transition-all duration-200 resize-y min-h-[80px]
          ${error ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500' : ''}
          ${className}`}
      />
      {helperText && !error && (
        <p className="text-caption">{helperText}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
      )}
    </div>
  )
)

Textarea.displayName = 'Textarea'
export default Textarea
