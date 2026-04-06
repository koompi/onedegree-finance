import { useState, useEffect, useCallback } from 'react'
import { api, ApiError } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { toast } from '../store/toastStore'

export interface CashFlowDay {
  day: string
  income: number
  expense: number
  balance: number
}

export function useCashFlow(month?: string) {
  const companyId = useAuthStore(s => s.companyId)
  const [isLoading, setIsLoading] = useState(true)
  const [days, setDays] = useState<CashFlowDay[]>([])
  const [reportMonth, setReportMonth] = useState('')

  const currentMonth = month || new Date().toISOString().slice(0, 7)

  const fetch = useCallback(async () => {
    if (!companyId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const data = await api.get<{ month: string; days: CashFlowDay[] }>(
        `/${companyId}/reports/cashflow?month=${currentMonth}`
      )
      setDays(data.days || [])
      setReportMonth(data.month || currentMonth)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return
      console.error(e)
      toast.error('Failed to load cash flow')
    }
    setIsLoading(false)
  }, [companyId, currentMonth])

  useEffect(() => { fetch() }, [fetch])

  const totalInflow = days.reduce((s, d) => s + d.income, 0)
  const totalOutflow = days.reduce((s, d) => s + d.expense, 0)
  const endBalance = days.length > 0 ? days[days.length - 1].balance : 0

  return { isLoading, days, reportMonth, totalInflow, totalOutflow, endBalance }
}
