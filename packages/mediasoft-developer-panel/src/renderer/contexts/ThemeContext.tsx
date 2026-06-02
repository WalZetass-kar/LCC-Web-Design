import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { secureStorage } from '../utils/secureStorage'

export type ThemeColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'sky' | 'pink' | 'violet' | 'teal' | 'cyan' | 'orange' | string
export type ThemeMode = 'light' | 'dark'

interface ThemeContextValue {
  color: ThemeColor
  mode: ThemeMode
  setColor: (c: ThemeColor) => void
  setMode: (m: ThemeMode) => void
  toggleMode: () => void
}

const PRESETS = ['indigo', 'emerald', 'rose', 'amber', 'sky', 'pink', 'violet', 'teal', 'cyan', 'orange']

const ThemeContext = createContext<ThemeContextValue | null>(null)

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result 
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '236, 72, 153'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [color, setColorState] = useState<ThemeColor>(
    () => (secureStorage.getItem('theme-color') as ThemeColor) || 'pink'
  )
  const [mode, setModeState] = useState<ThemeMode>(
    () => (secureStorage.getItem('theme-mode') as ThemeMode) || 'light'
  )

  useEffect(() => {
    if (PRESETS.includes(color)) {
      document.documentElement.setAttribute('data-theme', color)
      // Reset inline styles if moving back to preset
      document.documentElement.style.removeProperty('--color-primary-50')
      document.documentElement.style.removeProperty('--color-primary-100')
      document.documentElement.style.removeProperty('--color-primary-200')
      document.documentElement.style.removeProperty('--color-primary-300')
      document.documentElement.style.removeProperty('--color-primary-400')
      document.documentElement.style.removeProperty('--color-primary-500')
      document.documentElement.style.removeProperty('--color-primary-600')
      document.documentElement.style.removeProperty('--color-primary-700')
      document.documentElement.style.removeProperty('--color-primary-800')
      document.documentElement.style.removeProperty('--color-primary-900')
      document.documentElement.style.removeProperty('--glass-shadow-rgb')
      document.documentElement.style.removeProperty('--chart-bar-color')
    } else if (color.startsWith('#')) {
      document.documentElement.setAttribute('data-theme', 'custom')
      const rgb = hexToRgb(color)
      document.documentElement.style.setProperty('--color-primary-50', `${color}10`)
      document.documentElement.style.setProperty('--color-primary-100', `${color}20`)
      document.documentElement.style.setProperty('--color-primary-200', `${color}40`)
      document.documentElement.style.setProperty('--color-primary-300', `${color}60`)
      document.documentElement.style.setProperty('--color-primary-400', `${color}80`)
      document.documentElement.style.setProperty('--color-primary-500', color)
      document.documentElement.style.setProperty('--color-primary-600', color)
      document.documentElement.style.setProperty('--color-primary-700', color)
      document.documentElement.style.setProperty('--color-primary-800', color)
      document.documentElement.style.setProperty('--color-primary-900', color)
      document.documentElement.style.setProperty('--glass-shadow-rgb', rgb)
      document.documentElement.style.setProperty('--chart-bar-color', color)
    }
    secureStorage.setItem('theme-color', color)
  }, [color])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
    secureStorage.setItem('theme-mode', mode)
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
