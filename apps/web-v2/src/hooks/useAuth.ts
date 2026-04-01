import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { getTelegram } from '../lib/telegram'

export function useAuth() {
  const { token, setAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(!token)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (token) { setIsLoading(false); return }

    const tg = getTelegram()
    
    // Wait for Telegram SDK to be ready (up to 3 seconds)
    if (!tg) {
      if (retryCount < 10) {
        const t = setTimeout(() => setRetryCount(c => c + 1), 300)
        return () => clearTimeout(t)
      }
      // No Telegram SDK at all after 3s — show error
      setError('សូមបើកតាម Telegram')
      setIsLoading(false)
      return
    }

    // Telegram SDK found — try to get initData
    const initData = tg.initData

    if (!initData) {
      // initData might not be ready yet, retry
      if (retryCount < 10) {
        const t = setTimeout(() => setRetryCount(c => c + 1), 300)
        return () => clearTimeout(t)
      }
      // SDK loaded but no initData — might be a direct browser open
      // Try using user data from initDataUnsafe as fallback
      const user = tg.initDataUnsafe?.user
      if (user) {
        // Construct a fake initData string for the fallback auth endpoint
        const params = new URLSearchParams()
        params.set('user', JSON.stringify(user))
        params.set('auth_date', String(Math.floor(Date.now() / 1000)))
        api.post<{ token: string; refreshToken?: string; user: any; company: any }>('/auth/telegram', { initData: params.toString() })
          .then(res => { setAuth(res.token, res.company?.id ?? '', res.company?.name ?? '', res.refreshToken) })
          .catch(err => { setError(err.message) })
          .finally(() => setIsLoading(false))
      } else {
        setError('សូមបើកតាម Telegram')
        setIsLoading(false)
      }
      return
    }

    // Got initData — authenticate
    api.post<{ token: string; refreshToken?: string; user: any; company: any }>('/auth/telegram', { initData })
      .then(res => { setAuth(res.token, res.company?.id ?? '', res.company?.name ?? '', res.refreshToken) })
      .catch(err => {
        setError(err.message)
        setIsLoading(false)
      })
  }, [token, retryCount])

  return { isLoading, isAuthenticated: !!token, error }
}
