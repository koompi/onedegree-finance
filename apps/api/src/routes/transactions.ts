import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import pool from '../db/client'

type Variables = { userId: string; companyId?: string }
const transactions = new Hono<{ Variables: Variables }>()
transactions.use('*', authMiddleware)

async function ownsCompany(userId: string, companyId: string): Promise<boolean> {
  const r = await pool.query('SELECT id FROM companies WHERE id = $1 AND owner_id = $2', [companyId, userId])
  return r.rows.length > 0
}

transactions.get('/:companyId/transactions', async (c) => {
  const userId = c.get('userId')
  const { companyId } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)
  const { month, type, limit = '50', offset = '0' } = c.req.query()
  const conditions = ['t.company_id = $1']
  const values: unknown[] = [companyId]
  let i = 2
  if (month) {
    conditions.push(`t.occurred_at >= ($${i} || '-01')::DATE AND t.occurred_at < (($${i++} || '-01')::DATE + INTERVAL '1 month')`)
    values.push(month)
  }
  if (type) {
    conditions.push(`t.type = $${i++}`)
    values.push(type)
  }
  values.push(parseInt(limit), parseInt(offset))
  const result = await pool.query(
    `SELECT t.*, c.name as category_name, c.name_km as category_name_km, c.icon as category_icon,
            a.name as account_name
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN accounts a ON t.account_id = a.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY t.occurred_at DESC
     LIMIT $${i++} OFFSET $${i}`,
    values
  )
  return c.json(result.rows)
})

const TxBody = z.object({
  account_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  type: z.enum(['income', 'expense', 'transfer']),
  amount_cents: z.number().int().positive(),
  amount_khr: z.number().int().optional(),
  exchange_rate: z.number().optional(),
  currency_input: z.enum(['USD', 'KHR']).default('USD'),
  note: z.string().max(500).optional(),
  occurred_at: z.string().datetime(),
  receipt_url: z.string().url().optional(),
})

transactions.post('/:companyId/transactions', zValidator('json', TxBody), async (c) => {
  const userId = c.get('userId')
  const { companyId } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)
  const body = c.req.valid('json')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `INSERT INTO transactions (company_id, account_id, category_id, type, amount_cents, amount_khr, exchange_rate, currency_input, note, occurred_at, receipt_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [companyId, body.account_id, body.category_id || null, body.type, body.amount_cents,
       body.amount_khr || null, body.exchange_rate || null, body.currency_input, body.note || null, body.occurred_at,
       body.receipt_url || null]
    )
    const delta = body.type === 'income' ? body.amount_cents : -body.amount_cents
    if (body.account_id) await client.query('UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2', [delta, body.account_id])
    await client.query('COMMIT')
    return c.json(result.rows[0], 201)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
})

transactions.delete('/:companyId/transactions/:id', async (c) => {
  const userId = c.get('userId')
  const { companyId, id } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const tx = await client.query('SELECT * FROM transactions WHERE id = $1 AND company_id = $2', [id, companyId])
    if (tx.rows.length === 0) { await client.query('ROLLBACK'); return c.json({ error: 'Not found' }, 404) }
    const t = tx.rows[0]
    const delta = t.type === 'income' ? -t.amount_cents : t.amount_cents
    await client.query('UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2', [delta, t.account_id])
    await client.query('DELETE FROM transactions WHERE id = $1', [id])
    await client.query('COMMIT')
    return c.json({ ok: true })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
})

export default transactions

// GET single transaction (for EditTransaction pre-fill)
transactions.get('/:companyId/transactions/:id', async (c) => {
  const userId = c.get('userId')
  const { companyId, id } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)
  const result = await pool.query(
    `SELECT t.*, c.name as category_name, c.name_km as category_name_km, c.icon as category_icon,
            a.name as account_name
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN accounts a ON t.account_id = a.id
     WHERE t.id = $1 AND t.company_id = $2`,
    [id, companyId]
  )
  if (result.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(result.rows[0])
})

const PatchTxBody = z.object({
  account_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  amount_cents: z.number().int().positive().optional(),
  currency_input: z.enum(['USD', 'KHR']).optional(),
  note: z.string().max(500).optional().nullable(),
})

// PATCH transaction (for EditTransaction save)
transactions.patch('/:companyId/transactions/:id', zValidator('json', PatchTxBody), async (c) => {
  const userId = c.get('userId')
  const { companyId, id } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)
  const body = c.req.valid('json')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const existing = await client.query('SELECT * FROM transactions WHERE id = $1 AND company_id = $2', [id, companyId])
    if (existing.rows.length === 0) { await client.query('ROLLBACK'); return c.json({ error: 'Not found' }, 404) }
    const old = existing.rows[0]
    // Reverse old balance effect
    const oldDelta = old.type === 'income' ? -old.amount_cents : old.amount_cents
    await client.query('UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2', [oldDelta, old.account_id])
    // Apply updates
    const newType = body.type ?? old.type
    const newAmount = body.amount_cents ?? old.amount_cents
    const newAccountId = body.account_id ?? old.account_id
    const result = await client.query(
      `UPDATE transactions SET
        account_id = $1, category_id = $2, type = $3, amount_cents = $4,
        currency_input = $5, note = $6, updated_at = NOW()
       WHERE id = $7 AND company_id = $8 RETURNING *`,
      [newAccountId, body.category_id ?? old.category_id, newType, newAmount,
       body.currency_input ?? old.currency_input, body.note !== undefined ? body.note : old.note,
       id, companyId]
    )
    // Apply new balance effect
    const newDelta = newType === 'income' ? newAmount : -newAmount
    await client.query('UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2', [newDelta, newAccountId])
    await client.query('COMMIT')
    return c.json(result.rows[0])
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
})
