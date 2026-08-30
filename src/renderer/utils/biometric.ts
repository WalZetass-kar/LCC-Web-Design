import { Capacitor } from '@capacitor/core'
import { secureStorage } from './secureStorage'

const BIOMETRIC_ENABLED_KEY = 'zetass_biometric_enabled'
const BIOMETRIC_CREDENTIALS_KEY = 'zetass_biometric_credentials'

export interface BiometricAvailability {
  isAvailable: boolean
  biometryType?: string
  strongBiometry?: boolean
}

class BiometricService {
  /**
   * Check if Native Biometric authentication is supported on this device
   */
  async isAvailable(): Promise<BiometricAvailability> {
    if (!Capacitor.isNativePlatform()) {
      return { isAvailable: false }
    }

    try {
      const module = await import('@capgo/capacitor-native-biometric')
      const result = await module.NativeBiometric.isAvailable({ useFallback: true })
      return {
        isAvailable: Boolean(result?.isAvailable),
        biometryType: result?.biometryType ? String(result.biometryType) : undefined,
        strongBiometry: Boolean((result as any)?.strongBiometry),
      }
    } catch {
      return { isAvailable: false }
    }
  }

  /**
   * Check if biometric login is enabled by the user in settings
   */
  isEnabled(): boolean {
    return secureStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true'
  }

  /**
   * Enable or disable biometric login
   */
  setEnabled(enabled: boolean) {
    if (!enabled) {
      secureStorage.removeItem(BIOMETRIC_ENABLED_KEY)
      secureStorage.removeItem(BIOMETRIC_CREDENTIALS_KEY)
    } else {
      secureStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true')
    }
  }

  /**
   * Store user credentials securely for biometric login
   */
  async saveCredentials(username: string, tokenOrPassword: string) {
    if (!Capacitor.isNativePlatform()) return

    try {
      const module = await import('@capgo/capacitor-native-biometric')
      await module.NativeBiometric.setCredentials({
        server: 'com.zetass.pos',
        username,
        password: tokenOrPassword,
      })
      this.setEnabled(true)
    } catch {
      // Fallback to secure storage
      secureStorage.setJSON(BIOMETRIC_CREDENTIALS_KEY, { username, tokenOrPassword })
      this.setEnabled(true)
    }
  }

  /**
   * Prompt biometric authentication and retrieve stored credentials
   */
  async authenticate(): Promise<{ success: boolean; username?: string; password?: string; message?: string }> {
    if (!Capacitor.isNativePlatform()) {
      return { success: false, message: 'Autentikasi biometrik hanya tersedia di perangkat mobile native.' }
    }

    try {
      const module = await import('@capgo/capacitor-native-biometric')
      await module.NativeBiometric.verifyIdentity({
        reason: 'Masuk ke Zetass POS menggunakan Sidik Jari atau Face ID',
        title: 'Autentikasi Biometrik',
        subtitle: 'Konfirmasi identitas kasir / pemilik',
        description: 'Pindai sidik jari atau wajah Anda',
        useFallback: true,
      })

      // Retrieve credentials
      try {
        const creds = await module.NativeBiometric.getCredentials({ server: 'com.zetass.pos' })
        if (creds && creds.username && creds.password) {
          return { success: true, username: creds.username, password: creds.password }
        }
      } catch {}

      // Check fallback storage
      const fallback = secureStorage.getJSON<{ username: string; tokenOrPassword: string } | null>(BIOMETRIC_CREDENTIALS_KEY, null)
      if (fallback?.username && fallback?.tokenOrPassword) {
        return { success: true, username: fallback.username, password: fallback.tokenOrPassword }
      }

      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Verifikasi biometrik dibatalkan atau tidak cocok.',
      }
    }
  }

  /**
   * Clear biometric credentials on logout or user switch
   */
  async clearCredentials() {
    this.setEnabled(false)
    if (Capacitor.isNativePlatform()) {
      try {
        const module = await import('@capgo/capacitor-native-biometric')
        await module.NativeBiometric.deleteCredentials({ server: 'com.zetass.pos' })
      } catch {}
    }
  }
}

export const biometric = new BiometricService()
