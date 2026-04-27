type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray'

const styles: Record<BadgeVariant, string> = {
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  yellow: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  gray: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

export default function Badge({ label, variant = 'gray' }: { label: string; variant?: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>
      {label}
    </span>
  )
}
