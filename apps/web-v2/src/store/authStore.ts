import { create } from 'zustand'

export interface AuthState {
  token: string | null
  refreshToken: string | null
  companyId: string | null
  companyName: string | null
  setAuth: (token: string, companyId: string, companyName: string, refreshToken?: string) => void
  setToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  companyId: null,
  companyName: null,
  setAuth: (token, companyId, companyName, refreshToken) => {
    localStorage.setItem('od_auth', JSON.stringify({ token, refreshToken: refreshToken || null, companyId, companyName }))
    set({ token, refreshToken: refreshToken || null, companyId, companyName })
  },
  setToken: (token) => {
    try {
      const stored = JSON.parse(localStorage.getItem('od_auth') || '{}')
      localStorage.setItem('od_auth', JSON.stringify({ ...stored, token }))
    } catch {}
    set({ token })
  },
  logout: () => {
    localStorage.removeItem('od_auth')
    set({ token: null, refreshToken: null, companyId: null, companyName: null })
  },
}))

// Hydrate from localStorage on client
if (typeof window !== 'undefined') {
  try {
    const stored = JSON.parse(localStorage.getItem('od_auth') || '{}')
    if (stored.token) {
      useAuthStore.setState({
        token: stored.token,
        refreshToken: stored.refreshToken || null,
        companyId: stored.companyId,
        companyName: stored.companyName,
      })
    }
  } catch {}
}
