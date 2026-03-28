import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import pool from '../db/client'

const reports = new Hono()
reports.use('*', authMiddleware)

async function ownsCompany(userId: string, companyId: string): Promise<boolean> {
  const r = await pool.query('SELECT id FROM companies WHERE id = $1 AND owner_id = $2', [companyId, userId])
  return r.rows.length > 0
}

reports.get('/:companyId/reports/monthly', async (c) => {
  const userId = c.get('userId')
  const { companyId } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)
  const month = c.req.query('month') || new Date().toISOString().slice(0, 7)

  const [txResult, accountsResult, receivablesResult, payablesResult] = await Promise.all([
    pool.query(
      `SELECT type, category_id, c.name as category_name, c.name_km as category_name_km,
              SUM(amount_cents) as total_cents
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.company_id = $1 AND to_char(t.occurred_at, 'YYYY-MM') = $2
       GROUP BY t.type, t.category_id, c.name, c.name_km`,
      [companyId, month]
    ),
    pool.query('SELECT * FROM accounts WHERE company_id = $1', [companyId]),
    pool.query(`SELECT COALESCE(SUM(amount_cents), 0) as total FROM receivables WHERE company_id = $1 AND status != 'paid'`, [companyId]),
    pool.query(`SELECT COALESCE(SUM(amount_cents), 0) as total FROM payables WHERE company_id = $1 AND status != 'paid'`, [companyId]),
  ])

  const income = txResult.rows.filter(r => r.type === 'income')
  const expense = txResult.rows.filter(r => r.type === 'expense')
  const totalIncome = income.reduce((s, r) => s + parseInt(r.total_cents), 0)
  const totalExpense = expense.reduce((s, r) => s + parseInt(r.total_cents), 0)

  return c.json({
    month,
    total_income_cents: totalIncome,
    total_expense_cents: totalExpense,
    net_profit_cents: totalIncome - totalExpense,
    income_by_category: income.map(r => ({ category_name: r.category_name, category_name_km: r.category_name_km, amount_cents: parseInt(r.total_cents) })),
    expense_by_category: expense.map(r => ({ category_name: r.category_name, category_name_km: r.category_name_km, amount_cents: parseInt(r.total_cents) })),
    accounts: accountsResult.rows,
    receivables_total_cents: parseInt(receivablesResult.rows[0].total),
    payables_total_cents: parseInt(payablesResult.rows[0].total),
  })
})

export default reports
