import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from './api'

// Hardcoded credentials for demo
const VALID_USERS: Record<string, { password: string; name: string; role: 'patient' | 'doctor'; id: string }> = {
  'dondanaitik@gmail.com': {
    password: '123123',
    name: 'Naitik Donda',
    role: 'patient',
    id: 'user-naitik'
  },
  'naitikdonda2006@gmail.com': {
    password: '123123',
    name: 'Dr. Naitik Donda',
    role: 'doctor',
    id: 'doctor-naitik'
  }
}

export type UserRole = 'patient' | 'doctor' | 'caregiver'

interface User {
  id: string
  email: string
  name: string
  role: UserRole
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isDoctor: boolean
  login: (email: string, password: string) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => void
}

interface RegisterData {
  email: string
  password: string
  name: string
  role: UserRole
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isDoctor: false,

      login: async (email: string, password: string) => {
        console.log('[AUTH] Starting login...', email)
        const startTime = Date.now()
        
        // Check hardcoded credentials first
        const hardcodedUser = VALID_USERS[email.toLowerCase()]
        if (hardcodedUser && hardcodedUser.password === password) {
          const user: User = {
            id: hardcodedUser.id,
            email: email.toLowerCase(),
            name: hardcodedUser.name,
            role: hardcodedUser.role
          }
          set({ 
            user, 
            token: 'mock-token-' + Date.now(), 
            isAuthenticated: true,
            isDoctor: hardcodedUser.role === 'doctor'
          })
          console.log(`[AUTH] Hardcoded login successful in ${Date.now() - startTime}ms`)
          return
        }
        
        // Try API login as fallback
        try {
          const response = await api.post('/api/v1/auth/login', { email, password })
          const { user, token } = response.data
          set({ 
            user, 
            token, 
            isAuthenticated: true,
            isDoctor: user.role === 'doctor'
          })
          console.log(`[AUTH] API login successful in ${Date.now() - startTime}ms`)
        } catch (err: any) {
          console.log(`[AUTH] API error after ${Date.now() - startTime}ms:`, err.response?.status || 'network error')
          // Fallback to mock login for any email if backend unavailable
          if (!err.response || err.response?.status === 404) {
            console.log('[AUTH] Using mock login fallback')
            const mockUser: User = {
              id: 'user-' + Date.now(),
              email,
              name: 'Demo User',
              role: 'patient',
            }
            set({ 
              user: mockUser, 
              token: 'mock-token', 
              isAuthenticated: true,
              isDoctor: false
            })
            console.log(`[AUTH] Mock login complete in ${Date.now() - startTime}ms`)
          } else {
            throw new Error('Invalid email or password')
          }
        }
      },

      register: async (userData: RegisterData) => {
        try {
          const response = await api.post('/api/v1/auth/register', userData)
          const { user, token } = response.data
          set({ 
            user, 
            token, 
            isAuthenticated: true,
            isDoctor: user.role === 'doctor'
          })
        } catch (err: any) {
          // Fallback to mock register if backend unavailable or returns 404
          if (!err.response || err.response?.status === 404) {
            const mockUser: User = {
              id: 'user-' + Date.now(),
              email: userData.email,
              name: userData.name,
              role: userData.role,
            }
            set({ 
              user: mockUser, 
              token: 'mock-token', 
              isAuthenticated: true,
              isDoctor: userData.role === 'doctor'
            })
          } else {
            throw err
          }
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, isDoctor: false })
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)
