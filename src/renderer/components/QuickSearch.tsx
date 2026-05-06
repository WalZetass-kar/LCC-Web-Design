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
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="w-full max-w-2xl">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Quick search... (Ctrl+K)"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filtered.map((item, idx) => {
            const Icon = item.icon
            return (
              <button
                key={item.path}
                onClick={() => handleSelect(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  idx === selected ? 'bg-pink-50 text-pink-600' : 'hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1 text-left font-medium">{item.label}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{item.shortcut}</span>
              </button>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
