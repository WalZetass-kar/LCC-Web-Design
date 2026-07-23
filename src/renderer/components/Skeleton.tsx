const PULSE = 'skeleton-pulse bg-slate-200 dark:bg-slate-700 rounded'

export const Skeleton = ({ className = '', style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={`${PULSE} ${className}`} style={style} />
)

// ─── Stat Card (icon + label + value) ───────────────────────────────
export const StatCardSkeleton = () => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center gap-3 mb-3">
      <Skeleton className="h-10 w-10 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
    <Skeleton className="h-3 w-24" />
  </div>
)

export const SkeletonStatGrid = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    {Array.from({ length: count }).map((_, i) => <StatCardSkeleton key={i} />)}
  </div>
)

// ─── Table Row (header + rows with column widths) ───────────────────
interface TableColumn {
  width: string
  label?: string
}

export const TableSkeleton = ({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) => (
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

export const DataTableSkeleton = ({ rows = 4, cols }: { rows?: number; cols: TableColumn[] }) => (
  <div className="overflow-x-auto -mx-6">
    {/* Header */}
    <div className="flex items-center gap-0 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
      {cols.map((col, i) => (
        <div key={i} className={`shrink-0 ${col.width} px-2`}>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div key={rowIdx} className={`flex items-center gap-0 px-4 py-3 border-b border-slate-50 dark:border-slate-800/50 ${rowIdx % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/20' : ''}`}>
        {cols.map((col, colIdx) => (
          <div key={colIdx} className={`shrink-0 ${col.width} px-2`}>
            <Skeleton className={`h-4 ${colIdx === 0 ? 'w-3/4' : colIdx === cols.length - 1 ? 'w-12' : 'w-full'}`} />
          </div>
        ))}
      </div>
    ))}
  </div>
)

// ─── Form Field (label + input) ─────────────────────────────────────
export const FormFieldSkeleton = ({ labelWidth = 'w-24' }: { labelWidth?: string }) => (
  <div className="space-y-1.5">
    <Skeleton className={`h-3.5 ${labelWidth}`} />
    <Skeleton className="h-10 w-full rounded-xl" />
  </div>
)

export const FormSkeleton = ({ fields = 5, columns = 1 }: { fields?: number; columns?: number }) => (
  <div className={`grid gap-3 ${columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
    {Array.from({ length: fields }).map((_, i) => (
      <FormFieldSkeleton key={i} labelWidth={i % 3 === 0 ? 'w-32' : i % 3 === 1 ? 'w-24' : 'w-20'} />
    ))}
  </div>
)

// ─── Filter Bar (date + search + buttons) ───────────────────────────
export const FilterBarSkeleton = () => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      <Skeleton className="h-10 w-28 rounded-xl" />
      <div className="flex-1" />
      <Skeleton className="h-10 w-24 rounded-xl" />
    </div>
  </div>
)

// ─── Note Card (badge + title + content lines) ──────────────────────
export const NoteCardSkeleton = () => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  </div>
)

// ─── Product Grid Card (image + name + price + stock) ───────────────
export const ProductCardSkeleton = () => (
  <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 p-3 space-y-2">
    <Skeleton className="aspect-square w-full rounded-lg" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-5 w-1/2" />
    <Skeleton className="h-3 w-2/3" />
  </div>
)

export const ProductGridSkeleton = ({ count = 10 }: { count?: number }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
    {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
  </div>
)

// ─── Member Card (avatar + name + badge + buttons) ──────────────────
export const MemberCardSkeleton = () => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
      <Skeleton className="h-3 w-2/3" />
      <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 flex-1 rounded-lg" />
      </div>
    </div>
  </div>
)

export const MemberGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {Array.from({ length: count }).map((_, i) => <MemberCardSkeleton key={i} />)}
  </div>
)

// ─── Supplier Card (icon + name + stars + metrics) ──────────────────
export const SupplierCardSkeleton = () => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-start gap-4">
      <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/4" />
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(j => <Skeleton key={j} className="w-4 h-4 rounded-sm" />)}
          <Skeleton className="h-5 w-16 rounded-full ml-2" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(j => (
          <div key={j} className="space-y-1">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  </div>
)

export const SupplierListSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => <SupplierCardSkeleton key={i} />)}
  </div>
)

// ─── Commission Card (rank + avatar + name + metrics) ───────────────
export const CommissionCardSkeleton = () => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center gap-4">
      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(j => (
          <div key={j} className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  </div>
)

export const CommissionListSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => <CommissionCardSkeleton key={i} />)}
  </div>
)

// ─── Settings Toggle Card (title + desc + toggle) ───────────────────
export const SettingsToggleSkeleton = () => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
    <div className="space-y-1">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-56" />
    </div>
    <Skeleton className="w-11 h-6 rounded-full shrink-0" />
  </div>
)

export const SettingsCardSkeleton = ({ toggles = 2 }: { toggles?: number }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center gap-2 mb-4">
      <Skeleton className="w-4 h-4" />
      <Skeleton className="h-4 w-32" />
    </div>
    <div className="space-y-3">
      {Array.from({ length: toggles }).map((_, i) => <SettingsToggleSkeleton key={i} />)}
    </div>
  </div>
)

// ─── Chart Area (title + bar chart placeholder) ─────────────────────
export const ChartSkeleton = ({ bars = 5, height = 'h-48' }: { bars?: number; height?: string }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
    <div className={`${height} flex items-end gap-2`}>
      {Array.from({ length: bars }).map((_, i) => (
        <Skeleton key={i} className="flex-1 rounded-t-lg" style={{ height: `${20 + Math.random() * 60}%` }} />
      ))}
    </div>
  </div>
)

// ─── Audit Row (time + user + badge + module + data) ────────────────
export const AuditRowSkeleton = () => (
  <div className="flex items-center gap-0 px-4 py-3 border-b border-slate-50 dark:border-slate-800/50">
    <div className="w-28 shrink-0 px-2"><Skeleton className="h-3 w-20" /></div>
    <div className="w-24 shrink-0 px-2"><Skeleton className="h-4 w-16" /></div>
    <div className="w-20 shrink-0 px-2"><Skeleton className="h-5 w-14 rounded-full" /></div>
    <div className="w-20 shrink-0 px-2"><Skeleton className="h-3 w-12" /></div>
    <div className="flex-1 px-2 space-y-1">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-16" />
    </div>
    <div className="w-20 shrink-0 px-2"><Skeleton className="h-3 w-16" /></div>
    <div className="w-10 shrink-0 px-2"><Skeleton className="h-7 w-7 rounded-lg" /></div>
  </div>
)

export const AuditListSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="overflow-x-auto -mx-6">
    <div className="flex items-center gap-0 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
      {['w-28', 'w-24', 'w-20', 'w-20', 'flex-1', 'w-20', 'w-10'].map((w, i) => (
        <div key={i} className={`${w} shrink-0 px-2`}><Skeleton className="h-3 w-12" /></div>
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => <AuditRowSkeleton key={i} />)}
  </div>
)

// ─── Petty Cash Row (date + desc + category + type + amount + user) ─
export const PettyCashRowSkeleton = () => (
  <div className="flex items-center gap-0 px-4 py-2.5 border-b border-slate-50 dark:border-slate-800/50">
    <div className="w-20 shrink-0 px-2"><Skeleton className="h-3 w-14" /></div>
    <div className="flex-1 px-2"><Skeleton className="h-4 w-3/4" /></div>
    <div className="w-24 shrink-0 px-2"><Skeleton className="h-5 w-16 rounded-full" /></div>
    <div className="w-20 shrink-0 px-2"><Skeleton className="h-5 w-14 rounded-full" /></div>
    <div className="w-28 shrink-0 px-2"><Skeleton className="h-4 w-20" /></div>
    <div className="w-16 shrink-0 px-2"><Skeleton className="h-3 w-10" /></div>
    <div className="w-10 shrink-0 px-2"><Skeleton className="h-7 w-7 rounded-lg" /></div>
  </div>
)

// ─── Cash Flow Day Group (date header + entries) ────────────────────
export const CashFlowDaySkeleton = () => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-700">
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
    <div className="space-y-1.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 py-1.5 px-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  </div>
)

export const CashFlowSkeleton = ({ days = 2 }: { days?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: days }).map((_, i) => <CashFlowDaySkeleton key={i} />)}
  </div>
)

// ─── Price List / Label Table ───────────────────────────────────────
export const PriceListSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="overflow-x-auto -mx-6">
    <div className="flex items-center gap-0 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
      <div className="w-10 shrink-0 px-2"><Skeleton className="h-3 w-6" /></div>
      <div className="w-24 shrink-0 px-2"><Skeleton className="h-3 w-16" /></div>
      <div className="flex-1 px-2"><Skeleton className="h-3 w-20" /></div>
      <div className="w-24 shrink-0 px-2"><Skeleton className="h-3 w-14" /></div>
      <div className="w-16 shrink-0 px-2"><Skeleton className="h-3 w-8" /></div>
      <div className="w-28 shrink-0 px-2"><Skeleton className="h-3 w-16" /></div>
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className={`flex items-center gap-0 px-4 py-2.5 border-b border-slate-50 dark:border-slate-800/50 ${i % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/20' : ''}`}>
        <div className="w-10 shrink-0 px-2"><Skeleton className="h-3 w-4" /></div>
        <div className="w-24 shrink-0 px-2"><Skeleton className="h-3 w-16 font-mono" /></div>
        <div className="flex-1 px-2"><Skeleton className="h-4 w-3/4" /></div>
        <div className="w-24 shrink-0 px-2"><Skeleton className="h-5 w-16 rounded-full" /></div>
        <div className="w-16 shrink-0 px-2 text-right"><Skeleton className="h-4 w-8" /></div>
        <div className="w-28 shrink-0 px-2 text-right"><Skeleton className="h-4 w-20" /></div>
      </div>
    ))}
  </div>
)

// ─── Tax Report Table ───────────────────────────────────────────────
export const TaxTableSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="overflow-x-auto -mx-6">
    <div className="flex items-center gap-0 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
      {['w-32', 'w-24', 'flex-1', 'w-28', 'w-24', 'w-28'].map((w, i) => (
        <div key={i} className={`${w} shrink-0 px-2`}><Skeleton className="h-3 w-16" /></div>
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className={`flex items-center gap-0 px-4 py-2.5 border-b border-slate-50 dark:border-slate-800/50 ${i % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/20' : ''}`}>
        <div className="w-32 shrink-0 px-2"><Skeleton className="h-4 w-24" /></div>
        <div className="w-24 shrink-0 px-2"><Skeleton className="h-4 w-12" /></div>
        <div className="flex-1 px-2"><Skeleton className="h-4 w-24" /></div>
        <div className="w-28 shrink-0 px-2"><Skeleton className="h-4 w-20" /></div>
        <div className="w-24 shrink-0 px-2"><Skeleton className="h-4 w-16" /></div>
        <div className="w-28 shrink-0 px-2"><Skeleton className="h-4 w-20" /></div>
      </div>
    ))}
    <div className="flex items-center gap-0 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
      <div className="w-32 shrink-0 px-2"><Skeleton className="h-4 w-12" /></div>
      <div className="w-24 shrink-0 px-2"><Skeleton className="h-4 w-12" /></div>
      <div className="flex-1 px-2"><Skeleton className="h-4 w-24" /></div>
      <div className="w-28 shrink-0 px-2"><Skeleton className="h-4 w-20" /></div>
      <div className="w-24 shrink-0 px-2"><Skeleton className="h-4 w-16" /></div>
      <div className="w-28 shrink-0 px-2"><Skeleton className="h-4 w-20" /></div>
    </div>
  </div>
)

