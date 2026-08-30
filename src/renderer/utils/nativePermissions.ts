import { Capacitor } from '@capacitor/core'

function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

export async function ensureCameraPermission(): Promise<{ granted: boolean; message?: string }> {
  if (!isNativeAndroid()) return { granted: true }
  try {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      return { granted: true }
    }
  } catch {}
  return { granted: true }
}

export async function ensureBluetoothPrinterPermission(): Promise<{ granted: boolean; message?: string }> {
  return { granted: true }
}

export async function ensureStoragePermission(): Promise<{ granted: boolean; message?: string }> {
  if (!isNativeAndroid()) return { granted: true }

  try {
    const { Filesystem } = await import('@capacitor/filesystem')
    const check = await Filesystem.checkPermissions()
    if (check.publicStorage !== 'granted') {
      const req = await Filesystem.requestPermissions()
      if (req.publicStorage === 'granted') {
        return { granted: true }
      }
    }
    return { granted: true }
  } catch {
    // Scoped storage on Android 10+ works without explicit permission
    return { granted: true }
  }
}
