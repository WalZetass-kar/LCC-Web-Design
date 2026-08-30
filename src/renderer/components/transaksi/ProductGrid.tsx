import React from 'react'
import { ShoppingCart, Image as ImageIcon, Plus } from 'lucide-react'
import { Barang } from '../../../shared/types'
import { ProductGridSkeleton } from '../../components/Skeleton'
import { formatRupiah } from '../../utils/format'

interface ProductGridProps {
  products: Barang[]
  productsLoading: boolean
  filtered: Barang[]
  onAddToCart: (product: Barang) => void
}

export default function ProductGrid({
  products, productsLoading, filtered, onAddToCart
}: ProductGridProps) {
  if (productsLoading) {
    return <ProductGridSkeleton />
  }

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <ShoppingCart size={32} />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Produk Tidak Ditemukan</p>
          <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian Anda</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-3 p-1 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {filtered.map((p, index) => {
        const isOutOfStock = (p.stok ?? 0) <= 0
        return (
          <button
            key={p.kd_barang ?? String(index)}
            onClick={() => onAddToCart(p)}
            disabled={isOutOfStock}
            className={`w-full rounded-2xl border p-3 text-left transition-all relative overflow-hidden flex flex-col justify-between ${
              isOutOfStock
                ? 'cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 opacity-50'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 active:border-red-600/40 active:shadow-md'
            }`}
          >
            <div>
              <div className="mb-2.5 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800/80 relative">
                {p.foto_barang ? (
                  <img src={p.foto_barang} alt={p.nama_barang ?? ''} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={32} className="text-slate-400 opacity-60" />
                )}
                <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isOutOfStock ? 'bg-red-500 text-white' : (p.stok ?? 0) <= 5 ? 'bg-amber-500 text-white' : 'bg-slate-900/70 text-white backdrop-blur-sm'
                }`}>
                  {isOutOfStock ? 'Habis' : `${p.stok} stok`}
                </span>
              </div>
              <p className="font-bold text-xs text-slate-900 dark:text-white truncate leading-snug">{p.nama_barang}</p>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
              <p className="text-red-600 dark:text-red-400 font-extrabold text-sm">{formatRupiah(p.harga_barang)}</p>
              <div className="w-6 h-6 rounded-lg bg-red-600/10 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
                <Plus size={14} />
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
