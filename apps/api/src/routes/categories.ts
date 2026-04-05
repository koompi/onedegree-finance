import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import pool from '../db/client'

type Variables = { userId: string; companyId?: string }
const categories = new Hono<{ Variables: Variables }>()
categories.use('*', authMiddleware)

async function ownsCompany(userId: string, companyId: string): Promise<boolean> {
  const r = await pool.query('SELECT id FROM companies WHERE id = $1 AND owner_id = $2', [companyId, userId])
  return r.rows.length > 0
}

categories.get('/', async (c) => {
  const userId = c.get('userId')
  const companyId = c.get("companyId")
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)
  const result = await pool.query(
    `SELECT * FROM categories WHERE company_id = $1 OR is_system = TRUE ORDER BY is_system DESC, name ASC`,
    [companyId]
  )
  return c.json(result.rows)
})

categories.post('/', zValidator('json', z.object({
  name: z.string().min(1),
  name_km: z.string().optional(),
  type: z.enum(['income', 'expense']),
  icon: z.string().optional(),
})), async (c) => {
  const userId = c.get('userId')
  const companyId = c.get("companyId")
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)
  const body = c.req.valid('json')
  const result = await pool.query(
    'INSERT INTO categories (company_id, name, name_km, type, icon) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [companyId, body.name, body.name_km || null, body.type, body.icon || null]
  )
  return c.json(result.rows[0], 201)
})

export default categories
