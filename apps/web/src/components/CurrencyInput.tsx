import { useState } from 'react'
interface Props { value: number; onChange: (cents: number, currency: 'USD'|'KHR') => void }
const KHR_RATE = 4100
export default function CurrencyInput({ value, onChange }: Props) {
  const [currency, setCurrency] = useState<'USD'|'KHR'>('USD')
  const display = currency === 'USD' ? (value / 100).toFixed(2) : Math.round(value / 100 * KHR_RATE).toString()
  const handleChange = (v: string) => {
    const num = parseFloat(v) || 0
    const cents = currency === 'USD' ? Math.round(num * 100) : Math.round(num / KHR_RATE * 100)
    onChange(cents, currency)
  }
  return (
    <div className="flex gap-2 items-center">
      <input type="text" inputMode="decimal" value={display} onChange={e => handleChange(e.target.value)}
        className="flex-1 text-2xl font-bold border-b-2 border-gray-300 focus:border-blue-500 outline-none py-2" />
      <button onClick={() => setCurrency(c => c === 'USD' ? 'KHR' : 'USD')}
        className="px-3 py-2 bg-gray-100 rounded-lg font-mono text-sm font-bold">
        {currency}
      </button>
    </div>
  )
}
