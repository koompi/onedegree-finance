const KHR_MONTHS = ['មករា','កុម្ភៈ','មីនា','មេសា','ឧសភា','មិថុនា','កក្កដា','សីហា','កញ្ញា','តុលា','វិច្ឆិកា','ធ្នូ']

const KHR_SHORT = ['ម.ក.','កុ.','មី.','មេ.','ឧ.','មិ.','ក.ក.','សី.','កញ.','តុ.','វ.','ធ.']

/** Format KHR amount: 1250000 → "1,250,000 ៛" */
export function fmtKHR(amount: number): string {
  return amount.toLocaleString('km-KH') + ' ៛'
}

/** Short KHR: 1250000 → "1.3M ៛", 250000 → "250K ៛" */
export function fmtKHRShort(amount: number): string {
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + 'B ៛'
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'M ៛'
  if (amount >= 1_000) return (amount / 1_000).toFixed(1) + 'K ៛'
  return amount.toLocaleString('km-KH') + ' ៛'
}

/** KHR to USD display */
export function fmtUSD(khrAmount: number, rate: number = 4100): string {
  return '$' + (khrAmount / rate).toFixed(2)
}

/** Unified amount formatter — amounts are always stored as KHR */
export function fmtAmount(amount: number, currency: 'KHR' | 'USD' = 'KHR', rate: number = 4100): string {
  return currency === 'USD' ? fmtUSD(amount, rate) : fmtKHR(amount)
}

/** Short unified amount */
export function fmtAmountShort(amount: number, currency: 'KHR' | 'USD' = 'KHR', rate: number = 4100): string {
  if (currency === 'USD') {
    const u = amount / rate
    if (u >= 1_000_000) return '$' + (u / 1_000_000).toFixed(1) + 'M'
    if (u >= 1_000) return '$' + (u / 1_000).toFixed(1) + 'K'
    return '$' + u.toFixed(2)
  }
  return fmtKHRShort(amount)
}

/** Convert KHR amount to USD number */
export function khrToUsd(khrAmount: number, rate: number = 4100): number {
  return khrAmount / rate
}

/** Convert USD input to KHR integer for storage */
export function usdToKhr(usdAmount: number, rate: number = 4100): number {
  return Math.round(usdAmount * rate)
}

/** Date to Khmer: "30 មីនា 2026" */
export function fmtDateKhmer(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getDate()} ${KHR_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** Month+Year: "មីនា 2026" */
export function fmtMonthYear(year: number, month: number): string {
  return `${KHR_MONTHS[month - 1]} ${year}`
}

/** Abbreviated month: "មី." */
export function fmtMonthShort(month: number): string {
  return KHR_SHORT[month - 1] || ''
}

/** Days until due (negative = overdue) */
export function daysUntilDue(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

/** Profit margin: 1 decimal */
export function calcProfitMargin(income: number, expense: number): number {
  if (income === 0) return 0
  return Math.round(((income - expense) / income) * 1000) / 10
}

/** Overdue status */
export function getOverdueStatus(days: number): 'overdue' | 'due_today' | 'due_soon' | 'upcoming' {
  if (days < 0) return 'overdue'
  if (days === 0) return 'due_today'
  if (days <= 3) return 'due_soon'
  return 'upcoming'
}

/** Overdue badge text in Khmer */
export function overdueBadgeText(days: number): string {
  const abs = Math.abs(days)
  if (days < 0) return `ហួស ${abs} ថ្ងៃ`
  if (days === 0) return 'ថ្ងៃនេះ!'
  if (days <= 3) return `${abs} ថ្ងៃទៀត`
  return `${abs} ថ្ងៃទៀត`
}

/** WAC calculation */
export function calculateWAC(existingQty: number, currentWAC: number, incomingQty: number, incomingCost: number): number {
  const total = existingQty + incomingQty
  if (total === 0) return 0
  return Math.round((existingQty * currentWAC + incomingQty * incomingCost) / total)
}
