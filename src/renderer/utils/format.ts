export const formatRupiah = (n: number | null | undefined) => {
  const val = Number(n)
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number.isFinite(val) ? val : 0)
}

export const formatDate = (s: string | null | undefined) => {
  if (!s) return '-'
  return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const formatDateTime = (s: string | null | undefined) => {
  if (!s) return '-'
  return new Date(s).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
