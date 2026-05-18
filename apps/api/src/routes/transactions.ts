import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { teamMember } from '../middleware/rbac'
import { checkPeriodLock } from '../middleware/periodLock'
import { exchangeRateService } from '../services/exchangeRate'
import pool from '../db/client'

type Variables = { userId: string; companyId?: string; userRole?: 'owner' | 'manager' | 'staff' }
const transactions = new Hono<{ Variables: Variables }>()
transactions.use('*', authMiddleware)

async function ownsCompany(userId: string, companyId: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT id FROM companies WHERE id = $1 AND owner_id = $2
     UNION ALL
     SELECT tm.company_id FROM team_members tm
     WHERE tm.company_id = $1 AND tm.user_id = $2 AND tm.role = 'owner' AND tm.active = TRUE`,
    [companyId, userId]
  )
  return r.rows.length > 0
}

// GET transactions - requires team member access
transactions.get('/:companyId/transactions', teamMember, async (c) => {
  const userId = c.get('userId')
  const userRole = c.get('userRole')
  const { companyId } = c.req.param()
  const { month, type, limit = '50', offset = '0', currency, is_personal } = c.req.query()

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
  // Filter by personal/business if explicitly requested
  if (is_personal === 'true') {
    conditions.push(`t.is_personal = TRUE`)
  } else if (is_personal === 'false') {
    conditions.push(`t.is_personal = FALSE`)
  }

  values.push(parseInt(limit), parseInt(offset))

  const result = await pool.query(
    `SELECT t.*, c.name as category_name, c.name_km as category_name_km, c.icon as category_icon,
            a.name as account_name, ta.name as to_account_name
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN accounts a ON t.account_id = a.id
     LEFT JOIN accounts ta ON t.to_account_id = ta.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY t.occurred_at DESC
     LIMIT $${i++} OFFSET $${i}`,
    values
  )

  // Convert amounts based on currency param
  let rows = result.rows
  if (currency === 'KHR') {
    rows = rows.map(r => ({
      ...r,
      amount_cents: r.amount_khr || exchangeRateService.usdToKhr(r.amount_cents)
    }))
  }

  return c.json(rows)
})

const TxBody = z.object({
  account_id: z.string().uuid().optional(),
  to_account_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  type: z.enum(['income', 'expense', 'transfer']),
  amount_cents: z.number().int().positive().optional(),
  amount_khr: z.number().int().positive().optional(),
  currency_input: z.enum(['USD', 'KHR']).default('USD'),
  note: z.string().max(500).optional(),
  occurred_at: z.string().datetime(),
  receipt_url: z.string().url().optional(),
  is_personal: z.boolean().default(false).optional(),
})

// POST transaction - requires team member, checks period lock
transactions.post(
  '/:companyId/transactions',
  teamMember,
  checkPeriodLock,
  zValidator('json', TxBody),
  async (c) => {
    const userId = c.get('userId')
    const userRole = c.get('userRole')
    const { companyId } = c.req.param()
    const body = c.req.valid('json')

    // Auto-assign first account if none provided (quick mode)
    let accountId = body.account_id
    if (!accountId) {
      const firstAccount = await pool.query(
        'SELECT id FROM accounts WHERE company_id = $1 ORDER BY created_at ASC LIMIT 1',
        [companyId]
      )
      accountId = firstAccount.rows[0]?.id || null
    }

    // Calculate dual currency amounts
    const inputAmount = body.amount_cents || body.amount_khr || 0
    const { amount_cents, amount_khr, exchange_rate } = exchangeRateService.calculateDualCurrency(
      inputAmount,
      body.currency_input
    )

    const toAccountId = body.to_account_id || null

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const result = await client.query(
        `INSERT INTO transactions (company_id, account_id, to_account_id, category_id, type, amount_cents, amount_khr, exchange_rate, currency_input, note, occurred_at, receipt_url, is_personal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [companyId, accountId, toAccountId, body.category_id || null, body.type, amount_cents,
         amount_khr, exchange_rate, body.currency_input, body.note || null, body.occurred_at,
         body.receipt_url || null, body.is_personal ?? false]
      )
      if (body.type === 'transfer') {
        if (accountId) await client.query('UPDATE accounts SET balance_cents = balance_cents - $1 WHERE id = $2', [amount_cents, accountId])
        if (toAccountId) await client.query('UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2', [amount_cents, toAccountId])
      } else {
        const delta = body.type === 'income' ? amount_cents : -amount_cents
        if (accountId) await client.query('UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2', [delta, accountId])
      }
      await client.query('COMMIT')
      return c.json(result.rows[0], 201)
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  }
)

