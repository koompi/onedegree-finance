import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { teamMember, managerOrOwner, adminOrOwner } from '../middleware/rbac'
import pool from '../db/client'

type Variables = { userId: string; companyId?: string; userRole?: 'owner' | 'manager' | 'staff' }
const accounts = new Hono<{ Variables: Variables }>()
accounts.use('*', authMiddleware)

// GET accounts - any team member can view
accounts.get('/:companyId/accounts', teamMember, async (c) => {
  const { companyId } = c.req.param()
  const result = await pool.query('SELECT * FROM accounts WHERE company_id = $1 ORDER BY created_at ASC', [companyId])
  return c.json(result.rows)
})

const AccountBody = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['cash', 'bank', 'mobile_money']).default('cash'),
  balance_cents: z.number().int().default(0),
})

// POST accounts - manager or owner only
accounts.post('/:companyId/accounts', managerOrOwner, zValidator('json', AccountBody), async (c) => {
  const { companyId } = c.req.param()
  const body = c.req.valid('json')
  const result = await pool.query(
    'INSERT INTO accounts (company_id, name, type, balance_cents) VALUES ($1, $2, $3, $4) RETURNING *',
    [companyId, body.name, body.type, body.balance_cents]
  )
  return c.json(result.rows[0], 201)
})

// PATCH accounts - manager or owner only
accounts.patch('/:companyId/accounts/:id', managerOrOwner, zValidator('json', AccountBody.partial()), async (c) => {
  const { companyId, id } = c.req.param()
  const body = c.req.valid('json')
  const sets: string[] = []; const values: unknown[] = []; let i = 1
  if (body.name !== undefined) { sets.push(`name = $${i++}`); values.push(body.name) }
  if (body.type !== undefined) { sets.push(`type = $${i++}`); values.push(body.type) }
  if (sets.length === 0) return c.json({ error: 'Nothing to update' }, 400)
  values.push(id, companyId)
  const result = await pool.query(
    `UPDATE accounts SET ${sets.join(', ')} WHERE id = $${i++} AND company_id = $${i} RETURNING *`, values
  )
  if (result.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(result.rows[0])
})

// DELETE accounts - admin or owner only
accounts.delete('/:companyId/accounts/:id', adminOrOwner, async (c) => {
  const { companyId, id } = c.req.param()
  const txCheck = await pool.query('SELECT id FROM transactions WHERE account_id = $1 LIMIT 1', [id])
  if (txCheck.rows.length > 0) return c.json({ error: 'Cannot delete account with transactions' }, 400)
  await pool.query('DELETE FROM accounts WHERE id = $1 AND company_id = $2', [id, companyId])
  return c.json({ ok: true })
})

export default accounts
