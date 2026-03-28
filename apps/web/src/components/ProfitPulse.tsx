interface Props { netProfitCents: number; currency?: 'USD' | 'KHR'; khrRate?: number }
export default function ProfitPulse({ netProfitCents, currency = 'USD', khrRate = 4100 }: Props) {
  const positive = netProfitCents >= 0
  const amount = currency === 'USD'
    ? `$${(Math.abs(netProfitCents) / 100).toFixed(2)}`
    : `${(Math.abs(netProfitCents) / 100 * khrRate).toLocaleString()} ៛`
  return (
    <div className={`rounded-2xl p-6 text-center shadow-sm ${positive ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
      <p className="text-sm text-gray-500 font-medium mb-1">ប្រាក់ចំណេញខែនេះ</p>
      <p className={`text-4xl font-bold ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
        {positive ? '+' : '-'}{amount}
      </p>
      <div className="flex items-center justify-center gap-1.5 mt-2">
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
          positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
        }`}>
          {positive ? '↑ ចំណេញ' : '↓ ខាត'}
        </span>
      </div>
    </div>
  )
}
