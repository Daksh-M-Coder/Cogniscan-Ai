'use client'

import { useAssessmentStore } from '@/lib/assessments'
import { ProtectedRoute } from '@/lib/auth-provider'
import { Brain, Calendar, Mic, Video, Puzzle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default function HistoryPage() {
  return (
    <ProtectedRoute>
      <HistoryContent />
    </ProtectedRoute>
  )
}

function HistoryContent() {
  const { assessments } = useAssessmentStore()

  const getRiskColor = (category: string) => {
    switch (category) {
      case 'low': return 'bg-green-100 text-green-700'
      case 'mild': return 'bg-yellow-100 text-yellow-700'
      case 'high': return 'bg-orange-100 text-orange-700'
      case 'critical': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

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
            <Link href="/history" className="text-violet-600 font-medium">History</Link>
            <Link href="/profile" className="text-gray-600 hover:text-gray-900">Profile</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Assessment History</h1>

        {assessments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500 mb-4">No assessments yet</p>
            <Link href="/assessment" className="text-violet-600 hover:text-violet-700 font-medium">
              Complete your first assessment →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {assessments.map((assessment) => (
              <div 
                key={assessment.id} 
                className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {format(new Date(assessment.created_at), 'MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(assessment.created_at), 'h:mm a')}
                        {assessment.duration_seconds && ` • ${Math.round(assessment.duration_seconds / 60)} min`}
                      </p>
                      
                      <div className="flex gap-6 mt-3">
                        <div className="flex items-center gap-2">
                          <Mic className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {Math.round((assessment.speech_score || 0.5) * 100)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {Math.round((assessment.facial_score || 0.5) * 100)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Puzzle className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {Math.round((assessment.cognitive_score || 0.5) * 100)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(assessment.risk_category)}`}>
                      {Math.round((1 - assessment.overall_risk_score) * 100)}/100
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
