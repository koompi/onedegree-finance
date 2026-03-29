import { useState, useRef } from 'react'

interface Props {
  value?: number
  onChange: (cents: number, currency: 'USD' | 'KHR') => void
}

const KHR_RATE = 4100

export default function CurrencyInput({ onChange }: Props) {
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD')
  const [raw, setRaw] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (v: string) => {
    // Strip anything that's not digit or dot
    let cleaned = v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
    // Max 2 decimal places for USD
    if (currency === 'USD' && cleaned.includes('.')) {
      const [int, dec] = cleaned.split('.')
      cleaned = int + '.' + dec.slice(0, 2)
    }
    // No decimals for KHR
    if (currency === 'KHR') {
      cleaned = cleaned.replace('.', '')
    }
    setRaw(cleaned)
    const num = parseFloat(cleaned) || 0
    const cents = currency === 'USD' ? Math.round(num * 100) : Math.round((num / KHR_RATE) * 100)
    onChange(cents, currency)
  }

  const toggleCurrency = () => {
    const next = currency === 'USD' ? 'KHR' : 'USD'
    const num = parseFloat(raw) || 0
    const cents = currency === 'USD' ? Math.round(num * 100) : Math.round((num / KHR_RATE) * 100)
    let newRaw = ''
    if (next === 'KHR') {
      const inKhr = Math.round((cents / 100) * KHR_RATE)
      newRaw = inKhr ? inKhr.toString() : ''
    } else {
      newRaw = cents ? (cents / 100).toFixed(2) : ''
    }
    setCurrency(next)
    setRaw(newRaw)
    onChange(cents, next)
    // Keep focus on input
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="text"
        inputMode={currency === 'KHR' ? 'numeric' : 'decimal'}
        pattern="[0-9]*"
        value={raw}
        onChange={e => handleChange(e.target.value)}
        placeholder={currency === 'USD' ? '0.00' : '0'}
        autoComplete="off"
        autoCorrect="off"
        className="flex-1 text-4xl font-bold text-gray-900 bg-transparent outline-none text-right placeholder-gray-300"
        style={{ caretColor: '#6366f1' }}
      />
      <button
        type="button"
        onClick={toggleCurrency}
        className={`px-4 py-2 rounded-xl font-mono text-sm font-bold transition-colors shrink-0 ${
          currency === 'USD' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'
        }`}
      >
        {currency}
      </button>
    </div>
  )
}
