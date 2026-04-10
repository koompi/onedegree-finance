// Exchange rate service for USD/KHR conversion

const EXCHANGE_RATE_API = 'https://open.er-api.com/v6/latest/USD'
const DEFAULT_EXCHANGE_RATE = parseFloat(process.env.DEFAULT_EXCHANGE_RATE || '4100')
const CACHE_DURATION = 6 * 60 * 60 * 1000 // 6 hours in ms

interface ExchangeRateResponse {
  rates: {
    KHR: number
  }
  time_last_update_unix: number
}

class ExchangeRateService {
  private rate: number = DEFAULT_EXCHANGE_RATE
  private lastFetch: number = 0
  private fetching: boolean = false

  /**
   * Initialize the service - fetch rate on startup
   */
  async init(): Promise<void> {
    await this.fetchRate()
    // Refresh every 6 hours
    setInterval(() => this.fetchRate(), CACHE_DURATION)
  }

  /**
   * Fetch latest exchange rate from API
   */
  private async fetchRate(): Promise<void> {
    if (this.fetching) return
    this.fetching = true

    try {
      const response = await fetch(EXCHANGE_RATE_API)
      if (!response.ok) throw new Error('API request failed')

      const data: ExchangeRateResponse = await response.json()

      if (data.rates?.KHR) {
        this.rate = data.rates.KHR
        this.lastFetch = Date.now()
        console.log(`Exchange rate updated: 1 USD = ${this.rate} KHR`)
      }
    } catch (error) {
      console.error('Failed to fetch exchange rate, using default:', error)
      this.rate = DEFAULT_EXCHANGE_RATE
    } finally {
      this.fetching = false
    }
  }

  /**
   * Get current exchange rate
   */
  getRate(): number {
    return this.rate
  }

  /**
   * Convert USD to KHR
   */
  usdToKhr(usdCents: number): number {
    return Math.round((usdCents / 100) * this.rate * 100) // Convert to KHR cents
  }

  /**
   * Convert KHR to USD
   */
  khrToUsd(khrCents: number): number {
    return Math.round((khrCents / 100) / this.rate * 100) // Convert to USD cents
  }

  /**
   * Calculate both amounts based on input currency
   */
  calculateDualCurrency(amount: number, currencyInput: 'USD' | 'KHR'): {
    amount_cents: number
    amount_khr: number | null
    exchange_rate: number
  } {
    if (currencyInput === 'USD') {
      return {
        amount_cents: amount,
        amount_khr: this.usdToKhr(amount),
        exchange_rate: this.rate
      }
    } else {
      return {
        amount_cents: this.khrToUsd(amount),
        amount_khr: amount,
        exchange_rate: this.rate
      }
    }
  }

  /**
   * Format amount for display
   */
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
