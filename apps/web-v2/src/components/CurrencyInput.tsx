import { useState } from 'react'
import { haptic } from '../lib/telegram'

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
    <div className="relative group">
      <input
        type="tel" inputMode="numeric" autoFocus={autoFocus}
        value={display} onChange={(e) => { haptic('light'); handleChange(e.target.value) }}
        placeholder={placeholder || '0 ៛'}
        className="w-full py-5 px-6 pr-14 rounded-3xl text-right text-3xl font-black font-mono-num outline-none transition-all focus:ring-4 focus:ring-gold/10"
        style={{ background: 'var(--input-bg)', border: '2px solid var(--border)', color: 'var(--text)' }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--gold)'; haptic('medium') }}
        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
      />
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-end pointer-events-none">
        <span className="text-xl font-black text-gold opacity-80">៛</span>
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-30 mt-0.5">KHR</span>
      </div>
    </div>
  )
}
