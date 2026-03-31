import { create } from 'zustand'

export interface AuthState {
  token: string | null
  companyId: string | null
  companyName: string | null
  setAuth: (token: string, companyId: string, companyName: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  companyId: null,
  companyName: null,
  setAuth: (token, companyId, companyName) => {
    localStorage.setItem('od_auth', JSON.stringify({ token, companyId, companyName }))
    set({ token, companyId, companyName })
  },
  logout: () => {
    localStorage.removeItem('od_auth')
    set({ token: null, companyId: null, companyName: null })
  },
}))

// Hydrate from localStorage on client
if (typeof window !== 'undefined') {
  try {
    const stored = JSON.parse(localStorage.getItem('od_auth') || '{}')
    if (stored.token) {
      useAuthStore.setState({
        token: stored.token,
        companyId: stored.companyId,
        companyName: stored.companyName,
      })
    }
  } catch {}
}
