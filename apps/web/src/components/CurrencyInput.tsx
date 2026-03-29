import { useState, useRef, useEffect } from 'react'

interface Props {
  value?: number
  onChange: (cents: number, currency: 'USD' | 'KHR') => void
  initialCents?: number
}

const KHR_RATE = 4100

export default function CurrencyInput({ onChange, initialCents }: Props) {
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD')
  const [raw, setRaw] = useState(() => initialCents ? (initialCents / 100).toFixed(2) : '')
  const [inited, setInited] = useState(!initialCents)

  useEffect(() => {
    if (initialCents && !inited) {
      setRaw((initialCents / 100).toFixed(2))
      setInited(true)
      onChange(initialCents, 'USD')
    }
  }, [initialCents, inited, onChange])
  const inputRef = useRef<HTMLInputElement>(null)

  const toCents = (str: string, cur: 'USD' | 'KHR') => {
    const num = parseFloat(str) || 0
    return cur === 'USD' ? Math.round(num * 100) : Math.round((num / KHR_RATE) * 100)
  }

  const handleChange = (v: string) => {
    let cleaned = v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
    if (currency === 'USD' && cleaned.includes('.')) {
      const [int, dec] = cleaned.split('.')
      cleaned = int + '.' + dec.slice(0, 2)
    }
    if (currency === 'KHR') cleaned = cleaned.replace(/\./g, '')
    setRaw(cleaned)
    onChange(toCents(cleaned, currency), currency)
  }

  const toggleCurrency = () => {
    const next = currency === 'USD' ? 'KHR' : 'USD'
    const cents = toCents(raw, currency)
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
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="w-full">
      {/* Currency toggle row */}
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={toggleCurrency}
          className={`px-4 py-1.5 rounded-xl font-mono text-sm font-bold transition-colors ${
            currency === 'USD' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'
          }`}
        >
          {currency}
        </button>
      </div>

      {/* Full-width amount input — no flex sibling to cause shift */}
      <input
        ref={inputRef}
        type="text"
        inputMode={currency === 'KHR' ? 'numeric' : 'decimal'}
        value={raw}
        onChange={e => handleChange(e.target.value)}
        placeholder={currency === 'USD' ? '0.00' : '0'}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="w-full text-5xl font-bold text-gray-900 bg-transparent outline-none text-center placeholder-gray-300"
        style={{ caretColor: '#6366f1' }}
      />
    </div>
  )
}
