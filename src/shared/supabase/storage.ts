import { supabase } from './config.js'

export const uploadFile = async (bucket: string, path: string, file: File | Blob) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      })
      
    if (error) throw error
    
    return { success: true, path: data.path }
  } catch (err: any) {
    console.error('Failed to upload file:', err)
    return { success: false, message: err.message }
  }
}

export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export const deleteFile = async (bucket: string, path: string) => {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path])
    if (error) throw error
    return { success: true }
  } catch (err: any) {
    console.error('Failed to delete file:', err)
    return { success: false, message: err.message }
  }
}
