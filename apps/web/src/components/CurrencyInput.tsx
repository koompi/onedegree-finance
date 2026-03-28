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
    <div className="flex gap-3 items-center">
      <input type="text" inputMode="decimal" value={display} onChange={e => handleChange(e.target.value)}
        className="flex-1 text-3xl font-bold text-gray-900 focus:outline-none placeholder-gray-300 py-1"
        placeholder="0.00" autoComplete="off" />
      <button type="button" onClick={() => setCurrency(c => c === 'USD' ? 'KHR' : 'USD')}
        className={`px-4 py-2 rounded-xl font-mono text-sm font-bold transition-all duration-200 active:scale-[0.98] ${
          currency === 'USD' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
        }`}>
        {currency}
      </button>
    </div>
  )
}
