'use client'

import { useState } from 'react'
import { useAssessmentStore } from '@/lib/assessments'
import { ProtectedRoute } from '@/lib/auth-provider'
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertCircle,
  Mic,
  Video,
  Puzzle,
  Calendar,
  ChevronRight,
  Trash2,
  X
} from 'lucide-react'
import Link from 'next/link'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine 
} from 'recharts'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const { assessments, getLatestAssessment, getTrend, clearAllAssessments } = useAssessmentStore()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  
  const latestAssessment = getLatestAssessment()
  
  // Show 0 score when no assessments, otherwise calculate from latest
  const healthScore = assessments.length === 0 ? 0 : Math.round((1 - (latestAssessment?.overall_risk_score ?? 0.5)) * 100)
  const riskCategory = latestAssessment?.risk_category ?? 'low'

  const getRiskColor = (category: string) => {
    switch (category) {
      case 'low': return 'bg-green-500'
      case 'mild': return 'bg-yellow-500'
      case 'high': return 'bg-orange-500'
      case 'critical': return 'bg-red-600'
      default: return 'bg-green-500'
    }
  }

  const trendData = getTrend()

  const handleDelete = async () => {
    if (confirmText.toLowerCase() !== 'confirm') {
      return
    }
    
    setIsDeleting(true)
    
    // Clear all data
    clearAllAssessments()
    
    // Force refresh by reloading page after short delay
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-red-900">Delete All Data?</h3>
              <button 
                onClick={() => {
                  setShowDeleteModal(false)
                  setConfirmText('')
                }}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">
              This will permanently delete all your assessment history. This action cannot be undone.
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">
                Type <span className="font-bold">confirm</span> below to proceed:
              </p>
            </div>
            
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type 'confirm' here"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
              autoFocus
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setConfirmText('')
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText.toLowerCase() !== 'confirm' || isDeleting}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  confirmText.toLowerCase() === 'confirm' && !isDeleting
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-red-300 text-white cursor-not-allowed'
                }`}
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Brain className="w-8 h-8 text-violet-600" />
            <span className="text-xl font-bold text-gray-900">CogniScan AI</span>
          </div>
          <nav className="flex gap-6">
            <Link href="/dashboard" className="text-violet-600 font-medium">Dashboard</Link>
            <Link href="/assessment" className="text-gray-600 hover:text-gray-900">New Assessment</Link>
            <Link href="/history" className="text-gray-600 hover:text-gray-900">History</Link>
            <Link href="/profile" className="text-gray-600 hover:text-gray-900">Profile</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Score Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Cognitive Health Score</h2>
            
            <div className="flex items-center gap-8">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${healthScore * 4.4} 440`}
                    className={getRiskColor(riskCategory).replace('bg-', 'text-')}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-gray-900">{healthScore}</span>
                  <span className="text-sm text-gray-500">/ 100</span>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-4 py-1.5 rounded-full text-white text-sm font-medium ${getRiskColor(riskCategory)}`}>
                    {riskCategory.charAt(0).toUpperCase() + riskCategory.slice(1)} Risk
                  </span>
                  {assessments.length > 1 && (
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <Activity className="w-4 h-4 text-gray-500" /> {assessments.length} assessments
                    </span>
                  )}
                </div>

                {assessments.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">No assessments yet</p>
                    <p className="text-sm text-gray-600">Complete your first assessment to see your cognitive health score.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Trend Chart */}
            {trendData.length > 1 && (
              <div className="mt-8">
                <h3 className="text-sm font-medium text-gray-700 mb-4">30-Day Trend</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                      <Tooltip 
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label="Alert" />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#7c3aed" 
                        strokeWidth={2}
                        dot={{ fill: '#7c3aed', strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <Link 
                href="/assessment"
                className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-violet-200 flex items-center justify-center">
                  <Brain className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Start Assessment</p>
                  <p className="text-xs text-violet-600">Daily 10-min check-in</p>
                </div>
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Alerts */}
            {assessments.length > 0 && healthScore < 70 && (
              <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-900">Low Score Alert</h3>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="font-medium text-red-800 text-sm">Cognitive Health Below 70%</p>
                  <p className="text-xs text-red-600 mt-1">Consider consulting a healthcare professional.</p>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {assessments.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Recommendations</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Activity className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Daily Assessment</p>
                      <p className="text-xs text-gray-600 mt-1">Complete daily check-ins for best results</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Streak */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🔥</div>
                <div>
                  <p className="font-bold text-gray-900">{assessments.length} Day Streak!</p>
                  <p className="text-sm text-gray-600">Keep up your daily assessments</p>
                </div>
              </div>
            </div>

            {/* Last Assessment */}
            {latestAssessment && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Last Assessment</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <Calendar className="w-4 h-4" />
                  {new Date(latestAssessment.created_at).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <Mic className="w-4 h-4 mx-auto mb-1 text-violet-500" />
                    <p className="text-xs text-gray-500">Speech</p>
                    <p className="font-semibold text-gray-900">
                      {Math.round((latestAssessment.speech_score || 0.5) * 100)}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <Video className="w-4 h-4 mx-auto mb-1 text-violet-500" />
                    <p className="text-xs text-gray-500">Facial</p>
                    <p className="font-semibold text-gray-900">
                      {Math.round((latestAssessment.facial_score || 0.5) * 100)}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <Puzzle className="w-4 h-4 mx-auto mb-1 text-violet-500" />
                    <p className="text-xs text-gray-500">Cognitive</p>
                    <p className="font-semibold text-gray-900">
                      {Math.round((latestAssessment.cognitive_score || 0.5) * 100)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Reset Data */}
            {assessments.length > 0 && (
              <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
                <h3 className="font-semibold text-red-900 mb-3">Reset Data</h3>
                <p className="text-sm text-red-700 mb-3">Clear all assessment history</p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All Data
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
