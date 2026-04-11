// Exchange rate service for USD/KHR conversion
// Source: National Bank of Cambodia (NBC) official rate

const NBC_EXCHANGE_RATE_API = 'https://www.nbc.gov.kh/api/exRate.php'
const DEFAULT_EXCHANGE_RATE = parseFloat(process.env.DEFAULT_EXCHANGE_RATE || '4000')
const CACHE_DURATION = 6 * 60 * 60 * 1000 // 6 hours in ms

class ExchangeRateService {
  private rate: number = DEFAULT_EXCHANGE_RATE
  private lastFetch: number = 0
  private fetching: boolean = false

  async init(): Promise<void> {
    await this.fetchRate()
    setInterval(() => this.fetchRate(), CACHE_DURATION)
  }

  private async fetchRate(): Promise<void> {
    if (this.fetching) return
    this.fetching = true
    try {
      const response = await fetch(NBC_EXCHANGE_RATE_API)
      if (!response.ok) throw new Error(`NBC API returned ${response.status}`)
      const xml = await response.text()

      // Extract the USD/KHR average from XML using regex (avoids XML parser dependency)
      // Structure: <key>USD/KHR</key>...<average>4000.00</average>
      const usdBlock = xml.match(/<ex>[\s\S]*?<key>USD\/KHR<\/key>[\s\S]*?<\/ex>/)
      if (!usdBlock) throw new Error('USD/KHR block not found in NBC response')
      const avgMatch = usdBlock[0].match(/<average>([\d.]+)<\/average>/)
      if (!avgMatch) throw new Error('average not found in USD/KHR block')

      const parsed = parseFloat(avgMatch[1])
      if (isNaN(parsed) || parsed < 100) throw new Error(`Implausible rate: ${parsed}`)

      this.rate = parsed
      this.lastFetch = Date.now()
      console.log(`[NBC] Exchange rate updated: 1 USD = ${this.rate} KHR`)
    } catch (error) {
      console.error('[NBC] Failed to fetch exchange rate, keeping current:', error)
    } finally {
      this.fetching = false
    }
  }

  getRate(): number {
    return this.rate
  }

  usdToKhr(usdCents: number): number {
    return Math.round((usdCents / 100) * this.rate * 100)
  }

  khrToUsd(khrCents: number): number {
    return Math.round((khrCents / 100) / this.rate * 100)
  }

  calculateDualCurrency(amount: number, currencyInput: 'USD' | 'KHR'): {
    amount_cents: number
    amount_khr: number | null
    exchange_rate: number
  } {
    if (currencyInput === 'USD') {
      // amount = USD cents (e.g. 500 for $5)
      const khr = Math.round((amount / 100) * this.rate)
      return { amount_cents: amount, amount_khr: khr, exchange_rate: this.rate }
    } else {
      // amount = raw KHR (e.g. 20000)
      const usdCents = Math.round((amount / this.rate) * 100)
      return { amount_cents: usdCents, amount_khr: amount, exchange_rate: this.rate }
    }
  }

  formatUSD(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`
  }

  formatKHR(cents: number): string {
    return `៛${Math.round(cents / 100).toLocaleString()}`
  }
}

// Singleton instance
export const exchangeRateService = new ExchangeRateService()

// Auto-initialize on import
let initialized = false
export function initExchangeRate(): Promise<void> {
  if (!initialized) {
    initialized = true
    return exchangeRateService.init()
  }
  return Promise.resolve()
}
