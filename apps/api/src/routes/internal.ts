/**
 * Internal API routes — called by the bot cron, NOT user-facing
 * Protected by x-internal-secret header
 */
import { Hono } from 'hono'
import pool from '../db/client'
import { processOverdueRecurring } from './recurring'

const internal = new Hono()

const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'od_internal_secret_2025'

function checkSecret(c: any): boolean {
  return c.req.header('x-internal-secret') === INTERNAL_SECRET
}

/**
 * GET /internal/daily-summary
 * Returns all active companies that haven't been sent a summary today
 */
internal.get('/daily-summary', async (c) => {
  if (!checkSecret(c)) return c.json({ error: 'Unauthorized' }, 401)

  const today = new Date().toISOString().slice(0, 10)
  const month = today.slice(0, 7)

  const result = await pool.query(
    `SELECT c.id, c.name,
            u.telegram_id,
            (SELECT COUNT(*)::INT FROM transactions
               WHERE company_id = c.id AND occurred_at::DATE = $1::DATE) as today_count,
            COALESCE((SELECT SUM(amount_cents)::BIGINT FROM transactions
               WHERE company_id = c.id AND occurred_at::DATE = $1::DATE AND type = 'income'), 0) as today_income,
            COALESCE((SELECT SUM(amount_cents)::BIGINT FROM transactions
               WHERE company_id = c.id AND occurred_at::DATE = $1::DATE AND type = 'expense'), 0) as today_expense,
            COALESCE((SELECT SUM(amount_cents)::BIGINT FROM transactions
               WHERE company_id = c.id
                 AND occurred_at >= ($2 || '-01')::DATE
                 AND occurred_at < (($2 || '-01')::DATE + INTERVAL '1 month')
                 AND type = 'income'), 0) as month_income,
            COALESCE((SELECT SUM(amount_cents)::BIGINT FROM transactions
               WHERE company_id = c.id
                 AND occurred_at >= ($2 || '-01')::DATE
                 AND occurred_at < (($2 || '-01')::DATE + INTERVAL '1 month')
                 AND type = 'expense'), 0) as month_expense,
            (SELECT COUNT(*)::INT FROM receivables
               WHERE company_id = c.id AND status != 'paid'
               AND due_date <= ($1::DATE + INTERVAL '3 days')) as due_soon
     FROM companies c
     JOIN users u ON c.owner_id = u.id
     WHERE EXISTS (
       SELECT 1 FROM transactions WHERE company_id = c.id
       AND occurred_at > NOW() - INTERVAL '60 days'
     )
     AND NOT EXISTS (
       SELECT 1 FROM daily_summary_log WHERE company_id = c.id AND summary_date = $1::DATE
     )`,
    [today, month]
  )

  return c.json({ date: today, companies: result.rows })
})

/**
 * POST /internal/daily-summary/mark
 * Mark a company as having received today's summary
 */
internal.post('/daily-summary/mark', async (c) => {
  if (!checkSecret(c)) return c.json({ error: 'Unauthorized' }, 401)
  const { company_id, date } = await c.req.json<{ company_id: string; date: string }>()
  await pool.query(
    'INSERT INTO daily_summary_log (company_id, summary_date) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [company_id, date]
  )
  return c.json({ ok: true })
})

/**
 * POST /internal/recurring/process
 * Process all overdue recurring transactions across all companies
 */
internal.post('/recurring/process', async (c) => {
  if (!checkSecret(c)) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const processed = await processOverdueRecurring()
    return c.json({ ok: true, processed })
  } catch (err) {
    console.error('[internal] recurring process error:', err)
    return c.json({ error: 'Internal error' }, 500)
  }
})

export default internal
