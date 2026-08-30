import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppStore {
  sidebarCollapsed: boolean
  lastRoute: string
  activeShiftId: number | null
  pajakPersen: number

  setSidebarCollapsed: (collapsed: boolean) => void
  setLastRoute: (route: string) => void
  setActiveShiftId: (id: number | null) => void
  setPajakPersen: (rate: number) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      lastRoute: '/',
      activeShiftId: null,
      pajakPersen: 0,

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setLastRoute: (route) => set({ lastRoute: route }),
      setActiveShiftId: (id) => set({ activeShiftId: id }),
      setPajakPersen: (rate) => set({ pajakPersen: rate }),
    }),
    {
      name: 'zetass-app-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        pajakPersen: state.pajakPersen,
      }),
    }
  )
)
