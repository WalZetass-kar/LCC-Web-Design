import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import OfflineIndicator from '../components/OfflineIndicator'
import QuickSearch from '../components/QuickSearch'
import Onboarding from '../components/Onboarding'
import UpdateNotification from '../components/UpdateNotification'
import DemoOverlay from '../components/DemoOverlay'
import PricingPopup from '../components/PricingPopup'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useSessionTimeout } from '../hooks/useSessionTimeout'
import { useAuth } from '../contexts/AuthContext'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [quickSearchOpen, setQuickSearchOpen] = useState(false)
  const { isDemo } = useAuth()
  
  useKeyboardShortcuts()
  useSessionTimeout() // Auto logout after 30 minutes idle

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setQuickSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className={`flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-pink-50/40 to-slate-100 dark:from-[#1a1a2e] dark:via-slate-900 dark:to-[#16213e] ${isDemo ? 'pt-8' : ''}`}>
      {/* Demo Mode Overlay (banner + watermark + badge) */}
      <DemoOverlay />

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
      <OfflineIndicator />
      <QuickSearch isOpen={quickSearchOpen} onClose={() => setQuickSearchOpen(false)} />
      <Onboarding />
      <UpdateNotification />
      <PricingPopup />
    </div>
  )
}
