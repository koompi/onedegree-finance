import { useState, useEffect, useCallback } from 'react'
import { api, ApiError } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { toast } from '../store/toastStore'

export interface RecurringRule {
  id: string
  type: 'income' | 'expense'
  amount_cents: number
  currency_input: string
  category_id: string | null
  category_name: string | null
  category_icon: string | null
  account_id: string | null
  account_name: string | null
  note: string | null
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  next_run_date: string   // YYYY-MM-DD
  last_run_date: string | null
  active: boolean
}

export function useRecurring() {
  const companyId = useAuthStore(s => s.companyId)
  const [isLoading, setIsLoading] = useState(true)
  const [rules, setRules] = useState<RecurringRule[]>([])

  const fetch = useCallback(async () => {
    if (!companyId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const data = await api.get<RecurringRule[]>(`/${companyId}/recurring`)
      setRules(data || [])
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return
      console.error(e)
      toast.error('Failed to load recurring rules')
    }
    setIsLoading(false)
  }, [companyId])

  useEffect(() => { fetch() }, [fetch])

  const create = async (body: {
    type: 'income' | 'expense'
    amount_cents: number
    currency_input?: string
    category_id?: string
    account_id?: string
    note?: string
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
    start_date: string
  }) => {
    await api.post(`/${companyId}/recurring`, body)
    await fetch()
  }

  const toggle = async (id: string, active: boolean) => {
    await api.patch(`/${companyId}/recurring/${id}`, { active })
    await fetch()
  }

  const remove = async (id: string) => {
    await api.delete(`/${companyId}/recurring/${id}`)
    await fetch()
  }

  const runNow = async (id: string) => {
    const res = await api.post<{ ok: boolean; next_run_date: string }>(`/${companyId}/recurring/${id}/run`, {})
    await fetch()
    return res
  }

  return { isLoading, rules, create, toggle, remove, runNow, refetch: fetch }
}
