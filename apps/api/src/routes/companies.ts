import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import pool from '../db/client'

type Variables = { userId: string; companyId?: string }
const companies = new Hono<{ Variables: Variables }>()
companies.use('*', authMiddleware)

companies.get('/', async (c) => {
  const userId = c.get('userId')
  const result = await pool.query(
    'SELECT * FROM companies WHERE owner_id = $1 ORDER BY created_at ASC',
    [userId]
  )
  return c.json(result.rows)
})

const CompanyBody = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['agro', 'general', 'retail', 'service', 'other']).default('general'),
  currency_base: z.enum(['USD', 'KHR']).default('USD'),
})

companies.post('/', zValidator('json', CompanyBody), async (c) => {
  const userId = c.get('userId')
  const body = c.req.valid('json')
  const countResult = await pool.query('SELECT COUNT(*) FROM companies WHERE owner_id = $1', [userId])
  if (parseInt(countResult.rows[0].count) >= 3) {
    return c.json({ error: 'Maximum 3 companies allowed' }, 400)
  }
  const result = await pool.query(
    'INSERT INTO companies (owner_id, name, type, currency_base) VALUES ($1, $2, $3, $4) RETURNING *',
    [userId, body.name, body.type, body.currency_base]
  )
  return c.json(result.rows[0], 201)
})

companies.patch('/:id', zValidator('json', CompanyBody.partial()), async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = c.req.valid('json')
  const sets: string[] = []
  const values: unknown[] = []
  let i = 1
  if (body.name) { sets.push(`name = $${i++}`); values.push(body.name) }
  if (body.type) { sets.push(`type = $${i++}`); values.push(body.type) }
  if (body.currency_base) { sets.push(`currency_base = $${i++}`); values.push(body.currency_base) }
  if (sets.length === 0) return c.json({ error: 'Nothing to update' }, 400)
  values.push(id, userId)
  const result = await pool.query(
    `UPDATE companies SET ${sets.join(', ')} WHERE id = $${i++} AND owner_id = $${i} RETURNING *`,
    values
  )
  if (result.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(result.rows[0])
})

companies.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  await pool.query('DELETE FROM companies WHERE id = $1 AND owner_id = $2', [id, userId])
  return c.json({ ok: true })
})

export default companies
