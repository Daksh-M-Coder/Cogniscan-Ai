'use client'

import { useAuthStore } from '@/lib/auth'
import { ProtectedRoute } from '@/lib/auth-provider'
import { Brain, Mail, User, Shield, LogOut, Bell, CloudOff } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}

function ProfileContent() {
  const { user, logout } = useAuthStore()
  const [notifications, setNotifications] = useState(true)
  const [offlineMode, setOfflineMode] = useState(false)

  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Brain className="w-8 h-8 text-violet-600" />
            <span className="text-xl font-bold text-gray-900">CogniScan AI</span>
          </div>
          <nav className="flex gap-6">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
            <Link href="/assessment" className="text-gray-600 hover:text-gray-900">New Assessment</Link>
            <Link href="/history" className="text-gray-600 hover:text-gray-900">History</Link>
            <Link href="/profile" className="text-violet-600 font-medium">Profile</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-violet-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
              <p className="text-gray-500">{user?.email}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm font-medium capitalize">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-900">Preferences</h2>
          </div>
          
          <div className="p-4 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Notifications</p>
                <p className="text-sm text-gray-500">Receive alerts and reminders</p>
              </div>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-6 rounded-full transition-colors ${notifications ? 'bg-violet-600' : 'bg-gray-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${notifications ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <CloudOff className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Offline Mode</p>
                <p className="text-sm text-gray-500">Sync only on WiFi</p>
              </div>
            </div>
            <button
              onClick={() => setOfflineMode(!offlineMode)}
              className={`w-12 h-6 rounded-full transition-colors ${offlineMode ? 'bg-violet-600' : 'bg-gray-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${offlineMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-900">About</h2>
          </div>
          
          <Link href="#" className="p-4 flex items-center gap-3 border-b border-gray-100 hover:bg-gray-50">
            <Shield className="w-5 h-5 text-gray-600" />
            <span className="flex-1 text-gray-900">Privacy Policy</span>
          </Link>
          
          <Link href="#" className="p-4 flex items-center gap-3 border-b border-gray-100 hover:bg-gray-50">
            <User className="w-5 h-5 text-gray-600" />
            <span className="flex-1 text-gray-900">Terms of Service</span>
          </Link>
          
          <div className="p-4 flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-600" />
            <span className="flex-1 text-gray-900">Help & Support</span>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={logout}
          className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>

        <p className="text-center text-sm text-gray-500 mt-6">
          CogniScan AI v1.0.0
        </p>
      </main>
    </div>
  )
}
