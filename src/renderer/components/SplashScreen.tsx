import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'

interface SplashScreenProps {
  onFinish: () => void
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState(0)
  const { mode } = useTheme()

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400)
    const t2 = setTimeout(() => setPhase(2), 900)
    const t3 = setTimeout(() => setPhase(3), 1400)
    const t4 = setTimeout(() => onFinish(), 2000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [onFinish])

  const isDark = mode === 'dark'

  return (
    <AnimatePresence>
      {phase < 3 && (
        <motion.div
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className={`fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden ${
            isDark ? 'bg-slate-950' : 'bg-slate-50'
          }`}
        >
          {/* Center content */}
          <div className="relative z-10 flex flex-col items-center gap-6">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: phase >= 0 ? 1 : 0, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              className="relative"
            >
              <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 flex items-center justify-center shadow-2xl shadow-red-500/40">
                <span className="text-white text-4xl font-black tracking-tight">Z</span>
              </div>
            </motion.div>

            {/* App name */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 20 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-center"
            >
              <h1 className={`text-3xl font-black tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                Zetass <span className="text-red-500">POS</span>
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: phase >= 2 ? 1 : 0 }}
                transition={{ duration: 0.4 }}
                className={`mt-2 text-sm font-medium ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Point of Sale & Store Management
              </motion.p>
            </motion.div>

            {/* Loading bar */}
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: phase >= 1 ? 1 : 0, width: phase >= 1 ? 180 : 0 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className={`h-1 rounded-full overflow-hidden ${
                isDark ? 'bg-slate-800' : 'bg-slate-200'
              }`}
            >
              <motion.div
                className="h-full rounded-full bg-red-500"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ width: '60%' }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
