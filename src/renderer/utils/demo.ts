export function isDemoMode(): boolean {
  const user = localStorage.getItem('user')
  if (!user) return false
  try {
    const userData = JSON.parse(user)
    return userData.hak_akses === 'demo'
  } catch {
    return false
  }
}

export function checkDemoMode(action: string = 'melakukan aksi ini'): boolean {
  if (isDemoMode()) {
    return true
  }
  return false
}
