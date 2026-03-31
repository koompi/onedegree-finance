import { useState } from 'react'

export default function CurrencyInput({ value, onChange, placeholder, autoFocus }: {
  value: number; onChange: (v: number) => void; placeholder?: string; autoFocus?: boolean
}) {
  const [display, setDisplay] = useState(value > 0 ? value.toLocaleString() : '')
  const handleChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '')
    if (digits === '') { setDisplay(''); onChange(0); return }
    const num = parseInt(digits, 10)
    if (num > 999_999_999_999) return
    setDisplay(num.toLocaleString())
    onChange(num)
  }
  return (
    <div className="relative">
      <input
        type="tel" inputMode="numeric" autoFocus={autoFocus}
        value={display} onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder || '0 ៛'}
        className="w-full py-3.5 px-4 pr-10 rounded-xl text-right text-lg font-extrabold font-mono-num outline-none transition-colors"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
        onFocus={(e) => e.target.style.borderColor = 'var(--gold)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'var(--text-dim)' }}>៛</span>
    </div>
  )
}
