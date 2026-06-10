import { Capacitor } from '@capacitor/core'
import { NativeBiometric } from '@capgo/capacitor-native-biometric'

export class BiometricService {
  static async isAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false
    try {
      const result = await NativeBiometric.isAvailable()
      return result.isAvailable
    } catch {
      return false
    }
  }

  static async authenticate(): Promise<{ success: boolean; message?: string }> {
    if (!Capacitor.isNativePlatform()) return { success: false, message: 'Hanya tersedia di mobile.' }
    try {
      await NativeBiometric.verifyIdentity({
        reason: 'Konfirmasi identitas Anda untuk masuk ke Zetass Pos',
        title: 'Autentikasi Biometrik',
        subtitle: 'Gunakan sidik jari atau wajah',
        description: 'Autentikasi diperlukan untuk melanjutkan',
      })
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || 'Autentikasi biometrik gagal' }
    }
  }
}
