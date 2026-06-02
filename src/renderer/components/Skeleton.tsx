export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
)

export const TableSkeleton = ({ rows = 5, columns = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4">
        {Array.from({ length: columns }).map((_, j) => (
          <Skeleton key={j} className="h-12 flex-1" />
        ))}
      </div>
    ))}
  </div>
)

export const CardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
    <Skeleton className="h-6 w-1/3" />
    <Skeleton className="h-4 w-2/3" />
    <Skeleton className="h-4 w-1/2" />
  </div>
)

export const SkeletonCard = CardSkeleton

export const FormSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    ))}
  </div>
)

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton className="h-80" />
      <Skeleton className="h-80" />
    </div>
  </div>
)

export const SkeletonPage = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-4">
    <TableSkeleton rows={rows} columns={5} />
  </div>
)

export const SkeletonChart = ({ className = '' }: { className?: string }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 ${className}`}>
    <Skeleton className="h-6 w-1/4 mb-4" />
    <Skeleton className="h-64 w-full" />
  </div>
)

export const SkeletonSpinner = ({ label = 'Memuat...' }: { label?: string }) => (
  <div aria-label={label} className="space-y-3 py-4 animate-pulse">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
    <Skeleton className="h-64" />
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-10" />
      ))}
    </div>
  </div>
)

export const SkeletonStatGrid = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
)
