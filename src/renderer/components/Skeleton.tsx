interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg ${className}`} />
  )
}

export function SkeletonCard() {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonChart() {
  return (
    <div className="glass-card p-6">
      <Skeleton className="h-5 w-48 mb-6" />
      <div className="flex items-end gap-2 h-40">
        {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <Skeleton className="w-full rounded-t-lg" style={{ height: `${h}%` }} />
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-9 w-64 mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
