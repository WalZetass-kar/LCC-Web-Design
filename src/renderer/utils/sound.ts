/**
 * Web Audio API synthesizer for realistic cashier sounds (zero external assets).
 * Provides immediate auditory feedback for scanner, payment success, and warnings.
 */
class CashierSoundPlayer {
  private ctx: AudioContext | null = null

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  /** Short crisp barcode beep (1400Hz) */
  playScanBeep() {
    try {
      const ctx = this.getContext()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1400, ctx.currentTime)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.08)
    } catch {
      // Ignore audio context errors
    }
  }

  /** Cheerful double chime for payment success */
  playSuccessChime() {
    try {
      const ctx = this.getContext()
      if (!ctx) return
      const now = ctx.currentTime

      // Note 1: E5 (659.25Hz)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(659.25, now)
      gain1.gain.setValueAtTime(0.2, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.15)

      // Note 2: A5 (880Hz)
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(880, now + 0.1)
      gain2.gain.setValueAtTime(0.2, now + 0.1)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.1)
      osc2.stop(now + 0.35)
    } catch {
      // Ignore audio context errors
    }
  }

  /** Warning double buzz for error / insufficient cash / out of stock */
  playErrorBuzz() {
    try {
      const ctx = this.getContext()
      if (!ctx) return
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, now)
      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.18)
    } catch {
      // Ignore audio context errors
    }
  }
}

export const cashierSound = new CashierSoundPlayer()

export function playDangerSound() {
  cashierSound.playErrorBuzz()
}

export function playWarningSound() {
  cashierSound.playErrorBuzz()
}

export function playSuccessSound() {
  cashierSound.playSuccessChime()
}
