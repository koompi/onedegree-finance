import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import pool from '../db/client'
import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'

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

/**
 * Cash flow — daily income vs expense timeline
 * GET /companies/:companyId/reports/cashflow?month=YYYY-MM
 */
reports.get('/:companyId/reports/cashflow', async (c) => {
  const userId = c.get('userId')
  const { companyId } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)

  const month = c.req.query('month') || new Date().toISOString().slice(0, 7)

  const result = await pool.query(
    `SELECT
       to_char(occurred_at, 'YYYY-MM-DD') as day,
       type,
       SUM(amount_cents)::BIGINT as total
     FROM transactions
     WHERE company_id = $1
       AND occurred_at >= ($2 || '-01')::DATE
       AND occurred_at < (($2 || '-01')::DATE + INTERVAL '1 month')
     GROUP BY 1, 2
     ORDER BY 1 ASC`,
    [companyId, month]
  )

  // Build unified day list
  const dayMap: Record<string, { income: number; expense: number }> = {}
  for (const row of result.rows) {
    if (!dayMap[row.day]) dayMap[row.day] = { income: 0, expense: 0 }
    dayMap[row.day][row.type as 'income' | 'expense'] = parseInt(row.total)
  }

  // Running balance
  let running = 0
  const days = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, d]) => {
      running += d.income - d.expense
      return { day, income: d.income, expense: d.expense, balance: running }
    })

  return c.json({ month, days })
})

reports.post('/:companyId/reports/export', async (c) => {
  const userId = c.get('userId')
  const { companyId } = c.req.param()
  const month = c.req.query('month') || new Date().toISOString().slice(0, 7)
  const format = c.req.query('type') as 'excel' | 'pdf' || 'excel'

  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)

  const [txResult] = await Promise.all([
    pool.query(
      `SELECT t.type, t.category_id, c.name as category_name, c.name_km as category_name_km, SUM(t.amount_cents)::BIGINT as total_cents
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.company_id = $1 AND t.occurred_at >= ($2 || '-01')::DATE 
         AND t.occurred_at < (($2 || '-01')::DATE + INTERVAL '1 month')
       GROUP BY t.type, t.category_id, c.name, c.name_km`,
      [companyId, month]
    )
  ])

  const income = txResult.rows.filter(r => r.type === 'income')
  const expense = txResult.rows.filter(r => r.type === 'expense')
  const totalIncome = income.reduce((s, r) => s + parseInt(r.total_cents), 0)
  const totalExpense = expense.reduce((s, r) => s + parseInt(r.total_cents), 0)
  const profit = totalIncome - totalExpense

  let buffer: Buffer
  let filename = `Report_${month}`
  let mimeType = ''

  if (format === 'excel') {
    filename += '.xlsx'
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet(`Financial Report`)
    
    sheet.columns = [
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Category', key: 'category', width: 25 },
      { header: 'Amount Cents', key: 'amount', width: 20 },
    ]

    sheet.addRow(['Income', 'Total Income', totalIncome])
    income.forEach(row => {
      sheet.addRow(['Income', row.category_name || 'Unknown', parseInt(row.total_cents)])
    })
    
    sheet.addRow([])
    sheet.addRow(['Expense', 'Total Expense', totalExpense])
    expense.forEach(row => {
      sheet.addRow(['Expense', row.category_name || 'Unknown', parseInt(row.total_cents)])
    })

    sheet.addRow([])
    sheet.addRow(['Net Profit', '', profit])

    buffer = Buffer.from(await workbook.xlsx.writeBuffer())
  } else {
    filename += '.pdf'
    mimeType = 'application/pdf'
    
    buffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 })
      const chunks: Buffer[] = []
      
      doc.on('data', chunk => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', err => reject(err))

      doc.fontSize(20).text(`Financial Report - ${month}`, { align: 'center' })
      doc.moveDown()

      doc.fontSize(14).text(`Total Income: ${totalIncome / 100}`, { align: 'left' })
      doc.text(`Total Expense: ${totalExpense / 100}`)
      doc.text(`Net Profit: ${profit / 100}`)
      doc.moveDown()

      doc.fontSize(16).text('Income Breakdown', { underline: true })
      doc.fontSize(12)
      income.forEach(row => {
        doc.text(`${row.category_name || 'Unknown'}: ${parseInt(row.total_cents) / 100}`)
      })
      doc.moveDown()

      doc.fontSize(16).text('Expense Breakdown', { underline: true })
      doc.fontSize(12)
      expense.forEach(row => {
        doc.text(`${row.category_name || 'Unknown'}: ${parseInt(row.total_cents) / 100}`)
      })

      doc.end()
    })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (token) {
    const formData = new FormData()
    formData.append('chat_id', userId)
    formData.append('document', new Blob([buffer], { type: mimeType }), filename)
    
    const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      body: formData as any
    })
    
    if (!response.ok) {
       console.error("Telegram bot API error:", await response.text())
       return c.json({ error: 'Failed to send to Telegram' }, 500)
    }
  } else {
    return c.json({ error: 'Telegram bot token not configured' }, 500)
  }

  return c.json({ success: true, message: 'Report delivered to your chat' })
})

export default reports
