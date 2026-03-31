import { ReactNode } from 'react'
import { useAuthStore } from './auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function useAuth() {
  return useAuthStore()
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isDoctor } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    } else if (isDoctor) {
      // Redirect doctors to doctor portal
      router.push('/doctor')
    }
  }, [isAuthenticated, isDoctor, router])

  if (!isAuthenticated || isDoctor) {
    return null
  }

  return <>{children}</>
}

export function DoctorProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isDoctor } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    } else if (!isDoctor) {
      // Redirect non-doctors to patient dashboard
      router.push('/dashboard')
    }
  }, [isAuthenticated, isDoctor, router])

  if (!isAuthenticated || !isDoctor) {
    return null
  }

  return <>{children}</>
}
