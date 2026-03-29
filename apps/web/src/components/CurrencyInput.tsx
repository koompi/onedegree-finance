import { useRef, useState, useCallback } from 'react'

interface Props {
  onChange: (cents: number, currency: 'USD' | 'KHR') => void
}

const KHR_RATE = 4100

export default function CurrencyInput({ onChange }: Props) {
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD')
  const inputRef = useRef<HTMLInputElement>(null)

  const toCents = (text: string, cur: 'USD' | 'KHR') => {
    const num = parseFloat(text) || 0
    return cur === 'USD' ? Math.round(num * 100) : Math.round((num / KHR_RATE) * 100)
  }

  const handleInput = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    let v = el.value

    if (currency === 'KHR') {
      v = v.replace(/[^0-9]/g, '')
    } else {
      v = v.replace(/[^0-9.]/g, '')
      // Keep only first decimal point
      const dot = v.indexOf('.')
      if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '')
    }

    if (v !== el.value) {
      const pos = el.selectionStart
      el.value = v
      if (pos !== null) el.setSelectionRange(Math.min(pos, v.length), Math.min(pos, v.length))
    }
    onChange(toCents(v, currency), currency)
  }, [currency, onChange])

  const toggleCurrency = useCallback(() => {
    const el = inputRef.current
    const raw = el?.value || ''
    const oldCents = toCents(raw, currency)
    const next = currency === 'USD' ? 'KHR' : 'USD'

    let display = ''
    if (oldCents > 0) {
      if (next === 'KHR') {
        display = Math.round((oldCents / 100) * KHR_RATE).toString()
      } else {
        display = (oldCents / 100).toFixed(2)
      }
    }

    if (el) el.value = display
    setCurrency(next)
    onChange(oldCents, next)
  }, [currency, onChange])

  return (
    <div className="flex gap-3 items-center">
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        onInput={handleInput}
        className="flex-1 text-3xl font-bold text-gray-900 focus:outline-none placeholder-gray-300 py-1 bg-transparent"
        placeholder={currency === 'USD' ? '0.00' : '0'}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
      />
      <button
        type="button"
        onClick={toggleCurrency}
        className={`px-4 py-2 rounded-xl font-mono text-sm font-bold transition-all duration-200 active:scale-95 ${
          currency === 'USD' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'
        }`}
      >
        {currency}
      </button>
    </div>
  )
}
