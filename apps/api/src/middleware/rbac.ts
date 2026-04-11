import { createMiddleware } from 'hono/factory'
import { Context } from 'hono'
import pool from '../db/client'

type UserRole = 'owner' | 'admin' | 'manager' | 'staff'

interface TeamMember {
  id: string
  user_id: string
  company_id: string
  role: UserRole
  active: boolean
}

/**
 * Get user's role in a company
 */
async function getUserRole(userId: string, companyId: string): Promise<UserRole | null> {
  // Check team_members first, fallback to companies.owner_id so that
  // owners of companies created before RBAC was enforced still get access.
  const result = await pool.query(
    `SELECT COALESCE(
      (SELECT role FROM team_members WHERE user_id = $1 AND company_id = $2 AND active = TRUE),
      (SELECT 'owner' FROM companies WHERE id = $2 AND owner_id = $1)
    ) AS role`,
    [userId, companyId]
  )
  return result.rows[0]?.role as UserRole | null || null
}

/**
 * Check if user is member of company
 */
async function isTeamMember(userId: string, companyId: string): Promise<boolean> {
  const role = await getUserRole(userId, companyId)
  return role !== null
}

/**
 * RBAC middleware factory
 * Checks if user has required role in company
 *
 * Role permissions:
 * - owner: all CRUD operations
 * - manager: create + read, no delete
 * - staff: create + read own records only, no delete
 */
export function checkTeamRole(allowedRoles: UserRole[]) {
  return createMiddleware<{
    Variables: { userId: string; companyId?: string; userRole?: UserRole }
  }>(async (c, next) => {
    const userId = c.get('userId')
    const companyId = c.req.param('companyId') || c.get('companyId')

    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400)
    }

    const role = await getUserRole(userId, companyId)

    if (!role) {
      return c.json({ error: 'Not a team member' }, 403)
    }

    if (!allowedRoles.includes(role)) {
      return c.json({ error: 'Insufficient permissions' }, 403)
    }

    // Store role for downstream handlers
    c.set('userRole', role)
    await next()
  })
}

/**
 * Owner-only middleware (e.g. delete company)
 */
export const ownerOnly = checkTeamRole(['owner'])

/**
 * Admin or owner middleware (e.g. delete members, lock periods, delete accounts)
 * Admin has full access except deleting the company itself
 */
export const adminOrOwner = checkTeamRole(['owner', 'admin'])

/**
 * Manager, admin, or owner middleware (create/edit, no delete for managers)
 */
export const managerOrOwner = checkTeamRole(['owner', 'admin', 'manager'])

/**
 * Any team member middleware (owner, admin, manager, or staff)
 */
export const teamMember = checkTeamRole(['owner', 'admin', 'manager', 'staff'])

/**
 * Check if user owns company (legacy - for backwards compatibility)
 * This checks both owner_id in companies table and role in team_members
 */
export async function ownsCompany(userId: string, companyId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT id FROM companies WHERE id = $1 AND owner_id = $2
     UNION ALL
     SELECT tm.company_id FROM team_members tm
     WHERE tm.company_id = $1 AND tm.user_id = $2 AND tm.role = 'owner' AND tm.active = TRUE`,
    [companyId, userId]
  )
  return result.rows.length > 0
}

export { getUserRole, isTeamMember }
export type { TeamMember, UserRole }
