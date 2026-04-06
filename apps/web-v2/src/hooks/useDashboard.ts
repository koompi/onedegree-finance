import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'

interface Tx { id: string; type: string; amount_cents: number; category_id?: string; category_name?: string; account_id?: string; account_name?: string; occurred_at: string; description?: string; status?: string }
interface MonthData { month: string; income: number; expense: number }

interface DashboardBundle {
  summary: { income: number; expense: number };
  recent_transactions: Tx[];
  monthly_stats: MonthData[];
  overdue_count: number;
}

const MONTHS_KM = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ']

export function useDashboard() {
  const companyId = useAuthStore(s => s.companyId)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<DashboardBundle>({
    queryKey: ['dashboard', companyId],
    queryFn: () => api.get<DashboardBundle>(`/${companyId}/reports/dashboard-bundle`),
    enabled: !!companyId,
    staleTime: 30_000,
    retry: 2,
  })

  const getMonthLabel = (m: string) => {
    const [, mo] = m.split('-')
    return MONTHS_KM[parseInt(mo) - 1]
  }

  const fetchAll = () => queryClient.invalidateQueries({ queryKey: ['dashboard', companyId] })

  const transactions = data?.recent_transactions || []
  const monthlyData = data?.monthly_stats || []
  const receivablesCount = data?.overdue_count || 0
  const income = data?.summary.income || 0
  const expense = data?.summary.expense || 0
  const report = data ? { income, expense, by_category: [] } : null
  const profitMargin = income > 0 ? Math.round(((income - expense) / income) * 1000) / 10 : 0

  return { isLoading, transactions, report, monthlyData, receivablesCount, income, expense, profitMargin, fetchAll, getMonthLabel }
}