// DELETE transaction - owner/manager only, checks period lock
transactions.delete(
  '/:companyId/transactions/:id',
  teamMember,
  checkPeriodLock,
  async (c) => {
    const userId = c.get('userId')
    const userRole = c.get('userRole')
    const { companyId, id } = c.req.param()

    // Staff cannot delete
    if (userRole === 'staff') {
      return c.json({ error: 'Insufficient permissions' }, 403)
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const tx = await client.query('SELECT * FROM transactions WHERE id = $1 AND company_id = $2', [id, companyId])
      if (tx.rows.length === 0) { await client.query('ROLLBACK'); return c.json({ error: 'Not found' }, 404) }
      const t = tx.rows[0]
      if (t.type === 'transfer') {
        if (t.account_id) await client.query('UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2', [t.amount_cents, t.account_id])
        if (t.to_account_id) await client.query('UPDATE accounts SET balance_cents = balance_cents - $1 WHERE id = $2', [t.amount_cents, t.to_account_id])
      } else {
        const delta = t.type === 'income' ? -t.amount_cents : t.amount_cents
        await client.query('UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2', [delta, t.account_id])
      }
      await client.query('DELETE FROM transactions WHERE id = $1', [id])
      await client.query('COMMIT')
      return c.json({ ok: true })
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  }
)

// GET single transaction
transactions.get('/:companyId/transactions/:id', teamMember, async (c) => {
  const userId = c.get('userId')
  const { companyId, id } = c.req.param()
  const { currency } = c.req.query()

  const result = await pool.query(
    `SELECT t.*, c.name as category_name, c.name_km as category_name_km, c.icon as category_icon,
            a.name as account_name, ta.name as to_account_name
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN accounts a ON t.account_id = a.id
     LEFT JOIN accounts ta ON t.to_account_id = ta.id
     WHERE t.id = $1 AND t.company_id = $2`,
    [id, companyId]
  )

  if (result.rows.length === 0) return c.json({ error: 'Not found' }, 404)

  let row = result.rows[0]
  if (currency === 'KHR' && row.amount_khr) {
    row = { ...row, amount_cents: row.amount_khr }
  }

  return c.json(row)
})

const PatchTxBody = z.object({
  account_id: z.string().uuid().optional(),
  to_account_id: z.string().uuid().optional().nullable(),
  category_id: z.string().uuid().optional(),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  amount_cents: z.number().int().positive().optional(),
  amount_khr: z.number().int().positive().optional(),
  currency_input: z.enum(['USD', 'KHR']).optional(),
  note: z.string().max(500).optional().nullable(),
  is_personal: z.boolean().optional(),
})

// PATCH transaction - owner/manager only, checks period lock
transactions.patch(
  '/:companyId/transactions/:id',
  teamMember,
  checkPeriodLock,
  zValidator('json', PatchTxBody),
  async (c) => {
    const userId = c.get('userId')
    const userRole = c.get('userRole')
    const { companyId, id } = c.req.param()
    const body = c.req.valid('json')

    // Staff cannot edit
    if (userRole === 'staff') {
      return c.json({ error: 'Insufficient permissions' }, 403)
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const existing = await client.query('SELECT * FROM transactions WHERE id = $1 AND company_id = $2', [id, companyId])
      if (existing.rows.length === 0) { await client.query('ROLLBACK'); return c.json({ error: 'Not found' }, 404) }
      const old = existing.rows[0]

      // Reverse old balance effect
      if (old.type === 'transfer') {
        if (old.account_id) await client.query('UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2', [old.amount_cents, old.account_id])
        if (old.to_account_id) await client.query('UPDATE accounts SET balance_cents = balance_cents - $1 WHERE id = $2', [old.amount_cents, old.to_account_id])
      } else {
        const oldDelta = old.type === 'income' ? -old.amount_cents : old.amount_cents
        await client.query('UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2', [oldDelta, old.account_id])
      }

      // Calculate new amounts if currency_input or amount provided
      let newAmount = body.amount_cents ?? old.amount_cents
      const currencyInput = body.currency_input ?? old.currency_input
      if (body.amount_cents || body.amount_khr) {
        const inputAmount = body.amount_cents || body.amount_khr || 0
        const calculated = exchangeRateService.calculateDualCurrency(inputAmount, currencyInput)
        newAmount = calculated.amount_cents
      }

      const newType = body.type ?? old.type
      const newAccountId = body.account_id ?? old.account_id
      const newToAccountId = body.to_account_id !== undefined ? body.to_account_id : old.to_account_id

      const result = await client.query(
        `UPDATE transactions SET
          account_id = $1, to_account_id = $2, category_id = $3, type = $4, amount_cents = $5,
          currency_input = $6, note = $7, is_personal = $8, updated_at = NOW()
         WHERE id = $9 AND company_id = $10 RETURNING *`,
        [newAccountId, newToAccountId, body.category_id ?? old.category_id, newType, newAmount,
         currencyInput, body.note !== undefined ? body.note : old.note,
         body.is_personal !== undefined ? body.is_personal : old.is_personal,
         id, companyId]
      )

      // Apply new balance effect
      if (newType === 'transfer') {
        if (newAccountId) await client.query('UPDATE accounts SET balance_cents = balance_cents - $1 WHERE id = $2', [newAmount, newAccountId])
        if (newToAccountId) await client.query('UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2', [newAmount, newToAccountId])
      } else {
        const newDelta = newType === 'income' ? newAmount : -newAmount
        await client.query('UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2', [newDelta, newAccountId])
      }
      await client.query('COMMIT')
      return c.json(result.rows[0])
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  }
)

export default transactions
