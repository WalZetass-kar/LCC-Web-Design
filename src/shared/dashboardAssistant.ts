import type { DashboardSummary } from './types'

export function formatIdr(value: number | null | undefined) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value ?? 0)
}

function topProductSentence(summary: DashboardSummary) {
  const product = summary.topProducts?.[0]
  if (!product) return 'Belum ada produk terlaris minggu ini.'

  const name = product.nama_barang || product.kd_barang || 'Produk'
  return `Produk terlaris minggu ini adalah ${name} dengan ${product.total_qty.toLocaleString('id-ID')} terjual dan pemasukan ${formatIdr(product.total_revenue)}.`
}

function lowStockSentence(summary: DashboardSummary) {
  const products = summary.lowStockProducts || []
  if (products.length === 0) return 'Semua stok dalam kondisi aman.'

  const preview = products
    .slice(0, 3)
    .map(product => `${product.nama_barang || product.kd_barang} sisa ${product.stok ?? 0}`)
    .join(', ')

  return `${products.length} produk perlu restock. Prioritas: ${preview}.`
}

export function buildLocalAssistantResponse(question: string, summary: DashboardSummary) {
  const q = question.toLowerCase()
  const averageWeekly = Math.round(summary.week.total / 7)
  const predicted = summary.predictedTomorrow || 0

  if (q.includes('hari ini') || q.includes('today')) {
    return `Pemasukan hari ini ${formatIdr(summary.today.total)} dari ${summary.today.count.toLocaleString('id-ID')} transaksi.`
  }

  if (q.includes('minggu')) {
    return `Pemasukan minggu ini ${formatIdr(summary.week.total)} dari ${summary.week.count.toLocaleString('id-ID')} transaksi. Rata-rata per hari ${formatIdr(averageWeekly)}.`
  }

  if (q.includes('bulan')) {
    return `Pemasukan bulan ini ${formatIdr(summary.month.total)} dari ${summary.month.count.toLocaleString('id-ID')} transaksi.`
  }

  if (q.includes('rata')) {
    return `Rata-rata pemasukan harian minggu ini ${formatIdr(averageWeekly)}. Angka ini dihitung dari total minggu ini dibagi 7 hari.`
  }

  if (q.includes('prediksi') || q.includes('besok')) {
    return `Prediksi pemasukan besok ${formatIdr(predicted)} berdasarkan tren penjualan 7 hari terakhir.`
  }

  if (q.includes('produk') || q.includes('terlaris')) {
    return topProductSentence(summary)
  }

  if (q.includes('stok') || q.includes('restock') || q.includes('menipis')) {
    return lowStockSentence(summary)
  }

  return [
    `Ringkasan saat ini: hari ini ${formatIdr(summary.today.total)}, minggu ini ${formatIdr(summary.week.total)}, dan bulan ini ${formatIdr(summary.month.total)}.`,
    `Rata-rata harian minggu ini ${formatIdr(averageWeekly)}. Prediksi besok ${formatIdr(predicted)}.`,
    `${topProductSentence(summary)} ${lowStockSentence(summary)}`,
  ].join('\n')
}

export function buildAssistantPrompt(question: string, summary: DashboardSummary) {
  return [
    'Kamu adalah Asisten Zetass-Kar untuk aplikasi MediaSoft POS Zetass.',
    'Jawab singkat, praktis, dalam Bahasa Indonesia, dan hanya gunakan data JSON yang diberikan.',
    'Jika data tidak tersedia, katakan data belum tersedia dan beri langkah yang bisa dilakukan user.',
    '',
    `Pertanyaan: ${question}`,
    '',
    `Data dashboard JSON: ${JSON.stringify(summary)}`,
  ].join('\n')
}
