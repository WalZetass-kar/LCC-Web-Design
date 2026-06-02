import { useState, useEffect, useRef } from 'react'
import { Search, FileText, Package, Users, TrendingUp, Settings, DollarSign, ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Modal from './Modal'

interface QuickSearchProps {
  isOpen: boolean
  onClose: () => void
}

const menuItems = [
  { icon: ShoppingCart, label: 'Transaksi', path: '/transaksi', shortcut: 'F1' },
  { icon: Package, label: 'Produk', path: '/produk', shortcut: 'F2' },
  { icon: FileText, label: 'Riwayat', path: '/riwayat', shortcut: 'F3' },
  { icon: Users, label: 'Customer', path: '/customer', shortcut: 'F4' },
  { icon: Users, label: 'Supplier', path: '/supplier', shortcut: 'F5' },
  { icon: ShoppingCart, label: 'Pembelian', path: '/pembelian', shortcut: 'F6' },
  { icon: DollarSign, label: 'Kas', path: '/kas', shortcut: 'F7' },
  { icon: TrendingUp, label: 'Laporan', path: '/laporan', shortcut: 'F8' },
  { icon: Settings, label: 'Settings', path: '/settings', shortcut: 'F9' },
  { icon: TrendingUp, label: 'Dashboard', path: '/dashboard', shortcut: 'F10' },
]

export default function QuickSearch({ isOpen, onClose }: QuickSearchProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = menuItems.filter(item =>
    item.label.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSelect = (path: string) => {
    navigate(path)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(prev => (prev + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(prev => (prev - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault()
      handleSelect(filtered[selected].path)
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Quick Search</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Cari menu dan fitur dengan cepat</p>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik untuk mencari..."
            className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto scrollbar-thin space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Search className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Tidak ada hasil</p>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon
              return (
                <button
                  key={item.path}
                  onClick={() => handleSelect(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    idx === selected
                      ? 'bg-gradient-to-r from-primary-500 to-primary-400 text-white shadow-md'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    idx === selected 
                      ? 'bg-white/20' 
                      : 'bg-slate-100 dark:bg-slate-700'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  <span className={`text-xs font-mono px-2 py-1 rounded ${
                    idx === selected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                  }`}>
                    {item.shortcut}
                  </span>
                </button>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Enter</kbd> Select</span>
          </div>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">ESC</kbd> Close</span>
        </div>
      </div>
    </Modal>
  )
}
