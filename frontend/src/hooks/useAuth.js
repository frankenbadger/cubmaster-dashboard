import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

// Axios instance
export const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) useAuthStore.getState().logout()
    return Promise.reject(err)
  }
)

// Auth store
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: async (username, password) => {
        const form = new URLSearchParams({ username, password })
        const { data } = await api.post('/auth/token', form)
        set({ token: data.access_token, user: { username: data.username, role: data.role } })
      },
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'cubmaster-auth' }
  )
)
