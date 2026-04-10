import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { teamMember } from '../middleware/rbac'
import { exchangeRateService } from '../services/exchangeRate'
import pool from '../db/client'
import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'

type Variables = { userId: string; companyId?: string; userRole?: 'owner' | 'manager' | 'staff' }
const reports = new Hono<{ Variables: Variables }>()
reports.use('*', authMiddleware)

async function ownsCompany(userId: string, companyId: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT id FROM companies WHERE id = $1 AND owner_id = $2
     UNION ALL
     SELECT tm.company_id FROM team_members tm
     WHERE tm.company_id = $1 AND tm.user_id = $2 AND tm.role = 'owner' AND tm.active = TRUE`,
    [companyId, userId]
  )
  return r.rows.length > 0
}

// GET monthly report with dual currency support
reports.get('/:companyId/reports/monthly', teamMember, async (c) => {
  const { companyId } = c.req.param()
  const month = c.req.query('month') || new Date().toISOString().slice(0, 7)
  const currency = c.req.query('currency') || 'USD'

  const [txResult, accountsResult, receivablesResult, payablesResult] = await Promise.all([
    pool.query(
      `SELECT t.type, t.category_id, c.name as category_name, c.name_km as category_name_km,
              SUM(t.amount_cents)::BIGINT as total_cents,
              COALESCE(SUM(t.amount_khr), 0)::BIGINT as total_khr
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
  const totalIncomeUSD = income.reduce((s, r) => s + parseInt(r.total_cents), 0)
  const totalExpenseUSD = expense.reduce((s, r) => s + parseInt(r.total_cents), 0)
  const totalIncomeKHR = income.reduce((s, r) => s + parseInt(r.total_khr), 0)
  const totalExpenseKHR = expense.reduce((s, r) => s + parseInt(r.total_khr), 0)

  // Return amounts based on currency param
  const totalIncome = currency === 'KHR' ? totalIncomeKHR : totalIncomeUSD
  const totalExpense = currency === 'KHR' ? totalExpenseKHR : totalExpenseUSD

  return c.json({
    month,
    currency,
    total_income_cents: totalIncome,
    total_expense_cents: totalExpense,
    total_income_usd: totalIncomeUSD,
    total_expense_usd: totalExpenseUSD,
    total_income_khr: totalIncomeKHR,
    total_expense_khr: totalExpenseKHR,
    net_profit_cents: totalIncome - totalExpense,
    income_by_category: income.map(r => ({
      category_name: r.category_name,
      category_name_km: r.category_name_km,
      amount_cents: currency === 'KHR' ? parseInt(r.total_khr) : parseInt(r.total_cents),
      amount_usd: parseInt(r.total_cents),
      amount_khr: parseInt(r.total_khr)
    })),
    expense_by_category: expense.map(r => ({
      category_name: r.category_name,
      category_name_km: r.category_name_km,
      amount_cents: currency === 'KHR' ? parseInt(r.total_khr) : parseInt(r.total_cents),
      amount_usd: parseInt(r.total_cents),
      amount_khr: parseInt(r.total_khr)
    })),
    accounts: accountsResult.rows,
    receivables_total_cents: parseInt(receivablesResult.rows[0].total),
    payables_total_cents: parseInt(payablesResult.rows[0].total),
  })
})

// GET dashboard bundle
reports.get('/:companyId/reports/dashboard-bundle', teamMember, async (c) => {
  const { companyId } = c.req.param()

  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7)

  const months = []
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(d.toISOString().slice(0, 7))
  }

  const [txRecent, currentReport, historicalReports, receivables] = await Promise.all([
    pool.query(
      `SELECT t.*, c.name as category_name, c.name_km as category_name_km, a.name as account_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN accounts a ON t.account_id = a.id
       WHERE t.company_id = $1
       ORDER BY t.occurred_at DESC LIMIT 15`,
      [companyId]
    ),
    pool.query(
      `SELECT type, SUM(amount_cents)::BIGINT as total FROM transactions
       WHERE company_id = $1 AND occurred_at >= ($2 || '-01')::DATE
       AND occurred_at < (($2 || '-01')::DATE + INTERVAL '1 month')
       GROUP BY type`,
      [companyId, currentMonth]
    ),
    pool.query(
      `SELECT to_char(occurred_at, 'YYYY-MM') as month, type, SUM(amount_cents)::BIGINT as total
       FROM transactions
       WHERE company_id = $1 AND occurred_at >= ($2 || '-01')::DATE
       GROUP BY 1, 2 ORDER BY 1 DESC`,
      [companyId, months[2]]
    ),
    pool.query(`SELECT COUNT(*)::INT as count FROM receivables WHERE company_id = $1 AND status != 'paid' AND due_date < NOW()`, [companyId]),
  ])

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

