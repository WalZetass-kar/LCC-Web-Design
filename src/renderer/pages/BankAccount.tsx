import { useEffect, useState } from 'react'
import { Building2, Plus, CheckCircle2, XCircle, RefreshCw, ArrowUpDown } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Select from '../components/Select'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import ConfirmDialog from '../components/ConfirmDialog'
import { SkeletonStatGrid } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatRupiah, formatDateTime } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

interface BankAccount {
  kd_rekening: number
  nama_bank: string
  nomor_rekening: string
  atas_nama: string
  saldo_awal: number
  saldo_saat_ini: number
  mata_uang: string
  status: 'AKTIF' | 'NONAKTIF'
  created_at: string
}

interface BankTransaction {
  kd_transaksi: number
  kd_rekening: number
  jenis: 'DEBIT' | 'KREDIT'
  jumlah: number
  keterangan: string
  tgl_transaksi: string
  reconciled: boolean
  tgl_rekonsiliasi: string | null
}

interface RekonsiliasiData {
  kd_rekonsiliasi: number
  bulan: number
  tahun: number
  saldo_buku: number
  saldo_bank: number
  selisih: number
  reconciled_at: string
}

export default function BankAccount() {
  const toast = useToast()
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null)
  const [tab, setTab] = useState<'accounts' | 'transactions' | 'reconciliation'>('accounts')
  const [modal, setModal] = useState<'add' | 'edit' | 'addTx' | null>(null)
  const [editAccount, setEditAccount] = useState<BankAccount | null>(null)
  const [form, setForm] = useState({ nama_bank: '', nomor_rekening: '', atas_nama: '', saldo_awal: '', mata_uang: 'IDR' })
  const [txForm, setTxForm] = useState({ jenis: 'DEBIT', jumlah: '', keterangan: '' })
  const [reconcileBulan, setReconcileBulan] = useState(new Date().getMonth() + 1)
  const [reconcileTahun, setReconcileTahun] = useState(new Date().getFullYear())
  const [saldoBank, setSaldoBank] = useState('')
  const [reconcileData, setReconcileData] = useState<RekonsiliasiData[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [deleteAccount, setDeleteAccount] = useState<BankAccount | null>(null)
  const [search, setSearch] = useState('')

  const load = async () => {
    const r = await api<BankAccount[]>('bank:getAccounts')
    if (r.success) setAccounts(r.data ?? [])
    setLoadingData(false)
  }

  useEffect(() => { load() }, [])

  const loadTransactions = async (kd_rekening: number) => {
    const r = await api<BankTransaction[]>('bank:getTransactions', kd_rekening)
    if (r.success) setTransactions(r.data ?? [])
  }

  const loadReconciliation = async () => {
    const r = await api<RekonsiliasiData[]>('bank:reconcile', reconcileBulan, reconcileTahun)
    if (r.success) setReconcileData(r.data ?? [])
  }

  useEffect(() => {
    if (tab === 'reconciliation') loadReconciliation()
  }, [tab, reconcileBulan, reconcileTahun])

  const handleSaveAccount = async () => {
    if (!form.nama_bank || !form.nomor_rekening || !form.atas_nama || !form.saldo_awal) {
      return toast('Semua field wajib diisi', 'error')
    }
    setLoading(true)
    const payload = { ...form, saldo_awal: parseFloat(form.saldo_awal) }
    if (modal === 'add') {
      const r = await api('bank:createAccount', payload)
      if (r.success) { toast(r.message as string); setModal(null); setForm({ nama_bank: '', nomor_rekening: '', atas_nama: '', saldo_awal: '', mata_uang: 'IDR' }); load() }
      else toast(r.message as string, 'error')
    } else if (modal === 'edit' && editAccount) {
      const r = await api('bank:updateAccount', editAccount.kd_rekening, payload)
      if (r.success) { toast(r.message as string); setModal(null); setEditAccount(null); load() }
      else toast(r.message as string, 'error')
    }
    setLoading(false)
  }

  const handleDeleteAccount = async () => {
    if (!deleteAccount) return
    setLoading(true)
    const r = await api('bank:deleteAccount', deleteAccount.kd_rekening)
    setLoading(false)
    if (r.success) { toast(r.message as string); setDeleteAccount(null); load() }
    else toast(r.message as string, 'error')
  }

  const handleAddTransaction = async () => {
    if (!txForm.jumlah || !txForm.keterangan || !selectedAccount) {
      return toast('Jumlah dan keterangan wajib diisi', 'error')
    }
    setLoading(true)
    const r = await api('bank:addTransaction', selectedAccount.kd_rekening, txForm.jenis, parseFloat(txForm.jumlah), txForm.keterangan)
    setLoading(false)
    if (r.success) {
      toast(r.message as string)
      setModal(null)
      setTxForm({ jenis: 'DEBIT', jumlah: '', keterangan: '' })
      loadTransactions(selectedAccount.kd_rekening)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleReconcile = async () => {
    if (!saldoBank) return toast('Saldo bank wajib diisi', 'error')
    setLoading(true)
    const r = await api('bank:reconcile', reconcileBulan, reconcileTahun, parseFloat(saldoBank))
    setLoading(false)
    if (r.success) { toast(r.message as string); setSaldoBank(''); loadReconciliation() }
    else toast(r.message as string, 'error')
  }

  const openEdit = (acc: BankAccount) => {
    setEditAccount(acc)
    setForm({ nama_bank: acc.nama_bank, nomor_rekening: acc.nomor_rekening, atas_nama: acc.atas_nama, saldo_awal: acc.saldo_awal.toString(), mata_uang: acc.mata_uang })
    setModal('edit')
  }

  const openTransactions = (acc: BankAccount) => {
    setSelectedAccount(acc)
    setTab('transactions')
    loadTransactions(acc.kd_rekening)
  }

  const filteredAccounts = accounts.filter(a =>
    a.nama_bank.toLowerCase().includes(search.toLowerCase()) ||
    a.nomor_rekening.includes(search) ||
    a.atas_nama.toLowerCase().includes(search.toLowerCase())
  )

  const bulanOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString('id', { month: 'long' })
  }))

  return (
    <div className="space-y-4">
      {loadingData ? (
        <SkeletonStatGrid count={4} />
      ) : (
        <>
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
            {(['accounts', 'transactions', 'reconciliation'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {t === 'accounts' ? 'Rekening Bank' : t === 'transactions' ? 'Transaksi' : 'Rekonsiliasi'}
              </button>
            ))}
          </div>

          {tab === 'accounts' && (
            <>
              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <Input
                  placeholder="Cari bank/rekening..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="max-w-xs"
                />
                <Button icon={<Plus size={16} />} onClick={() => { setForm({ nama_bank: '', nomor_rekening: '', atas_nama: '', saldo_awal: '', mata_uang: 'IDR' }); setModal('add') }}>
                  Tambah Rekening
                </Button>
              </div>

              <Card title="Daftar Rekening Bank">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-[768px]">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                        <tr>
                          <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Nama Bank</th>
                          <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">No Rekening</th>
                          <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Atas Nama</th>
                          <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Saldo Awal</th>
                          <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Saldo Saat Ini</th>
                          <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                          <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {filteredAccounts.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-3 sm:px-4 py-10 text-center text-slate-400">Belum ada rekening bank</td>
                          </tr>
                        ) : (
                          filteredAccounts.map(acc => (
                            <tr key={acc.kd_rekening} className="hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
                              <td className="px-3 sm:px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Building2 size={16} className="text-slate-400" />
                                  <span className="font-medium text-slate-700 dark:text-slate-200">{acc.nama_bank}</span>
                                </div>
                              </td>
                              <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300 font-mono">{acc.nomor_rekening}</td>
                              <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{acc.atas_nama}</td>
                              <td className="px-3 sm:px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatRupiah(acc.saldo_awal)}</td>
                              <td className="px-3 sm:px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">{formatRupiah(acc.saldo_saat_ini)}</td>
                              <td className="px-3 sm:px-4 py-3 text-center">
                                <Badge label={acc.status} variant={acc.status === 'AKTIF' ? 'green' : 'red'} />
                              </td>
                              <td className="px-3 sm:px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => openTransactions(acc)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors" title="Transaksi">
                                    <ArrowUpDown size={14} />
                                  </button>
                                  <button onClick={() => openEdit(acc)} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 transition-colors" title="Edit">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  </button>
                                  <button onClick={() => setDeleteAccount(acc)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Hapus">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                  </button>
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

          {tab === 'transactions' && (
            <>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => setTab('accounts')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                  </Button>
                  {selectedAccount && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selectedAccount.nama_bank} - {selectedAccount.nomor_rekening}</p>
                      <p className="text-xs text-slate-400">Saldo: {formatRupiah(selectedAccount.saldo_saat_ini)}</p>
                    </div>
                  )}
                </div>
                <Button icon={<Plus size={16} />} onClick={() => setModal('addTx')}>Tambah Transaksi</Button>
              </div>

              <Card title="Transaksi Bank">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-[640px]">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                        <tr>
                          <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tanggal</th>
                          <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Jenis</th>
                          <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Jumlah</th>
                          <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Keterangan</th>
                          <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Rekonsiliasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {transactions.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 sm:px-4 py-10 text-center text-slate-400">Belum ada transaksi</td>
                          </tr>
                        ) : (
                          transactions.map(tx => (
                            <tr key={tx.kd_transaksi} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                              <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{formatDateTime(tx.tgl_transaksi)}</td>
                              <td className="px-3 sm:px-4 py-3 text-center">
                                <Badge label={tx.jenis} variant={tx.jenis === 'DEBIT' ? 'red' : 'green'} />
                              </td>
                              <td className="px-3 sm:px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">{formatRupiah(tx.jumlah)}</td>
                              <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{tx.keterangan}</td>
                              <td className="px-3 sm:px-4 py-3 text-center">
                                {tx.reconciled ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 text-xs"><CheckCircle2 size={12} /> Reconciled</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-slate-400 text-xs"><XCircle size={12} /> Belum</span>
                                )}
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

          {tab === 'reconciliation' && (
            <>
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <Select
                  label="Bulan"
                  options={bulanOptions}
                  value={reconcileBulan}
                  onChange={e => setReconcileBulan(Number(e.target.value))}
                />
                <Input
                  label="Tahun"
                  type="number"
                  value={reconcileTahun.toString()}
                  onChange={e => setReconcileTahun(parseInt(e.target.value) || new Date().getFullYear())}
                  className="w-24"
                />
                <Input
                  label="Saldo Bank"
                  type="number"
                  value={saldoBank}
                  onChange={e => setSaldoBank(e.target.value)}
                  placeholder="0"
                />
                <Button icon={<RefreshCw size={16} />} loading={loading} onClick={handleReconcile}>Rekonsiliasi</Button>
              </div>

              <Card title="Riwayat Rekonsiliasi">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-[640px]">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                        <tr>
                          <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Periode</th>
                          <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Saldo Buku</th>
                          <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Saldo Bank</th>
                          <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Selisih</th>
                          <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tgl Rekonsiliasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {reconcileData.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 sm:px-4 py-10 text-center text-slate-400">Belum ada data rekonsiliasi</td>
                          </tr>
                        ) : (
                          reconcileData.map(r => (
                            <tr key={r.kd_rekonsiliasi} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                              <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">
                                {new Date(r.tahun, r.bulan - 1).toLocaleString('id', { month: 'long', year: 'numeric' })}
                              </td>
                              <td className="px-3 sm:px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatRupiah(r.saldo_buku)}</td>
                              <td className="px-3 sm:px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatRupiah(r.saldo_bank)}</td>
                              <td className={`px-3 sm:px-4 py-3 text-right font-semibold ${r.selisih >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatRupiah(r.selisih)}
                              </td>
                              <td className="px-3 sm:px-4 py-3 text-slate-700 dark:text-slate-300">{formatDateTime(r.reconciled_at)}</td>
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

          {/* Add/Edit Account Modal */}
          <Modal
            open={modal === 'add' || modal === 'edit'}
            onClose={() => { setModal(null); setEditAccount(null) }}
            title={modal === 'add' ? 'Tambah Rekening Bank' : 'Edit Rekening Bank'}
            size="sm"
            footer={
              <>
                <Button variant="secondary" onClick={() => { setModal(null); setEditAccount(null) }} className="w-full sm:w-auto">Batal</Button>
                <Button loading={loading} onClick={handleSaveAccount} className="w-full sm:w-auto">Simpan</Button>
              </>
            }
          >
            <div className="space-y-3">
              <Input label="Nama Bank *" value={form.nama_bank} onChange={e => setForm(p => ({ ...p, nama_bank: e.target.value }))} placeholder="Contoh: Bank Mandiri" />
              <Input label="Nomor Rekening *" value={form.nomor_rekening} onChange={e => setForm(p => ({ ...p, nomor_rekening: e.target.value }))} placeholder="000-00-0000000-0" />
              <Input label="Atas Nama *" value={form.atas_nama} onChange={e => setForm(p => ({ ...p, atas_nama: e.target.value }))} placeholder="Atas nama rekening" />
              <Input label="Saldo Awal *" type="number" value={form.saldo_awal} onChange={e => setForm(p => ({ ...p, saldo_awal: e.target.value }))} placeholder="0" />
              <Select
                label="Mata Uang"
                options={[{ value: 'IDR', label: 'IDR - Rupiah' }, { value: 'USD', label: 'USD - Dollar' }]}
                value={form.mata_uang}
                onChange={e => setForm(p => ({ ...p, mata_uang: e.target.value }))}
              />
            </div>
          </Modal>

          {/* Add Transaction Modal */}
          <Modal
            open={modal === 'addTx'}
            onClose={() => setModal(null)}
            title="Tambah Transaksi Bank"
            size="sm"
            footer={
              <>
                <Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto">Batal</Button>
                <Button loading={loading} onClick={handleAddTransaction} className="w-full sm:w-auto">Simpan</Button>
              </>
            }
          >
            <div className="space-y-3">
              <Select
                label="Jenis *"
                options={[{ value: 'DEBIT', label: 'DEBIT (Keluar)' }, { value: 'KREDIT', label: 'KREDIT (Masuk)' }]}
                value={txForm.jenis}
                onChange={e => setTxForm(p => ({ ...p, jenis: e.target.value }))}
              />
              <Input label="Jumlah *" type="number" value={txForm.jumlah} onChange={e => setTxForm(p => ({ ...p, jumlah: e.target.value }))} placeholder="0" />
              <Input label="Keterangan *" value={txForm.keterangan} onChange={e => setTxForm(p => ({ ...p, keterangan: e.target.value }))} placeholder="Deskripsi transaksi" />
            </div>
          </Modal>

          <ConfirmDialog
            open={!!deleteAccount}
            onClose={() => setDeleteAccount(null)}
            onConfirm={handleDeleteAccount}
            title="Hapus Rekening Bank"
            message={`Rekening "${deleteAccount?.nama_bank}" (${deleteAccount?.nomor_rekening}) akan dihapus.`}
            confirmText="Hapus"
            variant="danger"
            loading={loading}
          />
        </>
      )}
    </div>
  )
}
