import { secureStorage } from './secureStorage'

export interface RendererAuthDeviceInfo {
  deviceId: string
  deviceName: string
  userAgent: string
  platform: string
  osName: string
  appVersion: string
}

const DEVICE_ID_KEY = 'auth_device_id'

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}

export function getAuthDeviceId(): string {
  const existing = secureStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing

  const next = randomId()
  secureStorage.setItem(DEVICE_ID_KEY, next)
  return next
}

export function collectAuthDeviceInfo(): RendererAuthDeviceInfo {
  const userAgent = navigator.userAgent || 'unknown'
  const platform = /Android/i.test(userAgent)
    ? 'android'
    : /Electron/i.test(userAgent)
      ? 'electron'
      : 'web'
  const osName = /Windows/i.test(userAgent)
    ? 'Windows'
    : /Android/i.test(userAgent)
      ? 'Android'
      : /Mac OS|Macintosh/i.test(userAgent)
        ? 'macOS'
        : /Linux/i.test(userAgent)
          ? 'Linux'
          : /iPhone|iPad/i.test(userAgent)
            ? 'iOS'
            : 'Unknown'

  return {
    deviceId: getAuthDeviceId(),
    deviceName: navigator.platform || 'unknown',
    userAgent,
    platform,
    osName,
    appVersion: '2.0.0',
  }
}
