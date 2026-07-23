import { supabase } from './config.js'

export const tryCloudSignIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      return { success: false, message: error.message }
    }
    
    return { success: true, user: data.user, session: data.session }
  } catch (err: any) {
    return { success: false, message: err.message || 'Terjadi kesalahan saat login' }
  }
}

export const logOutCloud = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { success: true }
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal logout dari cloud' }
  }
}

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession()
  if (error) return { session: null, user: null }
  return { session: data.session, user: data.session?.user || null }
}

export const resetPassword = async (email: string) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
    return { success: true, message: 'Link reset password telah dikirim ke email Anda' }
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal mengirim link reset password' }
  }
}

export const updatePasswordCloud = async (newPassword: string) => {
  try {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      return { success: false, message: error.message }
    }
    return { success: true, user: data.user }
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal mengubah password di Supabase' }
  }
}
