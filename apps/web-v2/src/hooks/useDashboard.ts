import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'

interface Tx { id: string; type: string; amount_cents: number; category_id?: string; category_name?: string; account_id?: string; account_name?: string; occurred_at: string; description?: string; status?: string }
interface Report { income: number; expense: number; by_category: Array<{ category_id: string; category_name: string; type: string; total: number }> }
interface MonthData { month: string; income: number; expense: number }

interface DashboardBundle {
  summary: { income: number; expense: number };
  recent_transactions: Tx[];
  monthly_stats: MonthData[];
  overdue_count: number;
}

export function useDashboard() {
  const companyId = useAuthStore(s => s.companyId)
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState<Tx[]>([])
  const [report, setReport] = useState<Report | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([])
  const [receivablesCount, setReceivablesCount] = useState(0)

  const getMonthLabel = (m: string) => { 
    const [, mo] = m.split('-')
    const months = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ']
    return months[parseInt(mo) - 1] 
  }

  const fetchAll = useCallback(async () => {
    if (!companyId) return
    setIsLoading(true)
    try {
      // Single unified API call for dashboard
      const res = await api.get<DashboardBundle>(`/${companyId}/reports/dashboard-bundle`)
      
      setTransactions(res.recent_transactions || [])
      setReport({
        income: res.summary.income,
        expense: res.summary.expense,
        by_category: [] // Simplified for now
      })
      setMonthlyData(res.monthly_stats)
      setReceivablesCount(res.overdue_count)
    } catch (e) { 
      console.error('Dashboard Error:', e) 
    }
    setIsLoading(false)
  }, [companyId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const income = report?.income || 0
  const expense = report?.expense || 0
  const profitMargin = income > 0 ? Math.round(((income - expense) / income) * 1000) / 10 : 0

  return { isLoading, transactions, report, monthlyData, receivablesCount, income, expense, profitMargin, fetchAll, getMonthLabel }
}
