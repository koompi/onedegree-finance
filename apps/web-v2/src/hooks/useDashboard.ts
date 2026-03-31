import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'

interface Tx { id: string; type: string; amount_cents: number; category_id?: string; category_name?: string; account_id?: string; account_name?: string; occurred_at: string; description?: string; status?: string }
interface Report { income: number; expense: number; by_category: Array<{ category_id: string; category_name: string; type: string; total: number }> }
interface MonthData { month: string; income: number; expense: number }

export function useDashboard() {
  const companyId = useAuthStore(s => s.companyId)
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState<Tx[]>([])
  const [report, setReport] = useState<Report | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([])
  const [receivablesCount, setReceivablesCount] = useState(0)

  const currentMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
  const getMonthLabel = (m: string) => { const [y, mo] = m.split('-'); const months = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ']; return months[parseInt(mo) - 1] }

  const fetchAll = useCallback(async () => {
    if (!companyId) return
    setIsLoading(true)
    try {
      const [txRes, rptRes, recRes] = await Promise.all([
        api.get<Tx[]>(`/${companyId}/transactions?month=${currentMonth()}&limit=100`),
        api.get<Report>(`/${companyId}/reports/monthly?month=${currentMonth()}`).catch(() => null),
        api.get<any[]>(`/${companyId}/receivables`).catch(() => []),
      ])
      setTransactions(txRes || [])
      setReport(rptRes)
      setReceivablesCount((recRes || []).filter((r: any) => r.status !== 'collected' && new Date(r.due_date) < new Date()).length)

      // Last 2 months for bars
      const d = new Date()
      const prev = []
      for (let i = 1; i <= 2; i++) {
        const pd = new Date(d.getFullYear(), d.getMonth() - i, 1)
        const pm = `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, '0')}`
        try {
          const mr = await api.get<Report>(`/${companyId}/reports/monthly?month=${pm}`)
          prev.push({ month: pm, income: mr.income || 0, expense: mr.expense || 0 })
        } catch { prev.push({ month: pm, income: 0, expense: 0 }) }
      }
      setMonthlyData([...prev.reverse(), { month: currentMonth(), income: rptRes?.income || 0, expense: rptRes?.expense || 0 }])
    } catch (e) { console.error(e) }
    setIsLoading(false)
  }, [companyId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const income = report?.income || 0
  const expense = report?.expense || 0
  const profitMargin = income > 0 ? Math.round(((income - expense) / income) * 1000) / 10 : 0

  return { isLoading, transactions, report, monthlyData, receivablesCount, income, expense, profitMargin, fetchAll, getMonthLabel }
}
