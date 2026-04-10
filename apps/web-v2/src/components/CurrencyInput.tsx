import { useState, useEffect, useRef } from 'react'
import { haptic } from '../lib/telegram'
import { useI18nStore } from '../store/i18nStore'
import { fmtKHR, fmtUSD } from '../lib/format'

export default function CurrencyInput({ value, onChange, placeholder, autoFocus, currency: currencyOverride }: {
  value: number; onChange: (v: number) => void; placeholder?: string; autoFocus?: boolean; currency?: 'USD' | 'KHR'
}) {
  const storeCurrency = useI18nStore(s => s.currency)
  const currency = currencyOverride ?? storeCurrency
  const rate = useI18nStore(s => s.usdRate)
  const prevCurrency = useRef(currency)

  const initDisplay = () => {
    if (value <= 0) return ''
    return currency === 'USD' ? (value / rate).toFixed(2) : value.toLocaleString()
  }
  const [display, setDisplay] = useState(initDisplay)

  // Re-sync display when currency preference changes
  useEffect(() => {
    if (prevCurrency.current === currency) return
    prevCurrency.current = currency
    if (value <= 0) { setDisplay(''); return }
    setDisplay(currency === 'USD' ? (value / rate).toFixed(2) : value.toLocaleString())
  }, [currency, rate, value])

  const handleChange = (raw: string) => {
    haptic('light')
    if (currency === 'USD') {
      // Allow decimal dollars e.g. "25.50"
      const cleaned = raw.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
      if (cleaned === '' || cleaned === '.') { setDisplay(cleaned); onChange(0); return }
      const usd = parseFloat(cleaned)
      if (isNaN(usd) || usd > 10_000_000) return
      setDisplay(cleaned)
      onChange(Math.round(usd * rate))
    } else {
      const digits = raw.replace(/[^0-9]/g, '')
      if (digits === '') { setDisplay(''); onChange(0); return }
      const num = parseInt(digits, 10)
      if (num > 999_999_999_999) return
      setDisplay(num.toLocaleString())
      onChange(num)
    }
  }

  // Show the equivalent amount in the other currency
  const equivalent = value > 0
    ? (currency === 'USD' ? `≈ ${fmtKHR(value)}` : `≈ ${fmtUSD(value, rate)}`)
    : null

  return (
    <div className="relative group">
      <input
        type="tel"
        inputMode={currency === 'USD' ? 'decimal' : 'numeric'}
        autoFocus={autoFocus}
        value={display}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={currency === 'USD' ? (placeholder || '0.00') : (placeholder || '0 ៛')}
        className="w-full py-5 px-6 pr-14 rounded-3xl text-right text-3xl font-black font-mono-num outline-none transition-all focus:ring-4 focus:ring-gold/10"
        style={{ background: 'var(--input-bg)', border: '2px solid var(--border)', color: 'var(--text)' }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--gold)'; haptic('medium') }}
        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
      />
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-end pointer-events-none">
        <span className="text-xl font-black opacity-80" style={{ color: 'var(--gold)' }}>
          {currency === 'USD' ? '$' : '៛'}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-30 mt-0.5">
          {currency}
        </span>
      </div>
      {equivalent && (
        <div className="text-center text-[11px] mt-1.5 font-mono-num" style={{ color: 'var(--text-dim)' }}>
          {equivalent}
        </div>
      )}
    </div>
  )
}

