import { useState, useEffect, useCallback } from 'react'
import { api, ApiError } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { toast } from '../store/toastStore'

export interface Payable {
  id: string; contact_name: string; amount_cents: number; due_date: string; description?: string; status?: string
}

export function usePayables() {
  const companyId = useAuthStore(s => s.companyId)
  const [isLoading, setIsLoading] = useState(true)
  const [items, setItems] = useState<Payable[]>([])

  const fetch = useCallback(async () => {
    if (!companyId) { setIsLoading(false); return }
    setIsLoading(true)
    try { setItems(await api.get<Payable[]>(`/${companyId}/payables`) || []) }
    catch (e) { if (e instanceof ApiError && e.status === 401) return; console.error(e); toast.error('Failed to load payables') }
    setIsLoading(false)
  }, [companyId])

  useEffect(() => { fetch() }, [fetch])

  const active = items.filter(r => r.status !== 'paid')
  const totalPayable = active.reduce((s, r) => s + r.amount_cents, 0)
  const overdueCount = active.filter(r => new Date(r.due_date) < new Date()).length

  const create = async (body: any) => { await api.post(`/${companyId}/payables`, body); await fetch() }
  const update = async (id: string, body: any) => { await api.patch(`/${companyId}/payables/${id}`, body); await fetch() }
  const remove = async (id: string) => { await api.delete(`/${companyId}/payables/${id}`); await fetch() }

  return { isLoading, items, active, totalPayable, overdueCount, create, update, remove, refetch: fetch }
}
