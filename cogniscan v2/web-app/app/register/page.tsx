'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth'
import { Brain, Eye, EyeOff } from 'lucide-react'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'patient' | 'caregiver'>('patient')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { register } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      await register({ email, password, name, role })
      router.push('/dashboard')
    } catch (err) {
      setError('Registration failed. Please try again.')
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
          Create Account
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Start monitoring your cognitive health today
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              required
            />
          </div>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I am a:
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('patient')}
                className={`p-3 border rounded-lg text-center ${
                  role === 'patient' 
                    ? 'border-violet-600 bg-violet-50 text-violet-700' 
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                Patient
              </button>
              <button
                type="button"
                onClick={() => setRole('caregiver')}
                className={`p-3 border rounded-lg text-center ${
                  role === 'caregiver' 
                    ? 'border-violet-600 bg-violet-50 text-violet-700' 
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                Caregiver
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-violet-600 text-white py-2 rounded-lg hover:bg-violet-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-4 text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-violet-600 hover:text-violet-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
