import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { ownerOnly, teamMember } from '../middleware/rbac'
import pool from '../db/client'

type Variables = { userId: string; companyId?: string; userRole?: 'owner' | 'manager' | 'staff' }
const companies = new Hono<{ Variables: Variables }>()
companies.use('*', authMiddleware)

// GET all companies - where user is owner or team member
companies.get('/', async (c) => {
  const userId = c.get('userId')
  const result = await pool.query(
    `SELECT DISTINCT c.*,
      COALESCE(tm.role, 'owner') as user_role
     FROM companies c
     LEFT JOIN team_members tm ON tm.company_id = c.id AND tm.user_id = $1 AND tm.active = TRUE
     WHERE c.owner_id = $1 OR tm.user_id = $1
     ORDER BY c.created_at ASC`,
    [userId]
  )
  return c.json(result.rows)
})

const CompanyBody = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['agro', 'general', 'retail', 'service', 'other']).optional(),
  currency_base: z.enum(['USD', 'KHR']).optional(),
  business_type: z.string().max(100).optional(),
  tax_id: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  logo_url: z.string().url().optional().nullable(),
})

// POST create company
companies.post('/', zValidator('json', CompanyBody), async (c) => {
  const userId = c.get('userId')
  const body = c.req.valid('json')

  // Check if user owns too many companies
  const countResult = await pool.query('SELECT COUNT(*) FROM companies WHERE owner_id = $1', [userId])
  if (parseInt(countResult.rows[0].count) >= 3) {
    return c.json({ error: 'Maximum 3 companies allowed' }, 400)
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Create company
    const result = await client.query(
      `INSERT INTO companies (owner_id, name, type, currency_base, business_type, tax_id, phone, address, logo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [userId, body.name, body.type || 'general', body.currency_base || 'USD',
       body.business_type || null, body.tax_id || null, body.phone || null, body.address || null, body.logo_url || null]
    )
    const company = result.rows[0]

    // Auto-insert owner as team member
    await client.query(
      `INSERT INTO team_members (user_id, company_id, role, invited_by, active)
       VALUES ($1, $2, 'owner', $1, TRUE)`,
      [userId, company.id]
    )

    // Seed default categories for this company
    await client.query(`
      INSERT INTO categories (company_id, name, name_km, type, icon, is_system)
      SELECT $1, name, name_km, type, icon, FALSE
      FROM categories
      WHERE is_system = TRUE AND company_id IS NULL
    `, [company.id])

    await client.query('COMMIT')
    return c.json(company, 201)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
})

// PATCH update company (owner only)
companies.patch('/:id', zValidator('json', CompanyBody.partial()), async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = c.req.valid('json')
  const sets: string[] = []
  const values: unknown[] = []
  let i = 1
  if (body.name !== undefined) { sets.push(`name = $${i++}`); values.push(body.name) }
  if (body.type !== undefined) { sets.push(`type = $${i++}`); values.push(body.type) }
  if (body.currency_base !== undefined) { sets.push(`currency_base = $${i++}`); values.push(body.currency_base) }
  if (body.business_type !== undefined) { sets.push(`business_type = $${i++}`); values.push(body.business_type) }
  if (body.tax_id !== undefined) { sets.push(`tax_id = $${i++}`); values.push(body.tax_id) }
  if (body.phone !== undefined) { sets.push(`phone = $${i++}`); values.push(body.phone) }
  if (body.address !== undefined) { sets.push(`address = $${i++}`); values.push(body.address) }
  if (body.logo_url !== undefined) { sets.push(`logo_url = $${i++}`); values.push(body.logo_url) }
  if (sets.length === 0) return c.json({ error: 'Nothing to update' }, 400)
  values.push(id, userId)
  const result = await pool.query(
    `UPDATE companies SET ${sets.join(', ')} WHERE id = $${i++} AND owner_id = $${i} RETURNING *`,
    values
  )
  if (result.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(result.rows[0])
})

// DELETE company (owner only)
companies.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  await pool.query('DELETE FROM companies WHERE id = $1 AND owner_id = $2', [id, userId])
  return c.json({ ok: true })
})

// ============================================
// TEAM MEMBERS ROUTES
// ============================================

const InviteBody = z.object({
  telegram_id: z.number().int().positive(),
})

// POST invite team member (owner only)
companies.post('/:companyId/invite', ownerOnly, zValidator('json', InviteBody), async (c) => {
  const { companyId } = c.req.param()
  const body = c.req.valid('json')
  const inviterId = c.get('userId')

  // Find user by telegram_id
  const userResult = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [body.telegram_id])
  if (userResult.rows.length === 0) {
    return c.json({ error: 'User not found. Ask them to start the bot first.' }, 404)
  }
  const targetUserId = userResult.rows[0].id

  // Check if already a team member
  const existingResult = await pool.query(
    'SELECT id FROM team_members WHERE user_id = $1 AND company_id = $2',
    [targetUserId, companyId]
  )
  if (existingResult.rows.length > 0) {
    // Reactivate if inactive
    await pool.query(
      'UPDATE team_members SET active = TRUE, role = $1 WHERE user_id = $2 AND company_id = $3',
      ['staff', targetUserId, companyId]
    )
    return c.json({ message: 'Team member reactivated' })
  }

  // Add as staff
  await pool.query(
    `INSERT INTO team_members (user_id, company_id, role, invited_by, active)
     VALUES ($1, $2, 'staff', $3, TRUE)`,
    [targetUserId, companyId, inviterId]
  )

  return c.json({ message: 'Team member added' }, 201)
})

// GET team members
companies.get('/:companyId/members', teamMember, async (c) => {
  const { companyId } = c.req.param()

  const result = await pool.query(
    `SELECT tm.id, tm.role, tm.active, tm.created_at,
      u.id as user_id, u.name, u.username, u.telegram_id
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.company_id = $1
     ORDER BY tm.created_at ASC`,
    [companyId]
  )

  return c.json(result.rows)
})

// GET my role in company
companies.get('/:companyId/members/me', teamMember, async (c) => {
  const { companyId } = c.req.param()
  const userId = c.get('userId')

  const result = await pool.query(
    `SELECT tm.id, tm.role, tm.active, tm.created_at,
      u.id as user_id, u.name, u.username, u.telegram_id
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.company_id = $1 AND tm.user_id = $2 AND tm.active = TRUE
     LIMIT 1`,
    [companyId, userId]
  )

  if (result.rows.length === 0) {
    return c.json({ error: 'Team member not found' }, 404)
  }

  return c.json(result.rows[0])
})

const UpdateRoleBody = z.object({
  role: z.enum(['owner', 'manager', 'staff']),
})

// PATCH member role (owner only)
companies.patch('/:companyId/members/:userId/role', ownerOnly, zValidator('json', UpdateRoleBody), async (c) => {
  const { companyId, userId } = c.req.param()
  const { role } = c.req.valid('json')
  const currentUserId = c.get('userId')

  // Cannot change own role
  if (userId === currentUserId) {
    return c.json({ error: 'Cannot change your own role' }, 400)
  }

  // Check if target is a team member
  const result = await pool.query(
    `UPDATE team_members
     SET role = $1
     WHERE user_id = $2 AND company_id = $3
     RETURNING *`,
    [role, userId, companyId]
  )

  if (result.rows.length === 0) {
    return c.json({ error: 'Team member not found' }, 404)
  }

  return c.json(result.rows[0])
})

// DELETE remove team member (owner only)
companies.delete('/:companyId/members/:userId', ownerOnly, async (c) => {
  const { companyId, userId } = c.req.param()
  const currentUserId = c.get('userId')

  // Cannot remove yourself
  if (userId === currentUserId) {
    return c.json({ error: 'Cannot remove yourself' }, 400)
  }

  await pool.query(
    'DELETE FROM team_members WHERE user_id = $1 AND company_id = $2',
    [userId, companyId]
  )

  return c.json({ ok: true })
})

// ============================================
// PERIOD LOCKS ROUTES
// ============================================

const LockBody = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
})

// POST lock period (owner only)
companies.post('/:companyId/periods/:period/lock', ownerOnly, async (c) => {
  const { companyId, period } = c.req.param()
  const userId = c.get('userId')

  // Validate period format
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return c.json({ error: 'Invalid period format. Use YYYY-MM' }, 400)
  }

  try {
    await pool.query(
      `INSERT INTO period_locks (company_id, period, locked_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (company_id, period) DO NOTHING`,
      [companyId, period, userId]
    )
    return c.json({ message: `Period ${period} locked` })
  } catch (e) {
    return c.json({ error: 'Failed to lock period' }, 500)
  }
})

// DELETE unlock period (owner only)
companies.delete('/:companyId/periods/:period/lock', ownerOnly, async (c) => {
  const { companyId, period } = c.req.param()

  await pool.query(
    'DELETE FROM period_locks WHERE company_id = $1 AND period = $2',
    [companyId, period]
  )

  return c.json({ message: `Period ${period} unlocked` })
})

// GET all period locks
companies.get('/:companyId/periods/locks', teamMember, async (c) => {
  const { companyId } = c.req.param()

  const result = await pool.query(
    `SELECT pl.*, u.name as locked_by_name
     FROM period_locks pl
     LEFT JOIN users u ON u.id = pl.locked_by
     WHERE pl.company_id = $1
     ORDER BY pl.period DESC`,
    [companyId]
  )

  return c.json(result.rows)
})

export default companies