// ─── Generic Page Skeleton ──────────────────────────────────────────
export const SkeletonPage = ({ rows = 3 }: { rows?: number }) => (
  <div className="space-y-3">
    <FilterBarSkeleton />
    <DataTableSkeleton rows={rows} cols={[
      { width: 'w-10' }, { width: 'w-24' }, { width: 'flex-1' }, { width: 'w-24' }, { width: 'w-28' }, { width: 'w-10' },
    ]} />
  </div>
)

// ─── Legacy Aliases ─────────────────────────────────────────────────
export const CardSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 rounded-xl p-5 space-y-3 border border-slate-200 dark:border-slate-800">
    <Skeleton className="h-5 w-1/3" />
    <Skeleton className="h-3 w-2/3" />
    <Skeleton className="h-3 w-1/2" />
  </div>
)

export const SkeletonCard = CardSkeleton

export const DashboardSkeleton = () => (
  <div className="space-y-3">
    <SkeletonStatGrid count={4} />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <ChartSkeleton height="h-48" />
      <ChartSkeleton height="h-48" />
    </div>
  </div>
)

export const SkeletonChart = ({ className = '' }: { className?: string }) => (
  <div className={`bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 ${className}`}>
    <Skeleton className="h-5 w-1/4 mb-3" />
    <Skeleton className="h-48 w-full" />
  </div>
)

export const SkeletonSpinner = ({ label = 'Memuat...' }: { label?: string }) => (
  <div aria-label={label} className="space-y-3 py-2">
    <SkeletonStatGrid count={3} />
    <ChartSkeleton height="h-48" />
    <DataTableSkeleton rows={3} cols={[
      { width: 'w-24' }, { width: 'flex-1' }, { width: 'w-24' }, { width: 'w-28' },
    ]} />
  </div>
)
