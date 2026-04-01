import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import pool from '../db/client'

type Variables = { userId: string }
const recurring = new Hono<{ Variables: Variables }>()
recurring.use('*', authMiddleware)

async function ownsCompany(userId: string, companyId: string): Promise<boolean> {
  const r = await pool.query('SELECT id FROM companies WHERE id = $1 AND owner_id = $2', [companyId, userId])
  return r.rows.length > 0
}

/** Advance next_run_date by one period */
function advanceDate(date: Date, frequency: string): Date {
  const d = new Date(date)
  switch (frequency) {
    case 'daily':   d.setDate(d.getDate() + 1); break
    case 'weekly':  d.setDate(d.getDate() + 7); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'yearly':  d.setFullYear(d.getFullYear() + 1); break
  }
  return d
}

// ─── LIST ──────────────────────────────────────────────────────────────────────
recurring.get('/:companyId/recurring', async (c) => {
  const userId = c.get('userId')
  const { companyId } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)

  const result = await pool.query(
    `SELECT r.*,
            cat.name as category_name, cat.icon as category_icon,
            acc.name as account_name
     FROM recurring_transactions r
     LEFT JOIN categories cat ON r.category_id = cat.id
     LEFT JOIN accounts acc ON r.account_id = acc.id
     WHERE r.company_id = $1
     ORDER BY r.active DESC, r.next_run_date ASC`,
    [companyId]
  )
  return c.json(result.rows)
})

// ─── CREATE ────────────────────────────────────────────────────────────────────
const RecurringBody = z.object({
  type:          z.enum(['income', 'expense']),
  amount_cents:  z.number().int().positive(),
  currency_input: z.enum(['KHR', 'USD']).default('KHR'),
  category_id:   z.string().uuid().optional(),
  account_id:    z.string().uuid().optional(),
  note:          z.string().max(200).optional(),
  frequency:     z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  start_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
})

recurring.post('/:companyId/recurring', zValidator('json', RecurringBody), async (c) => {
  const userId = c.get('userId')
  const { companyId } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)

  const body = c.req.valid('json')
  const r = await pool.query(
    `INSERT INTO recurring_transactions
       (company_id, account_id, category_id, type, amount_cents, currency_input, note, frequency, next_run_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [companyId, body.account_id || null, body.category_id || null, body.type,
     body.amount_cents, body.currency_input, body.note || null, body.frequency, body.start_date]
  )
  return c.json(r.rows[0], 201)
})

// ─── UPDATE (toggle active / change amount-note) ───────────────────────────────
const PatchBody = z.object({
  active:       z.boolean().optional(),
  amount_cents: z.number().int().positive().optional(),
  note:         z.string().max(200).optional().nullable(),
  account_id:   z.string().uuid().optional().nullable(),
  category_id:  z.string().uuid().optional().nullable(),
})

recurring.patch('/:companyId/recurring/:id', zValidator('json', PatchBody), async (c) => {
  const userId = c.get('userId')
  const { companyId, id } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)

  const body = c.req.valid('json')
  const existing = await pool.query(
    'SELECT * FROM recurring_transactions WHERE id = $1 AND company_id = $2', [id, companyId]
  )
  if (existing.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  const old = existing.rows[0]

  const r = await pool.query(
    `UPDATE recurring_transactions SET
       active       = $1,
       amount_cents = $2,
       note         = $3,
       account_id   = $4,
       category_id  = $5
     WHERE id = $6 AND company_id = $7 RETURNING *`,
    [
      body.active   !== undefined ? body.active       : old.active,
      body.amount_cents !== undefined ? body.amount_cents : old.amount_cents,
      body.note     !== undefined ? body.note         : old.note,
      body.account_id !== undefined ? body.account_id : old.account_id,
      body.category_id !== undefined ? body.category_id : old.category_id,
      id, companyId,
    ]
  )
  return c.json(r.rows[0])
})

// ─── DELETE ────────────────────────────────────────────────────────────────────
recurring.delete('/:companyId/recurring/:id', async (c) => {
  const userId = c.get('userId')
  const { companyId, id } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)
  await pool.query('DELETE FROM recurring_transactions WHERE id = $1 AND company_id = $2', [id, companyId])
  return c.json({ ok: true })
})

// ─── RUN NOW (manual trigger) ──────────────────────────────────────────────────
recurring.post('/:companyId/recurring/:id/run', async (c) => {
  const userId = c.get('userId')
  const { companyId, id } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)

  const rq = await pool.query(
    'SELECT * FROM recurring_transactions WHERE id = $1 AND company_id = $2', [id, companyId]
  )
  if (rq.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  const rule = rq.rows[0]

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Create the actual transaction
    const tx = await client.query(
      `INSERT INTO transactions
         (company_id, account_id, category_id, type, amount_cents, currency_input, note, occurred_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *`,
      [companyId, rule.account_id, rule.category_id, rule.type,
       rule.amount_cents, rule.currency_input, rule.note]
    )
    // Update account balance
    if (rule.account_id) {
      const delta = rule.type === 'income' ? rule.amount_cents : -rule.amount_cents
      await client.query('UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2', [delta, rule.account_id])
    }
    // Advance next_run_date
    const next = advanceDate(new Date(rule.next_run_date), rule.frequency)
    await client.query(
      'UPDATE recurring_transactions SET next_run_date = $1, last_run_date = CURRENT_DATE WHERE id = $2',
      [next.toISOString().slice(0, 10), id]
    )
    await client.query('COMMIT')
    return c.json({ ok: true, transaction: tx.rows[0], next_run_date: next.toISOString().slice(0, 10) })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
})

/**
 * Internal endpoint: process ALL overdue recurring transactions
 * Called by bot cron. Protected by x-internal-secret.
 */
export async function processOverdueRecurring(companyId?: string): Promise<number> {
  const where = companyId
    ? 'active = TRUE AND next_run_date <= CURRENT_DATE AND company_id = $1'
    : 'active = TRUE AND next_run_date <= CURRENT_DATE'
  const params = companyId ? [companyId] : []
  const dues = await pool.query(
    `SELECT * FROM recurring_transactions WHERE ${where}`, params
  )

  let count = 0
  for (const rule of dues.rows) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `INSERT INTO transactions
           (company_id, account_id, category_id, type, amount_cents, currency_input, note, occurred_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
        [rule.company_id, rule.account_id, rule.category_id, rule.type,
         rule.amount_cents, rule.currency_input, rule.note]
      )
      if (rule.account_id) {
        const delta = rule.type === 'income' ? rule.amount_cents : -rule.amount_cents
        await client.query('UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2', [delta, rule.account_id])
      }
      const next = advanceDate(new Date(rule.next_run_date), rule.frequency)
      await client.query(
        'UPDATE recurring_transactions SET next_run_date = $1, last_run_date = CURRENT_DATE WHERE id = $2',
        [next.toISOString().slice(0, 10), rule.id]
      )
      await client.query('COMMIT')
      count++
    } catch (e) {
      await client.query('ROLLBACK')
      console.error('[recurring] Error processing rule', rule.id, e)
    } finally {
      client.release()
    }
  }
  return count
}

export default recurring
