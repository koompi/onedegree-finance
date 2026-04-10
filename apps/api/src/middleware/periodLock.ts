import { createMiddleware } from 'hono/factory'
import pool from '../db/client'

/**
 * Check if a period is locked for a company
 */
async function isPeriodLocked(companyId: string, period: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT id FROM period_locks WHERE company_id = $1 AND period = $2',
    [companyId, period]
  )
  return result.rows.length > 0
}

/**
 * Extract period (YYYY-MM) from a date string
 */
function extractPeriod(dateString: string): string {
  const date = new Date(dateString)
  return date.toISOString().slice(0, 7) // YYYY-MM
}

/**
 * Period lock check middleware
 * Prevents modifications to transactions/receivables/payables in locked periods
 *
 * Use before POST/PATCH/DELETE routes
 */
export const checkPeriodLock = createMiddleware<{
  Variables: { userId: string; companyId?: string }
}>(async (c, next) => {
  const companyId = c.req.param('companyId') || c.get('companyId')
  if (!companyId) {
    await next()
    return
  }

  // For POST/PATCH/DELETE, check if the period is locked
  const method = c.req.method
  if (method === 'POST' || method === 'PATCH' || method === 'DELETE') {
    // Try to get period from request body or query
    const body = await c.req.json().catch(() => ({}))
    const query = c.req.query()

    // Get date from various possible sources
    let dateStr: string | undefined

    if (body.occurred_at) {
      dateStr = body.occurred_at
    } else if (body.due_date) {
      dateStr = body.due_date
    } else if (query.month) {
      dateStr = query.month + '-01'
    }

    // If no date found, use current month
    if (!dateStr) {
      dateStr = new Date().toISOString()
    }

    const period = extractPeriod(dateStr)
    const locked = await isPeriodLocked(companyId, period)

    if (locked) {
      return c.json({
        error: 'PeriodLocked',
        message: `Period ${period} is locked. Contact owner to unlock.`
      }, 403)
    }
  }

  await next()
})

export { isPeriodLocked, extractPeriod }
