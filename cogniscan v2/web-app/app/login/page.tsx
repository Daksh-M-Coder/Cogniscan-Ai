'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth'
import { Brain, Eye, EyeOff } from 'lucide-react'

const REMEMBER_ME_KEY = 'cogniscan_remember_email'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login } = useAuthStore()
  const router = useRouter()

  // Load remembered email on mount
  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBER_ME_KEY)
    if (remembered) {
      setEmail(remembered)
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      await login(email, password)
      
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, email)
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY)
      }
      
      // Redirect based on role
      if (email.toLowerCase() === 'naitikdonda2006@gmail.com') {
        router.push('/doctor')
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Brain className="w-12 h-12 text-violet-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Welcome Back
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Sign in to continue monitoring your cognitive health
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
              />
              <span className="text-sm text-gray-700">Remember me</span>
            </label>
            <Link 
              href="/forgot-password" 
              className="text-sm text-violet-600 hover:text-violet-700 font-medium"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-violet-600 text-white py-2 rounded-lg hover:bg-violet-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center mt-4 text-gray-600">
          Don't have an account?{' '}
          <Link href="/register" className="text-violet-600 hover:text-violet-700 font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
