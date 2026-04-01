import { useI18nStore } from '../store/i18nStore'
import { fmtAmount, fmtAmountShort } from '../lib/format'

/**
 * Returns currency-aware formatters based on the user's currency preference.
 * Amounts are always stored as KHR. USD display divides by usdRate.
 */
export function useAmount() {
  const currency = useI18nStore(s => s.currency)
  const rate = useI18nStore(s => s.usdRate)
  return {
    fmt: (n: number) => fmtAmount(n, currency, rate),
    fmtShort: (n: number) => fmtAmountShort(n, currency, rate),
    currency,
    rate,
  }
}