// GET cashflow
reports.get('/:companyId/reports/cashflow', teamMember, async (c) => {
  const { companyId } = c.req.param()
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

  const dayMap: Record<string, { income: number; expense: number }> = {}
  for (const row of result.rows) {
    if (!dayMap[row.day]) dayMap[row.day] = { income: 0, expense: 0 }
    dayMap[row.day][row.type as 'income' | 'expense'] = parseInt(row.total)
  }

  let running = 0
  const days = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, d]) => {
      running += d.income - d.expense
      return { day, income: d.income, expense: d.expense, balance: running }
    })

  return c.json({ month, days })
})

// Export request schema
const ExportBody = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  type: z.enum(['excel', 'pdf']).default('excel'),
})

// POST enhanced export endpoint
reports.post(
  '/:companyId/reports/export',
  teamMember,
  zValidator('json', ExportBody.partial()),
  async (c) => {
    const userId = c.get('userId')
    const { companyId } = c.req.param()
    const body = c.req.valid('json') as any

    const month = body.month || new Date().toISOString().slice(0, 7)
    const format = body.type || 'excel'

    // Fetch company info
    const companyResult = await pool.query('SELECT * FROM companies WHERE id = $1', [companyId])
    const company = companyResult.rows[0]

    // Fetch all data needed for export
    const [txResult, txDetailResult, receivablesResult, payablesResult] = await Promise.all([
      // Summary by category
      pool.query(
        `SELECT t.type, c.name as category_name, c.name_km as category_name_km,
                SUM(t.amount_cents)::BIGINT as total_cents,
                COALESCE(SUM(t.amount_khr), 0)::BIGINT as total_khr
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.company_id = $1 AND t.occurred_at >= ($2 || '-01')::DATE
           AND t.occurred_at < (($2 || '-01')::DATE + INTERVAL '1 month')
         GROUP BY t.type, c.name, c.name_km`,
        [companyId, month]
      ),
      // Transaction details
      pool.query(
        `SELECT t.occurred_at, t.type, t.note, t.amount_cents, t.amount_khr,
                c.name as category_name, a.name as account_name
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         LEFT JOIN accounts a ON t.account_id = a.id
         WHERE t.company_id = $1 AND t.occurred_at >= ($2 || '-01')::DATE
           AND t.occurred_at < (($2 || '-01')::DATE + INTERVAL '1 month')
         ORDER BY t.occurred_at ASC`,
        [companyId, month]
      ),
      // Receivables aging
      pool.query(
        `SELECT contact_name, amount_cents, currency, due_date, status
         FROM receivables
         WHERE company_id = $1 AND status != 'paid'
         ORDER BY due_date ASC`,
        [companyId]
      ),
      // Payables aging
      pool.query(
        `SELECT contact_name, amount_cents, currency, due_date, status
         FROM payables
         WHERE company_id = $1 AND status != 'paid'
         ORDER BY due_date ASC`,
        [companyId]
      ),
    ])

    const income = txResult.rows.filter(r => r.type === 'income')
    const expense = txResult.rows.filter(r => r.type === 'expense')
    const totalIncomeUSD = income.reduce((s, r) => s + parseInt(r.total_cents), 0)
    const totalExpenseUSD = expense.reduce((s, r) => s + parseInt(r.total_cents), 0)
    const totalIncomeKHR = income.reduce((s, r) => s + parseInt(r.total_khr), 0)
    const totalExpenseKHR = expense.reduce((s, r) => s + parseInt(r.total_khr), 0)
    const profitUSD = totalIncomeUSD - totalExpenseUSD
    const profitKHR = totalIncomeKHR - totalExpenseKHR

    let buffer: Buffer
    let filename = `Report_${company?.name || 'Company'}_${month}`
    let mimeType = ''

    if (format === 'excel') {
      filename += '.xlsx'
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      const workbook = new ExcelJS.Workbook()

      // Sheet 1: P&L Summary
      const plSheet = workbook.addWorksheet('P&L Summary')
      plSheet.columns = [
        { header: 'Item', key: 'item', width: 30 },
        { header: 'USD ($)', key: 'usd', width: 15 },
        { header: 'KHR (៛)', key: 'khr', width: 20 },
      ]
      plSheet.addRows([
        ['Company', company?.name || ''],
        ['Period', month],
        ['Generated', new Date().toLocaleString()],
        [],
        ['Revenue / Income', totalIncomeUSD / 100, totalIncomeKHR / 100],
        ['Total Expenses', totalExpenseUSD / 100, totalExpenseKHR / 100],
        ['Net Profit', profitUSD / 100, profitKHR / 100],
      ])

      // Sheet 2: Transactions
      const txSheet = workbook.addWorksheet('Transactions')
      txSheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Description', key: 'desc', width: 25 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Account', key: 'account', width: 15 },
        { header: 'USD ($)', key: 'usd', width: 12 },
        { header: 'KHR (៛)', key: 'khr', width: 15 },
        { header: 'Type', key: 'type', width: 10 },
      ]
      txDetailResult.rows.forEach(r => {
        txSheet.addRow({
          date: new Date(r.occurred_at).toLocaleDateString(),
          desc: r.note || '-',
          category: r.category_name || '-',
          account: r.account_name || '-',
          usd: r.amount_cents / 100,
          khr: (r.amount_khr || 0) / 100,
          type: r.type,
        })
      })

      // Sheet 3: Income by Category
      const incomeSheet = workbook.addWorksheet('Income by Category')
      incomeSheet.columns = [
        { header: 'Category', key: 'category', width: 25 },
        { header: 'USD ($)', key: 'usd', width: 15 },
        { header: 'KHR (៛)', key: 'khr', width: 20 },
      ]
      income.forEach(r => {
        incomeSheet.addRow({
          category: r.category_name || 'Unknown',
          usd: parseInt(r.total_cents) / 100,
          khr: parseInt(r.total_khr) / 100,
        })
      })
      incomeSheet.addRow(['Total Income', totalIncomeUSD / 100, totalIncomeKHR / 100])

      // Sheet 4: Expense by Category
      const expenseSheet = workbook.addWorksheet('Expense by Category')
      expenseSheet.columns = [
        { header: 'Category', key: 'category', width: 25 },
        { header: 'USD ($)', key: 'usd', width: 15 },
        { header: 'KHR (៛)', key: 'khr', width: 20 },
      ]
      expense.forEach(r => {
        expenseSheet.addRow({
          category: r.category_name || 'Unknown',
          usd: parseInt(r.total_cents) / 100,
          khr: parseInt(r.total_khr) / 100,
        })
      })
      expenseSheet.addRow(['Total Expense', totalExpenseUSD / 100, totalExpenseKHR / 100])

      // Sheet 5: Receivables Aging
      const recSheet = workbook.addWorksheet('Receivables')
      recSheet.columns = [
        { header: 'Contact', key: 'contact', width: 20 },
        { header: 'Amount', key: 'amount', width: 12 },
        { header: 'Currency', key: 'currency', width: 10 },
        { header: 'Due Date', key: 'due_date', width: 15 },
        { header: 'Status', key: 'status', width: 10 },
        { header: 'Days Overdue', key: 'days_overdue', width: 12 },
      ]
      const today = new Date()
      receivablesResult.rows.forEach(r => {
        const dueDate = new Date(r.due_date)
        const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
        recSheet.addRow({
          contact: r.contact_name,
          amount: r.amount_cents / 100,
          currency: r.currency,
          due_date: dueDate.toLocaleDateString(),
          status: r.status,
          days_overdue: daysOverdue || '',
        })
      })

      // Sheet 6: Payables Aging
      const paySheet = workbook.addWorksheet('Payables')
      paySheet.columns = [
        { header: 'Contact', key: 'contact', width: 20 },
        { header: 'Amount', key: 'amount', width: 12 },
        { header: 'Currency', key: 'currency', width: 10 },
        { header: 'Due Date', key: 'due_date', width: 15 },
        { header: 'Status', key: 'status', width: 10 },
        { header: 'Days Overdue', key: 'days_overdue', width: 12 },
      ]
      payablesResult.rows.forEach(r => {
        const dueDate = new Date(r.due_date)
        const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
        paySheet.addRow({
          contact: r.contact_name,
          amount: r.amount_cents / 100,
          currency: r.currency,
          due_date: dueDate.toLocaleDateString(),
          status: r.status,
          days_overdue: daysOverdue || '',
        })
      })

      buffer = Buffer.from(await workbook.xlsx.writeBuffer())
    } else {
      filename += '.pdf'
      mimeType = 'application/pdf'

      buffer = await new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'LETTER' })
        const chunks: Buffer[] = []

        doc.on('data', chunk => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', err => reject(err))

        // Header
        doc.fontSize(20).text(company?.name || 'Company Report', { align: 'center' })
        doc.fontSize(14).text(`Financial Report - ${month}`, { align: 'center' })
        doc.moveDown()

        // P&L Summary
        doc.fontSize(16).text('Profit & Loss Summary', { underline: true })
        doc.fontSize(12)
        doc.text(`Total Income: $${(totalIncomeUSD / 100).toFixed(2)} / ៛${(totalIncomeKHR / 100).toLocaleString()}`)
        doc.text(`Total Expense: $${(totalExpenseUSD / 100).toFixed(2)} / ៛${(totalExpenseKHR / 100).toLocaleString()}`)
        doc.text(`Net Profit: $${(profitUSD / 100).toFixed(2)} / ៛${(profitKHR / 100).toLocaleString()}`)
        doc.moveDown()

        // Top 5 Income Categories
        doc.fontSize(16).text('Top Income Sources', { underline: true })
        doc.fontSize(12)
        const topIncome = [...income].sort((a, b) => parseInt(b.total_cents) - parseInt(a.total_cents)).slice(0, 5)
        topIncome.forEach((r, i) => {
          doc.text(`${i + 1}. ${r.category_name || 'Unknown'}: $${(parseInt(r.total_cents) / 100).toFixed(2)}`)
        })
        doc.moveDown()

        // Top 5 Expense Categories
        doc.fontSize(16).text('Top Expense Categories', { underline: true })
        doc.fontSize(12)
        const topExpense = [...expense].sort((a, b) => parseInt(b.total_cents) - parseInt(a.total_cents)).slice(0, 5)
        topExpense.forEach((r, i) => {
          doc.text(`${i + 1}. ${r.category_name || 'Unknown'}: $${(parseInt(r.total_cents) / 100).toFixed(2)}`)
        })
        doc.moveDown()

        // Receivables Summary
        doc.fontSize(16).text('Receivables Summary', { underline: true })
        doc.fontSize(12)
        const totalReceivables = receivablesResult.rows.reduce((s, r) => s + parseInt(r.amount_cents), 0)
        doc.text(`Total Outstanding: $${(totalReceivables / 100).toFixed(2)}`)
        doc.text(`Total Count: ${receivablesResult.rows.length}`)
        doc.moveDown()

        // Payables Summary
        doc.fontSize(16).text('Payables Summary', { underline: true })
        doc.fontSize(12)
        const totalPayables = payablesResult.rows.reduce((s, r) => s + parseInt(r.amount_cents), 0)
        doc.text(`Total Outstanding: $${(totalPayables / 100).toFixed(2)}`)
        doc.text(`Total Count: ${payablesResult.rows.length}`)
        doc.moveDown()

        // Footer
        doc.fontSize(10).text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' })

        doc.end()
      })
    }

    // Send via Telegram
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (token) {
      const userResult = await pool.query('SELECT telegram_id FROM users WHERE id = $1', [userId])
      const tgId = userResult.rows[0]?.telegram_id

      if (!tgId) {
        return c.json({ error: 'User does not have a telegram ID attached' }, 400)
      }

      const formData = new FormData()
      formData.append('chat_id', tgId.toString())
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
  }
)

export default reports
