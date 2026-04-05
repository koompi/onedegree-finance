import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import pool from '../db/client'

type Variables = { userId: string; companyId?: string }
const inventory = new Hono<{ Variables: Variables }>()
inventory.use('*', authMiddleware)

async function ownsCompany(userId: string, companyId: string): Promise<boolean> {
  const r = await pool.query('SELECT id FROM companies WHERE id = $1 AND owner_id = $2', [companyId, userId])
  return r.rows.length > 0
}

// List all inventory items
inventory.get('//items', async (c) => {
  const userId = c.get('userId')
  const companyId = c.get("companyId")
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)

  const result = await pool.query(
    `SELECT * FROM inventory_items WHERE company_id = $1 ORDER BY name ASC`,
    [companyId]
  )
  return c.json(result.rows)
})

// Create new item
const ItemBody = z.object({
  name: z.string().min(1).max(200),
  name_km: z.string().max(200).optional(),
  unit: z.string().default('kg'),
  low_stock_threshold: z.number().min(0).default(0),
})

inventory.post('//items', zValidator('json', ItemBody), async (c) => {
  const userId = c.get('userId')
  const companyId = c.get("companyId")
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)
  const body = c.req.valid('json')

  const result = await pool.query(
    `INSERT INTO inventory_items (company_id, name, name_km, unit, low_stock_threshold)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [companyId, body.name, body.name_km || null, body.unit, body.low_stock_threshold]
  )
  return c.json(result.rows[0], 201)
})

// Get single item with recent movements
inventory.get('//items/:id', async (c) => {
  const userId = c.get('userId')
  const { companyId, id } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)

  const item = await pool.query(
    'SELECT * FROM inventory_items WHERE id = $1 AND company_id = $2',
    [id, companyId]
  )
  if (item.rows.length === 0) return c.json({ error: 'Not found' }, 404)

  const movements = await pool.query(
    `SELECT * FROM inventory_movements WHERE item_id = $1 ORDER BY occurred_at DESC LIMIT 50`,
    [id]
  )

  return c.json({ ...item.rows[0], movements: movements.rows })
})

// Delete item
inventory.delete('//items/:id', async (c) => {
  const userId = c.get('userId')
  const { companyId, id } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)

  const result = await pool.query(
    'DELETE FROM inventory_items WHERE id = $1 AND company_id = $2 RETURNING id',
    [id, companyId]
  )
  if (result.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

// Add movement
const MovementBody = z.object({
  type: z.enum(['in', 'out']),
  qty: z.number().positive(),
  cost_per_unit_cents: z.number().int().min(0).optional(),
  note: z.string().max(500).optional(),
})

inventory.post('//items/:id/movements', zValidator('json', MovementBody), async (c) => {
  const userId = c.get('userId')
  const { companyId, id } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)
  const body = c.req.valid('json')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const item = await client.query(
      'SELECT * FROM inventory_items WHERE id = $1 AND company_id = $2 FOR UPDATE',
      [id, companyId]
    )
    if (item.rows.length === 0) { await client.query('ROLLBACK'); return c.json({ error: 'Not found' }, 404) }

    const current = item.rows[0]
    const currentQty = parseFloat(current.current_qty)
    const currentAvgCost = parseInt(current.avg_cost_cents)

    if (body.type === 'out' && body.qty > currentQty) {
      await client.query('ROLLBACK')
      return c.json({ error: 'Insufficient stock' }, 400)
    }

    let newQty: number
    let newAvgCost: number

    if (body.type === 'in') {
      const costPerUnit = body.cost_per_unit_cents || 0
      newQty = currentQty + body.qty
      newAvgCost = newQty > 0
        ? Math.round((currentQty * currentAvgCost + body.qty * costPerUnit) / newQty)
        : 0
    } else {
      newQty = currentQty - body.qty
      newAvgCost = currentAvgCost
    }

    await client.query(
      `UPDATE inventory_items SET current_qty = $1, avg_cost_cents = $2, updated_at = NOW() WHERE id = $3`,
      [newQty, newAvgCost, id]
    )

    const movement = await client.query(
      `INSERT INTO inventory_movements (company_id, item_id, type, qty, cost_per_unit_cents, note)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [companyId, id, body.type, body.qty, body.cost_per_unit_cents || 0, body.note || null]
    )

    await client.query('COMMIT')
    return c.json(movement.rows[0], 201)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
})

// List movements for item
inventory.get('//items/:id/movements', async (c) => {
  const userId = c.get('userId')
  const { companyId, id } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)

  const { limit = '50', offset = '0' } = c.req.query()
  const result = await pool.query(
    `SELECT * FROM inventory_movements WHERE item_id = $1 AND company_id = $2 ORDER BY occurred_at DESC LIMIT $3 OFFSET $4`,
    [id, companyId, parseInt(limit), parseInt(offset)]
  )
  return c.json(result.rows)
})

export default inventory
