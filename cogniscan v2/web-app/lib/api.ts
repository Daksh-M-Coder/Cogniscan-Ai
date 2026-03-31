import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 3000,  // 3 second timeout for fast fallback
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Get token from localStorage or Zustand store
    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('auth-storage')
      : null
    if (token) {
      const parsed = JSON.parse(token)
      if (parsed.state?.token) {
        config.headers.Authorization = `Bearer ${parsed.state.token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
