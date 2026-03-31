import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'

export interface Category { id: string; name: string; name_km?: string; type: string; icon?: string; is_system?: boolean }

export function useCategories() {
  const companyId = useAuthStore(s => s.companyId)
  const [isLoading, setIsLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])

  const fetch = useCallback(async () => {
    if (!companyId) return
    setIsLoading(true)
    try { setCategories(await api.get<Category[]>(`/${companyId}/categories`) || []) }
    catch (e) { console.error(e) }
    setIsLoading(false)
  }, [companyId])

  useEffect(() => { fetch() }, [fetch])

  const incomeCategories = categories.filter(c => c.type === 'income')
  const expenseCategories = categories.filter(c => c.type === 'expense')

  const create = async (body: any) => { await api.post(`/${companyId}/categories`, body); await fetch() }
  const remove = async (id: string) => { await api.delete(`/${companyId}/categories/${id}`); await fetch() }

  return { isLoading, categories, incomeCategories, expenseCategories, create, remove, refetch: fetch }
}
