import { useEffect, useState } from 'react'
import { MessageSquare, Star, Filter, Reply, BarChart3, ThumbsUp, MessageCircle } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Select from '../components/Select'
import Textarea from '../components/Textarea'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { SkeletonStatGrid } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatDateTime } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

interface Feedback {
  kd_feedback: number
  nama_pelanggan: string
  rating: number
  kategori: string
  pesan: string
  status: 'BARU' | 'DIBACA' | 'DIBALAS'
  balasan: string | null
  tgl_feedback: string
  tgl_dibalas: string | null
}

interface FeedbackSummary {
  rata_rata: number
  total: number
  distribusi: Record<number, number>
  per_kategori: { kategori: string; jumlah: number }[]
}

export default function CustomerFeedback() {
  const toast = useToast()
  const { user } = useAuth()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [summary, setSummary] = useState<FeedbackSummary | null>(null)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [filterRating, setFilterRating] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [replyModal, setReplyModal] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  const load = async () => {
    const [r1, r2] = await Promise.all([
      api<Feedback[]>('feedback:getAll', filterRating || undefined, filterStatus || undefined),
      api<FeedbackSummary>('feedback:getSummary'),
    ])
    if (r1.success) setFeedbacks(r1.data ?? [])
    if (r2.success) setSummary(r2.data ?? null)
    setLoadingData(false)
  }

  useEffect(() => { load() }, [filterRating, filterStatus])

  const handleReply = async () => {
    if (!replyText.trim() || !selectedFeedback) {
      return toast('Balasan wajib diisi', 'error')
    }
    setLoading(true)
    const r = await api('feedback:reply', selectedFeedback.kd_feedback, replyText)
    setLoading(false)
    if (r.success) {
      toast(r.message as string)
      setReplyModal(false)
      setReplyText('')
      setSelectedFeedback(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const openReply = (fb: Feedback) => {
    setSelectedFeedback(fb)
    setReplyText(fb.balasan || '')
    setReplyModal(true)
  }

  const StarRating = ({ rating, size = 16 }: { rating: number; size?: number }) => (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          size={size}
          className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}
        />
      ))}
    </span>
  )

  const statusVariant: Record<string, 'blue' | 'gray' | 'green'> = {
    BARU: 'blue', DIBACA: 'gray', DIBALAS: 'green'
  }

  const kategoriColors: Record<string, string> = {
    PELAYANAN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    PRODUK: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    KURIR: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    TOKO: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    LAINNYA: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  }

  const filterRatingOptions = [
    { value: '', label: 'Semua Rating' },
    { value: '5', label: '5 Bintang' },
    { value: '4', label: '4 Bintang' },
    { value: '3', label: '3 Bintang' },
    { value: '2', label: '2 Bintang' },
    { value: '1', label: '1 Bintang' },
  ]

  const filterStatusOptions = [
    { value: '', label: 'Semua Status' },
    { value: 'BARU', label: 'Baru' },
    { value: 'DIBACA', label: 'Terbaca' },
    { value: 'DIBALAS', label: 'Terbalas' },
  ]

  return (
    <div className="space-y-4">
      {loadingData ? (
        <SkeletonStatGrid count={4} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={20} className="text-primary-500" />
              <span className="text-lg font-semibold text-slate-700 dark:text-slate-200">Umpan Balik Pelanggan</span>
            </div>
            <div className="flex gap-2">
              <Select
                options={filterRatingOptions}
                value={filterRating}
                onChange={e => setFilterRating(e.target.value)}
                className="w-36"
              />
              <Select
                options={filterStatusOptions}
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-36"
              />
            </div>
          </div>

          {/* Summary */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card title="Rata-rata Rating" action={<Star size={16} className="text-amber-500" />}>
                <div className="mt-2">
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">{(summary.rata_rata ?? 0).toFixed(1)}</p>
                  <StarRating rating={Math.round(summary.rata_rata)} />
                </div>
              </Card>
              <Card title="Total Feedback" action={<MessageCircle size={16} className="text-primary-500" />}>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-2">{summary.total}</p>
              </Card>
              <Card title="Rating Tertinggi" action={<ThumbsUp size={16} className="text-emerald-500" />}>
                <div className="mt-2 space-y-1">
                  {[5, 4, 3, 2, 1].map(r => (
                    <div key={r} className="flex items-center gap-2 text-xs">
                      <span className="w-8 text-slate-500">{r} </span>
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${summary.total > 0 ? (summary.distribusi[r] || 0) / summary.total * 100 : 0}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-slate-500">{summary.distribusi[r] || 0}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title="per Kategori" action={<BarChart3 size={16} className="text-violet-500" />}>
                <div className="mt-2 space-y-1">
                  {summary.per_kategori.slice(0, 5).map(k => (
                    <div key={k.kategori} className="flex justify-between text-xs">
                      <span className="text-slate-500">{k.kategori}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{k.jumlah}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          <Card title="Daftar Feedback">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[768px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Nama</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Rating</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Kategori</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Pesan</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tanggal</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {feedbacks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 sm:px-4 py-10 text-center text-slate-400">Belum ada feedback</td>
                      </tr>
                    ) : (
                      feedbacks.map(fb => (
                        <tr key={fb.kd_feedback} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-3 sm:px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{fb.nama_pelanggan}</td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <StarRating rating={fb.rating} size={14} />
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${kategoriColors[fb.kategori] || kategoriColors.LAINNYA}`}>
                              {fb.kategori}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 max-w-[200px]">
                            <p className="truncate text-slate-700 dark:text-slate-300">{fb.pesan}</p>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <Badge label={fb.status} variant={statusVariant[fb.status] || 'gray'} />
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-slate-500 text-xs">{formatDateTime(fb.tgl_feedback)}</td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <button
                              onClick={() => openReply(fb)}
                              className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 transition-colors"
                              title={fb.balasan ? 'Lihat/Edit Balasan' : 'Balas'}
                            >
                              <Reply size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {/* Reply Modal */}
          <Modal
            open={replyModal}
            onClose={() => { setReplyModal(false); setSelectedFeedback(null) }}
            title={selectedFeedback?.balasan ? 'Edit Balasan' : 'Balas Feedback'}
            size="md"
            footer={
              <>
                <Button variant="secondary" onClick={() => { setReplyModal(false); setSelectedFeedback(null) }} className="w-full sm:w-auto">Batal</Button>
                <Button loading={loading} onClick={handleReply} className="w-full sm:w-auto">
                  {selectedFeedback?.balasan ? 'Simpan' : 'Kirim Balasan'}
                </Button>
              </>
            }
          >
            {selectedFeedback && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{selectedFeedback.nama_pelanggan}</span>
                    <StarRating rating={selectedFeedback.rating} size={12} />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{selectedFeedback.pesan}</p>
                </div>
                <Textarea
                  label="Balasan Anda"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Tulis balasan..."
                  rows={4}
                />
              </div>
            )}
          </Modal>
        </>
      )}
    </div>
  )
}
