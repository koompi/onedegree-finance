import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'

export interface Receivable {
  id: string; contact_name: string; amount_cents: number; due_date: string; description?: string; status?: string; phone?: string
}

export function useReceivables() {
  const companyId = useAuthStore(s => s.companyId)
  const [isLoading, setIsLoading] = useState(true)
  const [items, setItems] = useState<Receivable[]>([])

  const fetch = useCallback(async () => {
    if (!companyId) return
    setIsLoading(true)
    try { setItems(await api.get<Receivable[]>(`/${companyId}/receivables`) || []) }
    catch (e) { console.error(e) }
    setIsLoading(false)
  }, [companyId])

  useEffect(() => { fetch() }, [fetch])

  const active = items.filter(r => r.status !== 'collected')
  const totalOwed = active.reduce((s, r) => s + r.amount_cents, 0)
  const overdueCount = active.filter(r => new Date(r.due_date) < new Date()).length

  const create = async (body: any) => { await api.post(`/${companyId}/receivables`, body); await fetch() }
  const update = async (id: string, body: any) => { await api.patch(`/${companyId}/receivables/${id}`, body); await fetch() }
  const remove = async (id: string) => { await api.delete(`/${companyId}/receivables/${id}`); await fetch() }
  const collect = async (id: string) => { await update(id, { status: 'collected' }) }

  return { isLoading, items, active, totalOwed, overdueCount, create, update, remove, collect, refetch: fetch }
}
