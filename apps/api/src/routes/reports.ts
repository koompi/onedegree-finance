import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import pool from '../db/client'

type Variables = { userId: string; companyId?: string }
const reports = new Hono<{ Variables: Variables }>()
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

  // Use a optimized single query for balances to reduce DB roundtrips
  const [txResult, accountsResult, receivablesResult, payablesResult] = await Promise.all([
    pool.query(
      `SELECT t.type, t.category_id, c.name as category_name, c.name_km as category_name_km,
              SUM(t.amount_cents)::BIGINT as total_cents
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.company_id = $1 AND t.occurred_at >= ($2 || '-01')::DATE 
         AND t.occurred_at < (($2 || '-01')::DATE + INTERVAL '1 month')
       GROUP BY t.type, t.category_id, c.name, c.name_km`,
      [companyId, month]
    ),
    pool.query('SELECT id, name, type, balance_cents FROM accounts WHERE company_id = $1', [companyId]),
    pool.query(`SELECT COALESCE(SUM(amount_cents), 0)::BIGINT as total FROM receivables WHERE company_id = $1 AND status != 'paid'`, [companyId]),
    pool.query(`SELECT COALESCE(SUM(amount_cents), 0)::BIGINT as total FROM payables WHERE company_id = $1 AND status != 'paid'`, [companyId]),
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

reports.get('/:companyId/reports/dashboard-bundle', async (c) => {
  const userId = c.get('userId')
  const { companyId } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)

  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7)
  
  // Get last 3 months including current
  const months = []
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(d.toISOString().slice(0, 7))
  }

  const [txRecent, currentReport, historicalReports, receivables] = await Promise.all([
    // 1. Recent transactions (Limit 15 for dashboard)
    pool.query(
      `SELECT t.*, c.name as category_name, c.name_km as category_name_km, a.name as account_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN accounts a ON t.account_id = a.id
       WHERE t.company_id = $1
       ORDER BY t.occurred_at DESC LIMIT 15`,
      [companyId]
    ),
    // 2. Current month summary
    pool.query(
      `SELECT type, SUM(amount_cents)::BIGINT as total FROM transactions 
       WHERE company_id = $1 AND occurred_at >= ($2 || '-01')::DATE 
       AND occurred_at < (($2 || '-01')::DATE + INTERVAL '1 month')
       GROUP BY type`,
      [companyId, currentMonth]
    ),
    // 3. Historical data for bars (last 3 months)
    pool.query(
      `SELECT to_char(occurred_at, 'YYYY-MM') as month, type, SUM(amount_cents)::BIGINT as total 
       FROM transactions 
       WHERE company_id = $1 AND occurred_at >= ($2 || '-01')::DATE
       GROUP BY 1, 2 ORDER BY 1 DESC`,
      [companyId, months[2]]
    ),
    // 4. Critical alerts
    pool.query(`SELECT COUNT(*)::INT as count FROM receivables WHERE company_id = $1 AND status != 'paid' AND due_date < NOW()`, [companyId])
  ])

  // Process historical data into clean month objects
  const monthlyData = months.map(m => {
    const rows = historicalReports.rows.filter(r => r.month === m)
    return {
      month: m,
      income: parseInt(rows.find(r => r.type === 'income')?.total || '0'),
      expense: parseInt(rows.find(r => r.type === 'expense')?.total || '0')
    }
  }).reverse()

  const currentSummary = {
    income: parseInt(currentReport.rows.find(r => r.type === 'income')?.total || '0'),
    expense: parseInt(currentReport.rows.find(r => r.type === 'expense')?.total || '0')
  }

  return c.json({
    summary: currentSummary,
    recent_transactions: txRecent.rows,
    monthly_stats: monthlyData,
    overdue_count: receivables.rows[0].count
  })
})

export default reports
