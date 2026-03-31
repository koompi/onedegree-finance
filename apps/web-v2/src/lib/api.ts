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

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let p = path
  // The local backend mounts business routes under /companies
  if (BASE_URL.includes('localhost') && !p.startsWith('/auth') && !p.startsWith('/health') && !p.startsWith('/companies')) {
    p = p === '/' ? '/companies' : `/companies${p}`
  }

  const res = await fetch(`${BASE_URL}${p}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

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
