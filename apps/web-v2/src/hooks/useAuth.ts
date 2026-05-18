import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { getTelegram } from '../lib/telegram'

export function useAuth() {
  const { token, setAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(!token)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleRetry = (delay: number) => {
    if (pendingTimer.current) clearTimeout(pendingTimer.current)
    pendingTimer.current = setTimeout(() => setRetryCount(c => c + 1), delay)
  }

  useEffect(() => {
    return () => {
      if (pendingTimer.current) clearTimeout(pendingTimer.current)
    }
  }, [])

  useEffect(() => {
    if (token) { setIsLoading(false); return }

    const tg = getTelegram()

    // Wait for Telegram SDK to be ready (up to 3 seconds)
    if (!tg) {
      if (retryCount < 10) {
        const t = setTimeout(() => setRetryCount(c => c + 1), 300)
        return () => clearTimeout(t)
      }
      setError('សូមបើកតាម Telegram')
      setIsLoading(false)
      return
    }

    // Telegram SDK found — try to get initData
    const initData = tg.initData

    if (!initData) {
      if (retryCount < 10) {
        const t = setTimeout(() => setRetryCount(c => c + 1), 300)
        return () => clearTimeout(t)
      }
      // SDK loaded but no initData — try initDataUnsafe as fallback
      const user = tg.initDataUnsafe?.user
      if (user) {
        const params = new URLSearchParams()
        params.set('user', JSON.stringify(user))
        params.set('auth_date', String(Math.floor(Date.now() / 1000)))
        api.post<{ token: string; refreshToken?: string; user: any; company: any }>('/auth/telegram', { initData: params.toString() })
          .then(res => { setAuth(res.token, res.company?.id ?? '', res.company?.name ?? '', res.refreshToken) })
          .catch(err => {
            if (retryCount < 15) {
              scheduleRetry(500)
            } else {
              setError(err.message)
              setIsLoading(false)
            }
          })
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
        if (err.message.includes('Invalid initData') && retryCount < 15) {
          scheduleRetry(500)
          return
        }
        setError(err.message)
        setIsLoading(false)
      })
  }, [token, retryCount])

  return { isLoading, isAuthenticated: !!token, error }
}
