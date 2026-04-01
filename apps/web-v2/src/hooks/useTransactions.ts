import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { toast } from '../store/toastStore'

export interface Transaction {
  id: string; type: string; amount_cents: number; category_id?: string; category_name?: string
  account_id?: string; account_name?: string; occurred_at: string; description?: string; note?: string
  receipt_url?: string | null
}

export function useTransactions(month?: string, type?: string) {
  const companyId = useAuthStore(s => s.companyId)
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const fetch = useCallback(async () => {
    if (!companyId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (month) params.set('month', month)
      if (type && type !== 'all') params.set('type', type)
      params.set('limit', '100')
      const data = await api.get<Transaction[]>(`/${companyId}/transactions?${params}`)
      setTransactions(data || [])
    } catch (e) { console.error(e); toast.error('Failed to load transactions') }
    setIsLoading(false)
  }, [companyId, month, type])

  useEffect(() => { fetch() }, [fetch])

  const create = async (body: Partial<Transaction>) => {
    await api.post(`/${companyId}/transactions`, body)
    await fetch()
  }

  const update = async (id: string, body: Partial<Transaction>) => {
    await api.patch(`/${companyId}/transactions/${id}`, body)
    await fetch()
  }

  const remove = async (id: string) => {
    await api.delete(`/${companyId}/transactions/${id}`)
    await fetch()
  }

  return { isLoading, transactions, create, update, remove, refetch: fetch }
}
