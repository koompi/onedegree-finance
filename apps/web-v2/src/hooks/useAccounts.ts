import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { toast } from '../store/toastStore'

export interface Account { id: string; name: string; type?: string; account_number?: string; balance: number }

export function useAccounts() {
  const companyId = useAuthStore(s => s.companyId)
  const [isLoading, setIsLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])

  const fetch = useCallback(async () => {
    if (!companyId) { setIsLoading(false); return }
    setIsLoading(true)
    try { setAccounts(await api.get<Account[]>(`/${companyId}/accounts`) || []) }
    catch (e) { console.error(e); toast.error('Failed to load accounts') }
    setIsLoading(false)
  }, [companyId])

  useEffect(() => { fetch() }, [fetch])

  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0)

  const create = async (body: any) => { await api.post(`/${companyId}/accounts`, body); await fetch() }
  const update = async (id: string, body: any) => { await api.patch(`/${companyId}/accounts/${id}`, body); await fetch() }
  const remove = async (id: string) => { await api.delete(`/${companyId}/accounts/${id}`); await fetch() }

  return { isLoading, accounts, totalBalance, create, update, remove, refetch: fetch }
}
