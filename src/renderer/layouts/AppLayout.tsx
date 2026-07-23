import { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import MobileBottomNav from './MobileBottomNav'
import OfflineIndicator from '../components/OfflineIndicator'
import QuickSearch from '../components/QuickSearch'
import Onboarding from '../components/Onboarding'
import UpdateNotification from '../components/UpdateNotification'
import DemoOverlay from '../components/DemoOverlay'
import PullToRefresh from '../components/PullToRefresh'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useSessionTimeout } from '../hooks/useSessionTimeout'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../utils/api'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [quickSearchOpen, setQuickSearchOpen] = useState(false)
  const mainRef = useRef<HTMLElement | null>(null)
  const location = useLocation()
  const { isDemo } = useAuth()
  
  useKeyboardShortcuts()
  useSessionTimeout() // Auto logout after 30 minutes idle

  const handlePullRefresh = useCallback(async () => {
    window.dispatchEvent(new CustomEvent('app:refresh'))
    await new Promise(r => setTimeout(r, 500))
  }, [])

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

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])

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
        <main ref={mainRef} className={`flex-1 overflow-y-auto ${location.pathname === '/assistant' ? 'p-4 sm:p-5' : 'p-4 pb-24 sm:p-5 lg:pb-5'} scrollbar-thin`}>
          <PullToRefresh onRefresh={handlePullRefresh}>
            <Outlet />
          </PullToRefresh>
        </main>
        {/* Footer */}
        <div className="h-7 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center">
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Zetass Pos Developer</span>
        </div>
      </div>
      <OfflineIndicator />
      {location.pathname !== '/assistant' && <MobileBottomNav />}
      <QuickSearch isOpen={quickSearchOpen} onClose={() => setQuickSearchOpen(false)} />
      <Onboarding />
      <UpdateNotification />
    </div>
  )
}
