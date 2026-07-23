import { useEffect, useState } from 'react'
import { Clock, Search, CheckCircle, XCircle, AlertTriangle, Clock as ClockIcon, Calendar } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Badge from '../components/Badge'
import { SkeletonStatGrid, SkeletonSpinner } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatDate, formatDateTime } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

interface Attendance {
  id_absensi: number
  id_karyawan: number
  tgl: string
  jam_masuk: string | null
  jam_keluar: string | null
  status: 'HADIR' | 'IZIN' | 'SAKIT' | 'CUTI' | 'ALPA' | 'TERLAMBAT'
  keterlambatan_menit: number | null
  catatan: string | null
  created_at: string
  updated_at: string
  karyawan_nama?: string
  karyawan_nik?: string
}

interface Employee {
  id_karyawan: number
  nik: string
  nama_lengkap: string
  status_karyawan: string
}

interface Summary {
  total_hadir: number
  total_terlambat: number
  total_izin: number
  total_sakit: number
  total_cuti: number
  total_alpa: number
}

const statusVariant = (s: string) => {
  if (s === 'HADIR') return 'green'
  if (s === 'TERLAMBAT') return 'amber'
  if (s === 'IZIN' || s === 'SAKIT' || s === 'CUTI') return 'blue'
  if (s === 'ALPA') return 'red'
  return 'gray'
}

export default function Attendance() {
  const toast = useToast()
  const { user } = useAuth()
  const [data, setData] = useState<Attendance[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterEmployee, setFilterEmployee] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  const load = async () => {
    const [r1, r2, r3] = await Promise.all([
      api<Attendance[]>('attendance:getAll', selectedDate),
      api<Employee[]>('employee:getAll'),
      api<Summary>('attendance:getSummary', selectedDate),
    ])
    if (r1.success) {
      let filtered = r1.data ?? []
      if (filterEmployee) filtered = filtered.filter(a => a.id_karyawan === parseInt(filterEmployee))
      setData(filtered)
    }
    if (r2.success) setEmployees(r2.data ?? [])
    if (r3.success) setSummary(r3.data ?? null)
    setLoadingData(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (!loadingData) load() }, [selectedDate, filterEmployee])

  const handleClockIn = async (id_karyawan: number) => {
    setLoading(true)
    const r = await api('attendance:clockIn', id_karyawan, selectedDate)
    setLoading(false)
    if (r.success) { toast(r.message as string); load() }
    else toast(r.message as string, 'error')
  }

  const handleClockOut = async (id_karyawan: number) => {
    setLoading(true)
    const r = await api('attendance:clockOut', id_karyawan, selectedDate)
    setLoading(false)
    if (r.success) { toast(r.message as string); load() }
    else toast(r.message as string, 'error')
  }

  return (
    <div className="space-y-4">
      {loadingData ? (
        <>
          <SkeletonStatGrid count={4} />
          <SkeletonSpinner label="Memuat data absensi..." />
        </>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card title="Hadir" action={<CheckCircle size={16} className="text-emerald-500" />}>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{summary.total_hadir}</p>
              </Card>
              <Card title="Terlambat" action={<Clock size={16} className="text-amber-500" />}>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{summary.total_terlambat}</p>
              </Card>
              <Card title="Izin/Sakit/Cuti" action={<AlertTriangle size={16} className="text-blue-500" />}>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">{summary.total_izin + summary.total_sakit + summary.total_cuti}</p>
              </Card>
              <Card title="Alpa" action={<XCircle size={16} className="text-red-500" />}>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">{summary.total_alpa}</p>
              </Card>
              <Card title="Tanggal" action={<Calendar size={16} className="text-primary-500" />}>
                <p className="text-lg font-bold text-slate-800 dark:text-white mt-2">{formatDate(selectedDate)}</p>
              </Card>
            </div>
          )}

          <Card>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="w-full sm:w-48">
                <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
              </div>
              <div className="w-full sm:w-48">
                <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                  <option value="">Semua Karyawan</option>
                  {employees.filter(e => e.status_karyawan === 'AKTIF').map(e => (
                    <option key={e.id_karyawan} value={e.id_karyawan}>{e.nama_lengkap}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[700px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Karyawan</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Jam Masuk</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Jam Keluar</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Telat (menit)</th>
                      <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 sm:px-4 py-10 text-center text-slate-400 text-sm">
                          Belum ada data absensi untuk tanggal ini
                        </td>
                      </tr>
                    ) : (
                      data.map(a => (
                        <tr key={a.id_absensi} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-3 sm:px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{a.karyawan_nama || '-'}</td>
                          <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{a.jam_masuk || '-'}</td>
                          <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{a.jam_keluar || '-'}</td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <Badge label={a.status} variant={statusVariant(a.status)} />
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                            {a.keterlambatan_menit != null ? `${a.keterlambatan_menit} menit` : '-'}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {!a.jam_masuk && (
                                <Button size="sm" icon={<ClockIcon size={14} />} loading={loading} onClick={() => handleClockIn(a.id_karyawan)}>
                                  Masuk
                                </Button>
                              )}
                              {a.jam_masuk && !a.jam_keluar && (
                                <Button size="sm" variant="secondary" icon={<ClockIcon size={14} />} loading={loading} onClick={() => handleClockOut(a.id_karyawan)}>
                                  Keluar
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
