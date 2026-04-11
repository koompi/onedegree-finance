import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { teamMember, managerOrOwner, adminOrOwner } from '../middleware/rbac'
import pool from '../db/client'

type Variables = { userId: string; companyId?: string; userRole?: 'owner' | 'manager' | 'staff' }
const categories = new Hono<{ Variables: Variables }>()
categories.use('*', authMiddleware)

// GET categories - any team member can view
categories.get('/:companyId/categories', teamMember, async (c) => {
  const { companyId } = c.req.param()
  const result = await pool.query(
    `SELECT * FROM categories WHERE company_id = $1 ORDER BY name ASC`,
    [companyId]
  )
  return c.json(result.rows)
})

// POST categories - manager or owner only
categories.post('/:companyId/categories', managerOrOwner, zValidator('json', z.object({
  name: z.string().min(1),
  name_km: z.string().optional(),
  type: z.enum(['income', 'expense']),
  icon: z.string().optional(),
})), async (c) => {
  const { companyId } = c.req.param()
  const body = c.req.valid('json')
  const result = await pool.query(
    'INSERT INTO categories (company_id, name, name_km, type, icon, is_system) VALUES ($1, $2, $3, $4, $5, FALSE) RETURNING *',
    [companyId, body.name, body.name_km || null, body.type, body.icon || null]
  )
  return c.json(result.rows[0], 201)
})

// DELETE categories - admin or owner only
categories.delete('/:companyId/categories/:id', adminOrOwner, async (c) => {
  const { companyId, id } = c.req.param()
  const result = await pool.query('DELETE FROM categories WHERE id = $1 AND company_id = $2 RETURNING *', [id, companyId])
  if (result.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json({ success: true })
})

export default categories
