// Sound utility for UI feedback
export const playDangerSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  
  // Create "TETT TETT TETTT" sound
  const createBeep = (startTime: number, duration: number) => {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800 // High pitch for "TETT"
    oscillator.type = 'square'
    
    gainNode.gain.setValueAtTime(0.5, startTime)
    gainNode.gain.setValueAtTime(0.5, startTime + duration - 0.05)
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
    
    oscillator.start(startTime)
    oscillator.stop(startTime + duration)
  }
  
  // TETT (short)
  createBeep(audioContext.currentTime, 0.15)
  // TETT (short)
  createBeep(audioContext.currentTime + 0.25, 0.15)
  // TETTT (long)
  createBeep(audioContext.currentTime + 0.5, 0.5)
}

export const playWarningSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  
  // Create "TETT TETT TETTT" sound
  const createBeep = (startTime: number, duration: number) => {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'square'
    
    gainNode.gain.setValueAtTime(0.5, startTime)
    gainNode.gain.setValueAtTime(0.5, startTime + duration - 0.05)
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
    
    oscillator.start(startTime)
    oscillator.stop(startTime + duration)
  }
  
  // TETT TETT TETTT
  createBeep(audioContext.currentTime, 0.15)
  createBeep(audioContext.currentTime + 0.25, 0.15)
  createBeep(audioContext.currentTime + 0.5, 0.5)
}
