import {
  useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, flexRender,
  type ColumnDef, type SortingState, type ColumnFiltersState,
  type PaginationState, type OnChangeFn,
} from '@tanstack/react-table'
import { useState, useEffect, useRef } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import Input from './Input'
import { Search } from 'lucide-react'

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  searchPlaceholder?: string
  searchKey?: string
  defaultPageSize?: number
  manualPagination?: boolean
  totalRows?: number
  pageCount?: number
  pageIndex?: number
  pageSize?: number
  loading?: boolean
  onPageChange?: (pageIndex: number) => void
  onPageSizeChange?: (pageSize: number) => void
  onSearchChange?: (search: string) => void
  onSortChange?: (sortBy: string, sortOrder: 'ASC' | 'DESC') => void
}

/** Debounce hook for search performance */
function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const PAGE_SIZES = [10, 25, 50, 100]

export default function DataTable<T>({
  data,
  columns,
  searchPlaceholder = 'Cari...',
  searchKey,
  defaultPageSize = 10,
  manualPagination = false,
  totalRows,
  pageCount,
  pageIndex,
  pageSize,
  loading = false,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  onSortChange,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: defaultPageSize })
  const [searchInput, setSearchInput] = useState('')
  const globalFilter = useDebounce(searchInput, 300)
  const tablePagination = manualPagination
    ? { pageIndex: pageIndex ?? 0, pageSize: pageSize ?? defaultPageSize }
    : pagination

  const handlePaginationChange: OnChangeFn<PaginationState> = updater => {
    const next = typeof updater === 'function' ? updater(tablePagination) : updater
    if (manualPagination) {
      if (next.pageSize !== tablePagination.pageSize) {
        onPageSizeChange?.(next.pageSize)
        onPageChange?.(0)
        return
      }
      if (next.pageIndex !== tablePagination.pageIndex) onPageChange?.(next.pageIndex)
      return
    }
    setPagination(next)
  }

  const handleSortingChange: OnChangeFn<SortingState> = updater => {
    const next = typeof updater === 'function' ? updater(sorting) : updater
    setSorting(next)
    if (manualPagination) {
      const first = next[0]
      onSortChange?.(first ? String(first.id) : '', first?.desc ? 'DESC' : 'ASC')
    }
  }

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, pagination: tablePagination },
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: handlePaginationChange,
    onGlobalFilterChange: () => {}, // Controlled via debounce
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination,
    manualFiltering: manualPagination,
    manualSorting: manualPagination,
    pageCount: manualPagination ? Math.max(pageCount ?? 1, 1) : undefined,
    initialState: { pagination: { pageSize: defaultPageSize } },
    globalFilterFn: 'includesString',
  })

  // Sync debounced value to table
  useEffect(() => {
    if (manualPagination) {
      onSearchChange?.(globalFilter)
      return
    }
    table.setGlobalFilter(globalFilter)
  }, [globalFilter])

  const totalFiltered = manualPagination ? (totalRows ?? data.length) : table.getFilteredRowModel().rows.length
  const totalPages = Math.max(table.getPageCount() || 1, 1)

  return (
    <div className="flex flex-col gap-3">
      {/* Search + Page Size */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Input
          placeholder={searchPlaceholder}
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          icon={<Search size={14} />}
          className="w-full sm:max-w-xs"
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{totalFiltered} data</span>
          <select
            value={tablePagination.pageSize}
            onChange={e => {
              const nextPageSize = Number(e.target.value)
              if (manualPagination) {
                onPageSizeChange?.(nextPageSize)
                onPageChange?.(0)
                return
              }
              table.setPageSize(nextPageSize)
            }}
            className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            {PAGE_SIZES.map(size => (
              <option key={size} value={size}>{size} / halaman</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table - Horizontal scroll on mobile */}
      <div className="overflow-x-auto rounded-xl border border-white/40 dark:border-slate-700/40 -mx-4 sm:mx-0">
        <div className="min-w-[640px]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(header => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          header.column.getIsSorted() === 'asc' ? <ChevronUp size={12} /> :
                          header.column.getIsSorted() === 'desc' ? <ChevronDown size={12} /> :
                          <ChevronsUpDown size={12} className="opacity-40" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading || table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 sm:px-4 py-10 text-center text-slate-400 text-sm">
                    {loading ? 'Memuat data...' : 'Tidak ada data'}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, idx) => (
                  <tr key={row.id} className={`transition-colors hover:bg-primary-50/70 dark:hover:bg-primary-900/20 ${idx % 2 === 0 ? 'bg-white/60 dark:bg-slate-800/30' : 'bg-slate-50/60 dark:bg-slate-800/60'}`}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <span className="order-2 sm:order-1">
          Halaman {tablePagination.pageIndex + 1} dari {totalPages}
        </span>
        <div className="flex items-center gap-1 order-1 sm:order-2">
          <button
            onClick={() => table.previousPage()}
            disabled={loading || !table.getCanPreviousPage()}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} />
          </button>
          {/* Page number buttons */}
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const currentPage = tablePagination.pageIndex
            let pageNum: number
            if (totalPages <= 5) {
              pageNum = i
            } else if (currentPage < 3) {
              pageNum = i
            } else if (currentPage > totalPages - 4) {
              pageNum = totalPages - 5 + i
            } else {
              pageNum = currentPage - 2 + i
            }
            return (
              <button
                key={pageNum}
                onClick={() => table.setPageIndex(pageNum)}
                disabled={loading}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors
                  ${pageNum === currentPage
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500'
                  }`}
              >
                {pageNum + 1}
              </button>
            )
          })}
          <button
            onClick={() => table.nextPage()}
            disabled={loading || !table.getCanNextPage()}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
