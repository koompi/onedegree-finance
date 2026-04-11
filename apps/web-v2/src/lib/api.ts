const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV
const envApiUrl = typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_API_URL : undefined
const BASE_URL = envApiUrl || (isDev ? 'http://localhost:3001' : 'https://onedegree-api.tunnel.koompi.cloud')

class ApiError extends Error {
  code: string
  status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem('od_auth') || '{}')?.token || null }
  catch { return null }
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem('od_auth') || '{}')?.refreshToken || null }
  catch { return null }
}

let _refreshing: Promise<string | null> | null = null

async function tryRefreshToken(): Promise<string | null> {
  // Deduplicate concurrent refresh attempts
  if (_refreshing) return _refreshing
  _refreshing = (async () => {
    try {
      const rt = getRefreshToken()
      if (!rt) return null
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      })
      if (!res.ok) return null
      const { accessToken, refreshToken: newRefreshToken } = await res.json()
      // Persist new tokens to localStorage (rolling refresh)
      const stored = JSON.parse(localStorage.getItem('od_auth') || '{}')
      localStorage.setItem('od_auth', JSON.stringify({ ...stored, token: accessToken, refreshToken: newRefreshToken || stored.refreshToken }))
      // Update in-memory store without circular import
      const { useAuthStore } = await import('../store/authStore')
      const store = useAuthStore.getState()
      store.setToken(accessToken)
      if (newRefreshToken) useAuthStore.setState({ refreshToken: newRefreshToken })
      return accessToken as string
    } catch {
      return null
    } finally {
      _refreshing = null
    }
  })()
  return _refreshing
}

async function doFetch(method: string, path: string, token: string | null, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let p = path
  // The backend mounts business routes under /companies
  if (!p.startsWith('/auth') && !p.startsWith('/health') && !p.startsWith('/exchange-rate') && !p.startsWith('/companies') && p !== '/') {
    p = `/companies${p}`
  }

  let res = await doFetch(method, p, getToken(), body)

  // On 401, attempt a single token refresh and retry
  if (res.status === 401 && !p.startsWith('/auth')) {
    const newToken = await tryRefreshToken()
    if (newToken) {
      res = await doFetch(method, p, newToken, body)
    } else {
      // Refresh token also expired — force logout so user re-authenticates
      const { useAuthStore } = await import('../store/authStore')
      useAuthStore.getState().logout()
    }
  }

  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new ApiError(json.code || 'UNKNOWN', json.error || res.statusText, res.status)
  }

  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}

export { ApiError }
