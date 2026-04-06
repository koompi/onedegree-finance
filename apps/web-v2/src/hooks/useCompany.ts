import { useState, useEffect, useCallback } from 'react'
import { api, ApiError } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { toast } from '../store/toastStore'

export interface Company {
  id: string; name: string; type?: string; business_type?: string; tax_id?: string; phone?: string; address?: string; logo_url?: string
}

export function useCompany() {
  const companyId = useAuthStore(s => s.companyId)
  const [isLoading, setIsLoading] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null)

  const fetch = useCallback(async () => {
    if (!companyId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const data = await api.get<Company[]>('/companies') || []
      setCompanies(data)
      setCurrentCompany(data.find((c: Company) => c.id === companyId) || null)
    } catch (e) { if (e instanceof ApiError && e.status === 401) return; console.error(e); toast.error('Failed to load company') }
    setIsLoading(false)
  }, [companyId])

  useEffect(() => { fetch() }, [fetch])

  const update = async (id: string, body: any) => { await api.patch(`/${id}`, body); await fetch() }

  return { isLoading, companies, currentCompany, update, refetch: fetch }
}
