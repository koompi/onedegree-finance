/**
 * Daily Summary Cron
 * Runs every day at 20:00 Phnom Penh time (UTC+7 = 13:00 UTC)
 * Sends each active company owner a Telegram summary of their day + month-to-date stats
 */

const API_URL = process.env.ONEDEGREE_API_URL ?? 'https://onedegree-api.tunnel.koompi.cloud'
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ''
const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? 'od_internal_secret_2025'
const SUMMARY_HOUR_UTC = 13 // 20:00 Phnom Penh (UTC+7)

interface CompanySummary {
  id: string
  name: string
  telegram_id: number
  today_count: number
  today_income: string
  today_expense: string
  month_income: string
  month_expense: string
  due_soon: number
}

function fmtKHR(n: number): string {
  if (n >= 1_000_000) return `៛${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `៛${(n / 1_000).toFixed(0)}K`
  return `៛${n.toLocaleString()}`
}

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  if (!BOT_TOKEN) { console.warn('No BOT_TOKEN, skipping send to', chatId); return }
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

async function runDailySummary(): Promise<void> {
  console.log('[cron] Running daily summary...')

  // 1. First, process any overdue recurring transactions
  try {
    const res = await fetch(`${API_URL}/internal/recurring/process`, {
      method: 'POST',
      headers: { 'x-internal-secret': INTERNAL_SECRET },
    })
    if (res.ok) {
      const { processed } = await res.json() as { processed: number }
      if (processed > 0) console.log(`[cron] Processed ${processed} recurring transactions`)
    }
  } catch (err) {
    console.error('[cron] Recurring processing error:', err)
  }

  // 2. Send daily summaries
  try {
    const res = await fetch(`${API_URL}/internal/daily-summary`, {
      headers: { 'x-internal-secret': INTERNAL_SECRET },
    })
    if (!res.ok) { console.error('[cron] Failed to fetch daily summary:', await res.text()); return }

    const { date, companies } = await res.json() as { date: string; companies: CompanySummary[] }
    console.log(`[cron] Sending summary for ${companies.length} companies on ${date}`)

    for (const co of companies) {
      const income = parseInt(co.today_income as any)
      const expense = parseInt(co.today_expense as any)
      const net = income - expense
      const mIncome = parseInt(co.month_income as any)
      const mExpense = parseInt(co.month_expense as any)
      const mNet = mIncome - mExpense

      const netSign = net >= 0 ? '📈' : '📉'
      const dueLine = co.due_soon > 0
        ? `\n⚠️ <b>${co.due_soon} receivables</b> due within 3 days`
        : ''

      const msg = [
        `📊 <b>OneDegree — Daily Summary</b>`,
        `🏢 ${co.name}  |  ${date}`,
        ``,
        `<b>Today (${co.today_count} transactions)</b>`,
        `  💚 ចំណូល: ${fmtKHR(income)}`,
        `  ❤️ ចំណាយ: ${fmtKHR(expense)}`,
        `  ${netSign} Net: ${fmtKHR(net)}`,
        ``,
        `<b>Month-to-date</b>`,
        `  💚 ចំណូល: ${fmtKHR(mIncome)}`,
        `  ❤️ ចំណាយ: ${fmtKHR(mExpense)}`,
        `  ${mNet >= 0 ? '📈' : '📉'} Net: ${fmtKHR(mNet)}`,
        dueLine,
      ].filter(l => l !== undefined).join('\n')

      await sendTelegramMessage(co.telegram_id, msg)

      // Mark as sent
      await fetch(`${API_URL}/internal/daily-summary/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': INTERNAL_SECRET },
        body: JSON.stringify({ company_id: co.id, date }),
      })
    }

    console.log(`[cron] Daily summary done — sent ${companies.length} messages`)
  } catch (err) {
    console.error('[cron] Daily summary error:', err)
  }
}

/**
 * Schedule the cron to fire at SUMMARY_HOUR_UTC:00 UTC every day.
 * Uses a lightweight setTimeout loop (no external dep needed).
 */
export function startDailyCron(): void {
  const now = new Date()
  let next = new Date(now)
  next.setUTCHours(SUMMARY_HOUR_UTC, 0, 0, 0)
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1) // already passed today, schedule tomorrow

  const msUntilFirst = next.getTime() - now.getTime()
  console.log(`[cron] Daily summary scheduled in ${Math.round(msUntilFirst / 60000)} minutes (${next.toISOString()})`)

  setTimeout(() => {
    runDailySummary()
    // Then repeat every 24 h
    setInterval(runDailySummary, 24 * 60 * 60 * 1000)
  }, msUntilFirst)
}
