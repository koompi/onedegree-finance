import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import pool from '../db/client'

type Variables = { userId: string; companyId?: string }
const payables = new Hono<{ Variables: Variables }>()
payables.use('*', authMiddleware)

async function ownsCompany(userId: string, companyId: string): Promise<boolean> {
  const r = await pool.query('SELECT id FROM companies WHERE id = $1 AND owner_id = $2', [companyId, userId])
  return r.rows.length > 0
}

const Body = z.object({
  contact_name: z.string().min(1),
  amount_cents: z.number().int().positive(),
  currency: z.enum(['USD', 'KHR']).default('USD'),
  due_date: z.string().optional(),
  note: z.string().optional(),
  status: z.enum(['pending', 'partial', 'paid']).default('pending'),
})

payables.get('/:companyId/payables', async (c) => {
  const userId = c.get('userId'); const { companyId } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)
  const { status } = c.req.query()
  let q = 'SELECT * FROM payables WHERE company_id = $1'
  const vals: unknown[] = [companyId]
  if (status) { q += ' AND status = $2'; vals.push(status) }
  q += ' ORDER BY due_date ASC NULLS LAST, created_at DESC'
  return c.json((await pool.query(q, vals)).rows)
})

payables.post('/:companyId/payables', zValidator('json', Body), async (c) => {
  const userId = c.get('userId'); const { companyId } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)
  const b = c.req.valid('json')
  const r = await pool.query(
    'INSERT INTO payables (company_id, contact_name, amount_cents, currency, due_date, note, status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [companyId, b.contact_name, b.amount_cents, b.currency, b.due_date || null, b.note || null, b.status]
  )
  return c.json(r.rows[0], 201)
})

payables.patch('/:companyId/payables/:id', zValidator('json', Body.partial()), async (c) => {
  const userId = c.get('userId'); const { companyId, id } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)
  const b = c.req.valid('json')
  const sets: string[] = []; const vals: unknown[] = []; let i = 1
  if (b.contact_name) { sets.push(`contact_name=$${i++}`); vals.push(b.contact_name) }
  if (b.amount_cents) { sets.push(`amount_cents=$${i++}`); vals.push(b.amount_cents) }
  if (b.status) { sets.push(`status=$${i++}`); vals.push(b.status) }
  if (b.due_date) { sets.push(`due_date=$${i++}`); vals.push(b.due_date) }
  if (b.note !== undefined) { sets.push(`note=$${i++}`); vals.push(b.note) }
  sets.push(`updated_at=NOW()`)
  vals.push(id, companyId)
  const r = await pool.query(
    `UPDATE payables SET ${sets.join(',')} WHERE id=$${i++} AND company_id=$${i} RETURNING *`, vals
  )
  if (!r.rows.length) return c.json({ error: 'Not found' }, 404)
  return c.json(r.rows[0])
})

payables.delete('/:companyId/payables/:id', async (c) => {
  const userId = c.get('userId'); const { companyId, id } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)
  await pool.query('DELETE FROM payables WHERE id=$1 AND company_id=$2', [id, companyId])
  return c.json({ ok: true })
})

export default payables
