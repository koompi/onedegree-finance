import axios from 'axios'
import { useAuth } from '../store/auth'

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL })

api.interceptors.request.use((config) => {
  const token = useAuth.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      const { refreshToken, logout } = useAuth.getState()
      if (refreshToken) {
        try {
          const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, { refreshToken })
          useAuth.setState({ token: res.data.accessToken })
          error.config.headers.Authorization = `Bearer ${res.data.accessToken}`
          return api(error.config)
        } catch { logout() }
      } else { logout() }
    }
    return Promise.reject(error)
  }
)
