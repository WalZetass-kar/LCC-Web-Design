import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ShieldCheck, Zap, Store } from 'lucide-react'
import appLogo from '../assets/app-logo.png'
import { useTheme } from '../contexts/ThemeContext'

interface SplashScreenProps {
  onFinish: () => void
}

const loadingSteps = [
  { text: 'Memuat database & engine lokal...', progress: 20 },
  { text: 'Menyiapkan modul kasir, meja & KDS...', progress: 55 },
  { text: 'Memverifikasi sistem & sinkronisasi...', progress: 85 },
  { text: 'Sistem siap digunakan!', progress: 100 },
]

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [progress, setProgress] = useState(10)
  const [isVisible, setIsVisible] = useState(true)
  const { mode } = useTheme()

  const isDark = mode === 'dark'

  useEffect(() => {
    // Step transitions
    const step1 = setTimeout(() => { setCurrentStepIndex(1); setProgress(45) }, 450)
    const step2 = setTimeout(() => { setCurrentStepIndex(2); setProgress(80) }, 950)
    const step3 = setTimeout(() => { setCurrentStepIndex(3); setProgress(100) }, 1450)
    const finishTimer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onFinish, 400) // allow exit animation to complete
    }, 2200)

    return () => {
      clearTimeout(step1)
      clearTimeout(step2)
      clearTimeout(step3)
      clearTimeout(finishTimer)
    }
  }, [onFinish])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="splash-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className={`fixed inset-0 z-[99999] flex flex-col items-center justify-between p-8 overflow-hidden select-none ${
            isDark ? 'bg-slate-950 text-white' : 'bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 text-slate-900'
          }`}
        >
          {/* Ambient Glowing Background Orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Top-Right Crimson Glow */}
            <motion.div
              animate={{
                scale: [1, 1.25, 1],
                opacity: isDark ? [0.35, 0.6, 0.35] : [0.2, 0.35, 0.2],
                x: [0, 25, 0],
                y: [0, -25, 0],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-red-600/40 blur-[110px]"
            />

            {/* Bottom-Left Rose Glow */}
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                opacity: isDark ? [0.25, 0.5, 0.25] : [0.15, 0.3, 0.15],
                x: [0, -25, 0],
                y: [0, 25, 0],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-rose-500/35 blur-[110px]"
            />

            {/* Center Subtle Deep Red Halo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-red-600/10 blur-[130px]" />

            {/* Subtle Futuristic Grid Pattern */}
            <div
              className={`absolute inset-0 opacity-[0.035] ${
                isDark ? 'bg-[radial-gradient(#fff_1px,transparent_1px)]' : 'bg-[radial-gradient(#000_1px,transparent_1px)]'
              } [background-size:24px_24px]`}
            />
          </div>

          {/* Top Status Pill */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-red-500/20 bg-red-500/10 backdrop-blur-md text-xs font-semibold"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-red-500 font-bold uppercase tracking-wider text-[10px]">Zetass Pro v2.1</span>
            <span className="text-slate-400 dark:text-slate-500">•</span>
            <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>High-Speed POS Engine</span>
          </motion.div>

          {/* Center Brand with Official App Logo Icon */}
          <div className="relative z-10 flex flex-col items-center gap-7 my-auto">
            {/* 3D Glassmorphism Badge with Real App Icon */}
            <div className="relative">
              {/* Pulsing Backlight Ring */}
              <motion.div
                animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0.85, 0.4] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-3xl bg-red-500/35 blur-2xl"
              />

              {/* Main Badge Container with Floating Motion */}
              <motion.div
                initial={{ scale: 0, rotate: -20, y: 30 }}
                animate={{
                  scale: 1,
                  rotate: 0,
                  y: [0, -6, 0],
                }}
                transition={{
                  scale: { type: 'spring', stiffness: 220, damping: 18, delay: 0.15 },
                  rotate: { type: 'spring', stiffness: 220, damping: 18, delay: 0.15 },
                  y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.6 },
                }}
                className="relative"
              >
                <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl p-[2.5px] bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 shadow-2xl shadow-red-500/50">
                  <div className="w-full h-full rounded-[22px] bg-gradient-to-br from-slate-900 via-slate-950 to-red-950/80 flex flex-col items-center justify-center relative overflow-hidden border border-white/15 p-3.5">
                    {/* Glass Sweep Glint */}
                    <motion.div
                      animate={{ x: ['-140%', '180%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                      className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12 pointer-events-none z-20"
                    />

                    {/* Official App Logo Image */}
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img
                        src={appLogo}
                        alt="Zetass POS Logo"
                        className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(239,68,68,0.4)]"
                      />
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                        className="absolute -top-2 -right-2 z-10"
                      >
                        <Sparkles size={18} className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Typography */}
            <div className="text-center space-y-1.5">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="flex items-center justify-center gap-2"
              >
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight flex items-center gap-2">
                  <span className={isDark ? 'text-white' : 'text-slate-900'}>Zetass</span>
                  <span className="px-2.5 py-0.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/30 text-2xl sm:text-3xl font-black">
                    POS
                  </span>
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className={`text-xs sm:text-sm font-medium tracking-wide ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Enterprise Point of Sale & Store Ecosystem
              </motion.p>
            </div>

            {/* Futuristic Progress Track & Status */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="w-72 sm:w-80 flex flex-col items-center gap-3 pt-2"
            >
              {/* Progress bar container */}
              <div className="w-full relative">
                <div
                  className={`h-2.5 w-full rounded-full p-0.5 overflow-hidden backdrop-blur-md border ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-300/80 shadow-inner'
                  }`}
                >
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 relative"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  >
                    {/* Animated Light Tip */}
                    <div className="absolute right-0 top-0 bottom-0 w-3 bg-white/70 rounded-full blur-[1px]" />
                  </motion.div>
                </div>
              </div>

              {/* Status Text & Percentage */}
              <div className="w-full flex items-center justify-between text-xs px-1">
                <motion.span
                  key={currentStepIndex}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`text-[11px] font-medium flex items-center gap-1.5 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  <Store size={12} className="text-red-500" />
                  <span>{loadingSteps[currentStepIndex].text}</span>
                </motion.span>
                <span className="font-mono font-bold text-red-500 text-xs">
                  {progress}%
                </span>
              </div>
            </motion.div>
          </div>

          {/* Bottom Security / Developer Footer */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className={`relative z-10 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-[11px] ${
              isDark ? 'text-slate-500' : 'text-slate-500'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span className="font-medium">Offline-First SQLite Architecture</span>
            </div>
            <span className="hidden sm:inline text-slate-700">•</span>
            <span className="font-semibold text-slate-400 dark:text-slate-400">
              Developed by <strong className="text-slate-700 dark:text-slate-200">WalZetass-Kar</strong>
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

