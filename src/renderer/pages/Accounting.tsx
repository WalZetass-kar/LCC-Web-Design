import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Plus, RefreshCw, Save } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Badge from '../components/Badge'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import { formatRupiah } from '../utils/format'

interface Account {
  id: number
  code: string
  name: string
  type: string
  normal_balance: string
  is_active: number
}

interface AccountingSummary {
  sales: number
  cogs: number
  grossProfit: number
  expenses: number
  netProfit: number
  cashIn: number
  cashOut: number
  cashBalanceEstimate: number
  receivables: number
  payables: number
}

interface TrialBalanceRow extends Account {
  debit: number
  credit: number
  balance: number
}

interface JournalEntry {
  id: number
  entry_date: string
  reference: string
  description: string
  lines: Array<{ code: string; name: string; debit: number; credit: number }>
}

const today = new Date().toISOString().slice(0, 10)
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

export default function Accounting() {
  const toast = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(monthStart)
  const [endDate, setEndDate] = useState(today)
  const [summary, setSummary] = useState<AccountingSummary | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [trial, setTrial] = useState<TrialBalanceRow[]>([])
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [accountForm, setAccountForm] = useState({ code: '', name: '', type: 'ASSET' })
  const [journalForm, setJournalForm] = useState({
    description: '',
    reference: '',
    debitAccount: '',
    creditAccount: '',
    amount: '',
  })

  const load = async () => {
    setLoading(true)
    const [summaryRes, accountsRes, trialRes, journalRes] = await Promise.all([
      api<AccountingSummary>('accounting:getSummary', startDate, endDate),
      api<Account[]>('accounting:getAccounts'),
      api<TrialBalanceRow[]>('accounting:getTrialBalance', startDate, endDate),
      api<JournalEntry[]>('accounting:getJournalEntries', 20),
    ])
    if (summaryRes.success) setSummary(summaryRes.data ?? null)
    if (accountsRes.success) setAccounts(accountsRes.data ?? [])
    if (trialRes.success) setTrial(trialRes.data ?? [])
    if (journalRes.success) setJournals(journalRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const activeAccounts = useMemo(() => accounts.filter(a => a.is_active), [accounts])

  const saveAccount = async () => {
    const r = await api('accounting:saveAccount', accountForm)
    if (r.success) {
      toast('Akun disimpan')
      setAccountForm({ code: '', name: '', type: 'ASSET' })
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const createJournal = async () => {
    const amount = Number(journalForm.amount || 0)
    if (!journalForm.description || !journalForm.debitAccount || !journalForm.creditAccount || amount <= 0) {
      toast('Lengkapi jurnal dan nominal', 'error')
      return
    }
    const r = await api('accounting:createJournalEntry', {
      entry_date: today,
      reference: journalForm.reference,
      description: journalForm.description,
      created_by: user?.nama_pengguna,
      lines: [
        { account_id: Number(journalForm.debitAccount), debit: amount, credit: 0 },
        { account_id: Number(journalForm.creditAccount), debit: 0, credit: amount },
      ],
    })
    if (r.success) {
      toast('Jurnal dibuat')
      setJournalForm({ description: '', reference: '', debitAccount: '', creditAccount: '', amount: '' })
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="text-primary-500" size={28} />
            Akuntansi
          </h1>
          <p className="text-sm text-slate-500">COA, jurnal manual, laba rugi, dan neraca saldo dari data POS.</p>
        </div>
        <Button onClick={load} loading={loading} variant="secondary" icon={<RefreshCw size={16} />}>Refresh</Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="Mulai" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <Input label="Sampai" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          <div className="flex items-end">
            <Button onClick={load} className="w-full">Terapkan Periode</Button>
          </div>
        </div>
      </Card>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Metric label="Penjualan" value={summary.sales} />
          <Metric label="Laba Kotor" value={summary.grossProfit} />
          <Metric label="Laba Bersih" value={summary.netProfit} tone={summary.netProfit >= 0 ? 'green' : 'red'} />
          <Metric label="Estimasi Kas" value={summary.cashBalanceEstimate} />
          <Metric label="HPP" value={summary.cogs} tone="amber" />
          <Metric label="Beban" value={summary.expenses} tone="amber" />
          <Metric label="Piutang" value={summary.receivables} tone="blue" />
          <Metric label="Hutang" value={summary.payables} tone="red" />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Tambah Akun">
          <div className="space-y-3">
            <Input label="Kode" value={accountForm.code} onChange={e => setAccountForm({ ...accountForm, code: e.target.value })} placeholder="1300" />
            <Input label="Nama" value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="Perlengkapan" />
            <select value={accountForm.type} onChange={e => setAccountForm({ ...accountForm, type: e.target.value })} className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm">
              <option value="ASSET">Asset</option>
              <option value="LIABILITY">Liability</option>
              <option value="EQUITY">Equity</option>
              <option value="REVENUE">Revenue</option>
              <option value="EXPENSE">Expense</option>
            </select>
            <Button onClick={saveAccount} icon={<Plus size={16} />} className="w-full">Simpan Akun</Button>
          </div>
        </Card>

        <Card title="Jurnal Manual" className="xl:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Deskripsi" value={journalForm.description} onChange={e => setJournalForm({ ...journalForm, description: e.target.value })} />
            <Input label="Referensi" value={journalForm.reference} onChange={e => setJournalForm({ ...journalForm, reference: e.target.value })} placeholder="INV/ADJ/001" />
            <SelectAccount label="Debit" value={journalForm.debitAccount} accounts={activeAccounts} onChange={value => setJournalForm({ ...journalForm, debitAccount: value })} />
            <SelectAccount label="Kredit" value={journalForm.creditAccount} accounts={activeAccounts} onChange={value => setJournalForm({ ...journalForm, creditAccount: value })} />
            <Input label="Nominal" type="number" value={journalForm.amount} onChange={e => setJournalForm({ ...journalForm, amount: e.target.value })} />
            <div className="flex items-end">
              <Button onClick={createJournal} icon={<Save size={16} />} className="w-full">Buat Jurnal</Button>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Neraca Saldo">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 text-left">
              <tr><th className="px-3 py-2">Kode</th><th>Akun</th><th>Tipe</th><th className="text-right">Debit</th><th className="text-right">Kredit</th><th className="text-right pr-3">Saldo</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {trial.map(row => (
                <tr key={row.id}>
                  <td className="px-3 py-2 font-mono">{row.code}</td>
                  <td>{row.name}</td>
                  <td><Badge label={row.type} variant="blue" /></td>
                  <td className="text-right">{formatRupiah(row.debit)}</td>
                  <td className="text-right">{formatRupiah(row.credit)}</td>
                  <td className="text-right pr-3 font-semibold">{formatRupiah(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Jurnal Terakhir">
        <div className="space-y-3">
          {journals.length === 0 && <p className="text-sm text-slate-400">Belum ada jurnal manual.</p>}
          {journals.map(entry => (
            <div key={entry.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{entry.description}</p>
                  <p className="text-xs text-slate-400">{entry.entry_date} {entry.reference && `• ${entry.reference}`}</p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {entry.lines.map((line, idx) => (
                  <div key={`${entry.id}-${idx}`} className="flex justify-between rounded bg-slate-50 dark:bg-slate-800 px-2 py-1">
                    <span>{line.code} - {line.name}</span>
                    <span>{line.debit > 0 ? `D ${formatRupiah(line.debit)}` : `K ${formatRupiah(line.credit)}`}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function Metric({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'slate' | 'green' | 'red' | 'amber' | 'blue' }) {
  const color = {
    slate: 'text-slate-900 dark:text-white',
    green: 'text-emerald-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600',
  }[tone]
  return (
    <Card>
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{formatRupiah(value)}</p>
    </Card>
  )
}

function SelectAccount({ label, value, accounts, onChange }: { label: string; value: string; accounts: Account[]; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm">
        <option value="">Pilih akun</option>
        {accounts.map(account => (
          <option key={account.id} value={account.id}>{account.code} - {account.name}</option>
        ))}
      </select>
    </label>
  )
}
