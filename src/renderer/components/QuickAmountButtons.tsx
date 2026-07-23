import { formatRupiah } from '../utils/format'

interface Props {
  total: number
  onAmount: (amount: number) => void
}

function getQuickAmounts(total: number): number[] {
  const amounts = new Set<number>()

  amounts.add(total)

  const roundUps = [1000, 5000, 10000, 20000, 50000, 100000, 200000, 500000]
  for (const r of roundUps) {
    const rounded = Math.ceil(total / r) * r
    if (rounded >= total && rounded <= total * 3) {
      amounts.add(rounded)
    }
  }

  const presets = [50000, 100000, 200000, 500000]
  for (const p of presets) {
    if (p >= total) amounts.add(p)
  }

  return Array.from(amounts).sort((a, b) => a - b).slice(0, 6)
}

export default function QuickAmountButtons({ total, onAmount }: Props) {
  if (total <= 0) return null
  const amounts = getQuickAmounts(total)
  if (amounts.length === 0) return null

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {amounts.map(amount => (
        <button
          key={amount}
          onClick={() => onAmount(amount)}
          className={`px-2 py-2 rounded-lg text-xs font-semibold border transition-all active:scale-[0.97] ${
            amount === total
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300'
          }`}
          aria-label={`Bayar ${formatRupiah(amount)}`}
        >
          {amount === total ? 'Uang Pas' : formatRupiah(amount)}
        </button>
      ))}
    </div>
  )
}
