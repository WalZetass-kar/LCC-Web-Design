import { useState, useEffect } from 'react'
import { Printer, Trash2, Play, Pause, RotateCcw, CheckCircle, Clock, AlertCircle, FileText, Settings, X } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import { SkeletonPage } from '../components/Skeleton'
import { formatDateTime } from '../utils/format'
import { secureStorage } from '../utils/secureStorage'

interface PrintJob {
  id: number
  type: 'struk' | 'label' | 'laporan'
  title: string
  data: any
  status: 'pending' | 'printing' | 'completed' | 'failed'
  attempts: number
  created_at: string
  printed_at?: string
  error?: string
}

export default function PrintQueue() {
  const toast = useToast()
  const [jobs, setJobs] = useState<PrintJob[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState({
    defaultPrinter: '',
    autoPrint: false,
    copies: 1,
    paperSize: '58mm',
  })
  const [printers, setPrinters] = useState<string[]>([])

  // Load print queue from encrypted local storage
  useEffect(() => {
    const stored = secureStorage.getItem('printQueue')
    if (stored) {
      setJobs(JSON.parse(stored))
    }
    setLoading(false)
    // Load available printers
    api<any[]>('print:getPrinters').then(r => {
      if (r.success && r.data) {
        setPrinters(r.data.map((p: any) => p.name))
      }
    })
  }, [])

  const saveJobs = (newJobs: PrintJob[]) => {
    setJobs(newJobs)
    secureStorage.setJSON('printQueue', newJobs)
  }

  const addJob = (type: PrintJob['type'], title: string, data: any) => {
    const newJob: PrintJob = {
      id: Date.now(),
      type,
      title,
      data,
      status: 'pending',
      attempts: 0,
      created_at: new Date().toISOString(),
    }
    saveJobs([...jobs, newJob])
    toast('Berhasil ditambahkan ke antrian print')

    if (settings.autoPrint) {
      processNextJob()
    }
  }

  const processNextJob = async () => {
    const pendingJob = jobs.find(j => j.status === 'pending')
    if (!pendingJob) return

    const updatedJobs = jobs.map(j =>
      j.id === pendingJob.id ? { ...j, status: 'printing' as const } : j
    )
    saveJobs(updatedJobs)

    const r = await api<any>('print:execute', {
      printerName: settings.defaultPrinter || undefined,
      silent: true,
      copies: settings.copies,
    })

    const finalJobs = jobs.map(j =>
      j.id === pendingJob.id
        ? r.success
          ? { ...j, status: 'completed' as const, printed_at: new Date().toISOString() }
          : { ...j, status: 'failed' as const, error: r.message ?? 'Print gagal' }
        : j
    )
    saveJobs(finalJobs)
    if (r.success) toast('Print selesai: ' + pendingJob.title)
    else toast('Print gagal: ' + (r.message ?? ''), 'error')
  }

  const retryJob = (job: PrintJob) => {
    const updatedJobs = jobs.map(j => 
      j.id === job.id ? { 
        ...j, 
        status: 'pending' as const,
        attempts: j.attempts + 1,
        error: undefined 
      } : j
    )
    saveJobs(updatedJobs)
    processNextJob()
  }

  const clearCompleted = () => {
    const activeJobs = jobs.filter(j => j.status !== 'completed')
    saveJobs(activeJobs)
    toast('Antrian selesai dibersihkan')
  }

  const deleteJob = (jobId: number) => {
    const updatedJobs = jobs.filter(j => j.id !== jobId)
    saveJobs(updatedJobs)
    toast('Pekerjaan print dihapus')
  }

  if (loading) return <SkeletonPage rows={5} />

  const pendingCount = jobs.filter(j => j.status === 'pending').length
  const printingCount = jobs.filter(j => j.status === 'printing').length
  const completedCount = jobs.filter(j => j.status === 'completed').length

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Printer className="text-primary-500" size={28} />
            Antrian Print
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Kelola antrian print untuk printer thermal</p>
        </div>
        <Button onClick={() => setSettingsOpen(true)} variant="secondary" icon={<Settings size={16} />} className="w-full sm:w-auto">
          Pengaturan
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <Clock className="w-6 h-6 mx-auto text-amber-500 mb-1" />
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{pendingCount}</p>
            <p className="text-xs text-slate-500">Menunggu</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Printer className="w-6 h-6 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{printingCount}</p>
            <p className="text-xs text-slate-500">Sedang Print</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <CheckCircle className="w-6 h-6 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{completedCount}</p>
            <p className="text-xs text-slate-500">Selesai</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <AlertCircle className="w-6 h-6 mx-auto text-red-500 mb-1" />
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{jobs.filter(j => j.status === 'failed').length}</p>
            <p className="text-xs text-slate-500">Gagal</p>
          </div>
        </Card>
      </div>

      {/* Actions */}
      {pendingCount > 0 && (
        <div className="flex gap-2">
          <Button onClick={processNextJob} icon={<Play size={16} />} className="w-full sm:w-auto">
            Print Next ({pendingCount})
          </Button>
          {completedCount > 0 && (
            <Button variant="secondary" onClick={clearCompleted} icon={<Trash2 size={16} />} className="w-full sm:w-auto">
              Clear Completed
            </Button>
          )}
        </div>
      )}

      {/* Queue List */}
      <Card>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-[600px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Jenis</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Judul</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Waktu</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">
                      Antrian print kosong
                    </td>
                  </tr>
                ) : (
                  jobs.map(job => (
                    <tr key={job.id} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <Badge 
                          label={job.type === 'struk' ? 'Struk' : job.type === 'label' ? 'Label' : 'Laporan'} 
                          variant={job.type === 'struk' ? 'blue' : job.type === 'label' ? 'amber' : 'gray'} 
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{job.title}</td>
                      <td className="px-4 py-3 text-center">
                        {job.status === 'pending' && <Badge label="Menunggu" variant="amber" />}
                        {job.status === 'printing' && <Badge label="Printing" variant="blue" />}
                        {job.status === 'completed' && <Badge label="Selesai" variant="green" />}
                        {job.status === 'failed' && <Badge label="Gagal" variant="red" />}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {job.printed_at ? formatDateTime(job.printed_at) : formatDateTime(job.created_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          {job.status === 'failed' && (
                            <button onClick={() => retryJob(job)} className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-500" title="Coba Lagi">
                              <RotateCcw size={16} />
                            </button>
                          )}
                          {job.status !== 'printing' && (
                            <button onClick={() => deleteJob(job.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Hapus">
                              <Trash2 size={16} />
                            </button>
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

      {/* Settings Modal */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Pengaturan Print" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSettingsOpen(false)} className="w-full sm:w-auto">Tutup</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Printer Default</label>
            <select 
              value={settings.defaultPrinter}
              onChange={e => setSettings({ ...settings, defaultPrinter: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            >
              <option value="">Printer default sistem</option>
              {printers.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Ukuran Kertas</label>
            <select 
              value={settings.paperSize}
              onChange={e => setSettings({ ...settings, paperSize: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            >
              <option value="58mm">58mm</option>
              <option value="80mm">80mm</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Jumlah Salinan</label>
            <input 
              type="number"
              min={1}
              max={5}
              value={settings.copies}
              onChange={e => setSettings({ ...settings, copies: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div>
              <p className="font-medium text-slate-700 dark:text-slate-200">Auto Print</p>
              <p className="text-xs text-slate-500">Print otomatis setelah ditambahkan</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, autoPrint: !settings.autoPrint })}
              className={`w-12 h-6 rounded-full transition-colors ${settings.autoPrint ? 'bg-primary-500' : 'bg-slate-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.autoPrint ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
