import { useState, useEffect } from 'react'

interface Props { value: number; onChange: (cents: number, currency: 'USD' | 'KHR') => void }

const KHR_RATE = 4100

export default function CurrencyInput({ value, onChange }: Props) {
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD')
  const [raw, setRaw] = useState('')

  // Sync display when value resets to 0 (e.g. form reset)
  useEffect(() => {
    if (value === 0) setRaw('')
  }, [value])

  const handleChange = (v: string) => {
    // Allow digits and one decimal point only
    const cleaned = v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
    setRaw(cleaned)
    const num = parseFloat(cleaned) || 0
    const cents = currency === 'USD' ? Math.round(num * 100) : Math.round((num / KHR_RATE) * 100)
    onChange(cents, currency)
  }

  const toggleCurrency = () => {
    const next = currency === 'USD' ? 'KHR' : 'USD'
    setCurrency(next)
    // Convert display value to new currency
    const num = parseFloat(raw) || 0
    const cents = currency === 'USD' ? Math.round(num * 100) : Math.round((num / KHR_RATE) * 100)
    if (next === 'KHR') {
      const inKhr = Math.round((cents / 100) * KHR_RATE)
      setRaw(inKhr ? inKhr.toString() : '')
    } else {
      const inUsd = (cents / 100).toFixed(2)
      setRaw(cents ? inUsd : '')
    }
    onChange(cents, next)
  }

  return (
    <div className="flex gap-3 items-center">
      <input
        type="text"
        inputMode="decimal"
        value={raw}
        onChange={e => handleChange(e.target.value)}
        className="flex-1 text-3xl font-bold text-gray-900 focus:outline-none placeholder-gray-300 py-1"
        placeholder={currency === 'USD' ? '0.00' : '0'}
        autoComplete="off"
        autoCorrect="off"
      />
      <button
        type="button"
        onClick={toggleCurrency}
        className={`px-4 py-2 rounded-xl font-mono text-sm font-bold transition-all duration-200 active:scale-[0.98] ${
          currency === 'USD' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
        }`}
      >
        {currency}
      </button>
    </div>
  )
}
