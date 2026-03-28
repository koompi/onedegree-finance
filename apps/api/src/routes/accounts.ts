import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import pool from '../db/client'

type Variables = { userId: string; companyId?: string }
const accounts = new Hono<{ Variables: Variables }>()
accounts.use('*', authMiddleware)

async function ownsCompany(userId: string, companyId: string): Promise<boolean> {
  const r = await pool.query('SELECT id FROM companies WHERE id = $1 AND owner_id = $2', [companyId, userId])
  return r.rows.length > 0
}

accounts.get('/:companyId/accounts', async (c) => {
  const userId = c.get('userId')
  const { companyId } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)
  const result = await pool.query('SELECT * FROM accounts WHERE company_id = $1 ORDER BY created_at ASC', [companyId])
  return c.json(result.rows)
})

const AccountBody = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['cash', 'bank', 'mobile_money']).default('cash'),
  balance_cents: z.number().int().default(0),
})

accounts.post('/:companyId/accounts', zValidator('json', AccountBody), async (c) => {
  const userId = c.get('userId')
  const { companyId } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)
  const body = c.req.valid('json')
  const result = await pool.query(
    'INSERT INTO accounts (company_id, name, type, balance_cents) VALUES ($1, $2, $3, $4) RETURNING *',
    [companyId, body.name, body.type, body.balance_cents]
  )
  return c.json(result.rows[0], 201)
})

accounts.patch('/:companyId/accounts/:id', zValidator('json', AccountBody.partial()), async (c) => {
  const userId = c.get('userId')
  const { companyId, id } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)
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

accounts.delete('/:companyId/accounts/:id', async (c) => {
  const userId = c.get('userId')
  const { companyId, id } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)
  const txCheck = await pool.query('SELECT id FROM transactions WHERE account_id = $1 LIMIT 1', [id])
  if (txCheck.rows.length > 0) return c.json({ error: 'Cannot delete account with transactions' }, 400)
  await pool.query('DELETE FROM accounts WHERE id = $1 AND company_id = $2', [id, companyId])
  return c.json({ ok: true })
})

export default accounts
