import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'sky'
export type ThemeMode = 'light' | 'dark'

interface ThemeContextValue {
  color: ThemeColor
  mode: ThemeMode
  setColor: (c: ThemeColor) => void
  setMode: (m: ThemeMode) => void
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [color, setColorState] = useState<ThemeColor>(
    () => (localStorage.getItem('theme-color') as ThemeColor) || 'indigo'
  )
  const [mode, setModeState] = useState<ThemeMode>(
    () => (localStorage.getItem('theme-mode') as ThemeMode) || 'light'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', color)
    localStorage.setItem('theme-color', color)
  }, [color])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
    localStorage.setItem('theme-mode', mode)
  }, [mode])

  const setColor = (c: ThemeColor) => setColorState(c)
  const setMode = (m: ThemeMode) => setModeState(m)
  const toggleMode = () => setModeState(m => (m === 'light' ? 'dark' : 'light'))

  return (
    <ThemeContext.Provider value={{ color, mode, setColor, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
