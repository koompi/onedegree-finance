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
}

export const useAuth = create<AuthState>()(persist(
  (set) => ({
    user: null, token: null, refreshToken: null, companyId: null,
    login: async (initData: string) => {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/telegram`, { initData })
      set({ user: res.data.user, token: res.data.accessToken, refreshToken: res.data.refreshToken })
    },
    setCompany: (id: string) => set({ companyId: id }),
    logout: () => set({ user: null, token: null, refreshToken: null, companyId: null }),
  }),
  { name: 'onedegree-auth' }
))
