import { Capacitor, registerPlugin } from '@capacitor/core'

type AndroidPermissionAlias =
  | 'camera'
  | 'bluetoothConnect'
  | 'bluetoothScan'
  | 'readExternalStorage'
  | 'writeExternalStorage'

type PermissionState = 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied'

interface AndroidRuntimePermissionsPlugin {
  checkPermissions: () => Promise<Partial<Record<AndroidPermissionAlias, PermissionState>>>
  requestPermissions: (options: { permissions: AndroidPermissionAlias[] }) => Promise<Partial<Record<AndroidPermissionAlias, PermissionState>>>
}

const AndroidRuntimePermissions = registerPlugin<AndroidRuntimePermissionsPlugin>('AndroidRuntimePermissions')

function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

function sdkInt() {
  const match = /Android\s(\d+)/i.exec(navigator.userAgent)
  return match ? Number(match[1]) : null
}

async function requestAndroidAliases(aliases: AndroidPermissionAlias[]) {
  if (!isNativeAndroid()) return { granted: true }

  try {
    const current = await AndroidRuntimePermissions.checkPermissions()
    const missing = aliases.filter(alias => current[alias] !== 'granted')
    if (missing.length === 0) return { granted: true }

    const requested = await AndroidRuntimePermissions.requestPermissions({ permissions: missing })
    const denied = aliases.filter(alias => requested[alias] !== 'granted' && current[alias] !== 'granted')
    if (denied.length === 0) return { granted: true }

    return {
      granted: false,
      message: 'Izin Android belum diberikan. Buka pengaturan aplikasi lalu aktifkan izin yang diminta.',
    }
  } catch (error) {
    return {
      granted: false,
      message: error instanceof Error ? error.message : 'Gagal meminta izin Android',
    }
  }
}

export async function ensureCameraPermission() {
  return requestAndroidAliases(['camera'])
}

export async function ensureBluetoothPrinterPermission() {
  const sdk = sdkInt()
  if (!isNativeAndroid() || (sdk !== null && sdk < 31)) return { granted: true }
  return requestAndroidAliases(['bluetoothConnect', 'bluetoothScan'])
}

export async function ensureStoragePermission() {
  const sdk = sdkInt()
  if (!isNativeAndroid() || (sdk !== null && sdk >= 33)) return { granted: true }

  const aliases: AndroidPermissionAlias[] = sdk !== null && sdk >= 30
    ? ['readExternalStorage']
    : ['readExternalStorage', 'writeExternalStorage']
  return requestAndroidAliases(aliases)
}
