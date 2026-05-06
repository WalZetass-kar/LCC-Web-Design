/**
 * ═══════════════════════════════════════════════════════════════════════
 * DEMO OVERLAY — Visual Demo Mode Indicators (Layer 5 — UX)
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Renders:
 * 1. A persistent top banner (red, can't be dismissed)
 * 2. A transparent watermark across the entire app
 * 3. A floating badge at bottom-right (clickable → opens pricing popup)
 * 
 * NOTE: This is UX feedback only. Security is in the main process.
 * Even if someone removes this overlay via DevTools, writes are still blocked.
 */

import { useAuth } from '../contexts/AuthContext'
import { useDemo } from '../contexts/DemoContext'
import { ShieldAlert, Lock, Eye, Rocket } from 'lucide-react'

export default function DemoOverlay() {
  const { isDemo, user } = useAuth()
  const { openPricing, remainingUsage, state } = useDemo()

  if (!isDemo) return null

  return (
    <>
      {/* ─── TOP BANNER ─────────────────────────────────────────────── */}
      <div
        id="demo-banner"
        className="fixed top-0 left-0 right-0 z-[9999] demo-banner-gradient"
        style={{ pointerEvents: 'none' }}
      >
        <div className="flex items-center justify-center gap-2 py-1.5 px-4">
          <ShieldAlert size={14} className="text-white shrink-0 animate-pulse" />
          <span className="text-white text-xs font-bold tracking-wide uppercase">
            ⚠️ DEMO MODE — READ ONLY — Semua Aksi Tulis Diblokir
          </span>
          <ShieldAlert size={14} className="text-white shrink-0 animate-pulse" />
        </div>
      </div>

      {/* ─── WATERMARK (transparent, across the whole app) ──────────── */}
      <div
        id="demo-watermark"
        className="fixed inset-0 z-[9998] pointer-events-none select-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="demo-watermark-pattern" />
      </div>

      {/* ─── FLOATING BADGE (bottom-right, clickable) ────────────────── */}
      <div
        id="demo-badge"
        className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2"
      >
        {/* Upgrade CTA button */}
        <button
          onClick={() => openPricing('manual')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl
            bg-gradient-to-r from-violet-600 to-purple-500
            hover:from-violet-700 hover:to-purple-600
            shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50
            border border-purple-400/30
            transition-all duration-300 active:scale-[0.97]
            demo-upgrade-badge cursor-pointer"
        >
          <Rocket size={14} className="text-white" />
          <span className="text-white text-xs font-bold">Upgrade</span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-white text-[10px] font-medium">
            {remainingUsage} sisa
          </span>
        </button>

        {/* Demo mode info badge */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl
          bg-gradient-to-r from-red-600 to-orange-600
          shadow-2xl shadow-red-500/30 border border-red-400/30
          pointer-events-none"
        >
          <Lock size={14} className="text-white" />
          <div className="flex flex-col">
            <span className="text-white text-xs font-bold leading-tight">DEMO MODE</span>
            <span className="text-red-200 text-[10px] leading-tight">
              {user?.nama_pengguna ?? 'demo'} — {state.usage_count}/{state.usage_limit} transaksi
            </span>
          </div>
          <Eye size={14} className="text-red-200 ml-1" />
        </div>
      </div>
    </>
  )
}
