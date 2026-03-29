import { useState } from 'react'

interface Props {
  value?: number
  onChange: (cents: number, currency: 'USD' | 'KHR') => void
}

const KHR_RATE = 4100

export default function CurrencyInput({ onChange }: Props) {
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD')
  const [raw, setRaw] = useState('')
  const [open, setOpen] = useState(false)

  const press = (key: string) => {
    let next = raw
    if (key === 'DEL') {
      next = raw.slice(0, -1)
    } else if (key === '.') {
      if (currency === 'KHR') return
      if (raw.includes('.')) return
      next = (raw || '0') + '.'
    } else {
      if (raw.includes('.') && currency === 'USD') {
        const parts = raw.split('.')
        if (parts[1].length >= 2) return
      }
      next = raw === '0' ? key : raw + key
    }
    setRaw(next)
    const num = parseFloat(next) || 0
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
  }

  const display = raw || (currency === 'USD' ? '0.00' : '0')
  const isEmpty = !raw

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [currency === 'USD' ? '.' : '', '0', 'DEL'],
  ]

  return (
    <div className="space-y-3">
      {/* Tappable amount display */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3"
      >
        <span className={`flex-1 text-4xl font-bold text-right pr-2 tracking-wide ${isEmpty ? 'text-gray-300' : 'text-gray-900'}`}>
          {display}
        </span>
        <span
          onClick={e => { e.stopPropagation(); toggleCurrency() }}
          className={`px-4 py-2 rounded-xl font-mono text-sm font-bold transition-colors cursor-pointer ${
            currency === 'USD' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'
          }`}
        >
          {currency}
        </span>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {/* Keypad — shown only when open */}
      {open && (
        <div className="grid grid-cols-3 gap-2">
          {keys.flat().map((key, i) => {
            if (key === '') return <div key={i} />
            return (
              <button
                key={i}
                type="button"
                onClick={() => press(key)}
                className={`py-4 rounded-2xl text-xl font-semibold select-none transition-colors ${
                  key === 'DEL'
                    ? 'bg-gray-100 text-gray-500 text-base active:bg-gray-200'
                    : 'bg-gray-50 text-gray-800 active:bg-gray-100'
                }`}
              >
                {key === 'DEL' ? '⌫' : key}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
