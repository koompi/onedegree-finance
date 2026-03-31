import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { getTelegram } from '../lib/telegram'

export function useAuth() {
  const { token, setAuth, companyId } = useAuthStore()
  const [isLoading, setIsLoading] = useState(!token)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token) return
    const tg = getTelegram()
    const initData = tg?.initData
    if (!initData) { setIsLoading(false); return }

    api.post<{ token: string; user: any; company: any }>('/auth/telegram', { initData })
      .then(res => { setAuth(res.token, res.company.id, res.company.name) })
      .catch(err => { setError(err.message); setIsLoading(false) })
  }, [])

  return { isLoading, isAuthenticated: !!token, error }
}
