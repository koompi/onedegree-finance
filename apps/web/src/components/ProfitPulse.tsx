interface Props { netProfitCents: number; currency?: 'USD' | 'KHR'; khrRate?: number }
export default function ProfitPulse({ netProfitCents, currency = 'USD', khrRate = 4100 }: Props) {
  const positive = netProfitCents >= 0
  const amount = currency === 'USD'
    ? `$${(Math.abs(netProfitCents) / 100).toFixed(2)}`
    : `${(Math.abs(netProfitCents) / 100 * khrRate).toLocaleString()} ៛`
  return (
    <div className={`rounded-2xl p-6 text-center ${positive ? 'bg-green-50' : 'bg-red-50'}`}>
      <p className="text-sm text-gray-500 mb-1">ប្រាក់ចំណេញខែនេះ</p>
      <p className={`text-4xl font-bold ${positive ? 'text-green-600' : 'text-red-600'}`}>
        {positive ? '+' : '-'}{amount}
      </p>
      <p className={`text-xs mt-1 ${positive ? 'text-green-500' : 'text-red-500'}`}>
        {positive ? '✓ អ្នកកំពុងចំណេញ' : '⚠ ខាត — ត្រូវពិនិត្យ'}
      </p>
    </div>
  )
}
