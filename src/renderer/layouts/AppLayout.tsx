import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import OfflineIndicator from '../components/OfflineIndicator'
import QuickSearch from '../components/QuickSearch'
import Onboarding from '../components/Onboarding'
import UpdateNotification from '../components/UpdateNotification'
import DemoOverlay from '../components/DemoOverlay'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useSessionTimeout } from '../hooks/useSessionTimeout'
import { useAuth } from '../contexts/AuthContext'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
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

  const handleMenuClick = () => {
    if (window.innerWidth >= 1024) {
      setSidebarCollapsed(prev => !prev)
      return
    }

    setSidebarOpen(true)
  }

  return (
    <div className={`flex h-screen overflow-hidden bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 ${isDemo ? 'pt-8' : ''}`}>
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
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
      />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar onMenuClick={handleMenuClick} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-thin">
          <Outlet />
        </main>
        {/* Footer */}
        <div className="h-7 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center">
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Developer by Zetass</span>
        </div>
      </div>
      <OfflineIndicator />
      <QuickSearch isOpen={quickSearchOpen} onClose={() => setQuickSearchOpen(false)} />
      <Onboarding />
      <UpdateNotification />
    </div>
  )
}
