import {
  useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, flexRender,
  type ColumnDef, type SortingState, type ColumnFiltersState,
} from '@tanstack/react-table'
import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import Input from './Input'
import { Search } from 'lucide-react'

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  searchPlaceholder?: string
  searchKey?: string
}

export default function DataTable<T>({ data, columns, searchPlaceholder = 'Cari...', searchKey }: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          icon={<Search size={14} />}
          className="w-full sm:max-w-xs"
        />
        <span className="text-xs text-slate-400 text-center sm:text-left">{table.getFilteredRowModel().rows.length} data</span>
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
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 sm:px-4 py-10 text-center text-slate-400 text-sm">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
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
          Halaman {table.getState().pagination.pageIndex + 1} dari {table.getPageCount()}
        </span>
        <div className="flex items-center gap-1 order-1 sm:order-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
