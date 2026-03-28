import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

interface AuthState {
  user: { id: string; name: string; lang: string } | null
  token: string | null
  refreshToken: string | null
  companyId: string | null
  login: (initData: string) => Promise<void>
  setCompany: (id: string) => void
  logout: () => void
  clearStale: () => void
}

const API_URL = typeof window !== 'undefined'
  ? (window as any).__VITE_API_URL__ || 'https://onedegree-api.tunnel.koompi.cloud'
  : 'https://onedegree-api.tunnel.koompi.cloud'

export const useAuth = create<AuthState>()(persist(
  (set, get) => ({
    user: null, token: null, refreshToken: null, companyId: null,
    login: async (initData: string) => {
      const res = await axios.post(`${API_URL}/auth/telegram`, { initData })
      set({
        user: res.data.user,
        token: res.data.accessToken,
        refreshToken: res.data.refreshToken,
      })
    },
    setCompany: (id: string) => set({ companyId: id }),
    logout: () => set({ user: null, token: null, refreshToken: null, companyId: null }),
    clearStale: () => {
      // Clear auth if token exists but user doesn't (corrupted state)
      const { token, user } = get()
      if (token && !user) {
        set({ user: null, token: null, refreshToken: null, companyId: null })
      }
    },
  }),
  {
    name: 'onedegree-auth',
    onRehydrateStorage: () => (state) => {
      // Validate state after hydration
      if (state?.token && !state?.user) {
        state.logout()
      }
    },
  }
))
