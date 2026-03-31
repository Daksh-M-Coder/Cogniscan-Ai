'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth'
import { 
  Brain, 
  Users, 
  Activity,
  AlertCircle,
  Mic,
  Video,
  LogOut,
  Stethoscope,
  Calendar,
  Search
} from 'lucide-react'

// Assessment interface matching the assessment store
interface Assessment {
  id: string
  created_at: string
  overall_risk_score: number
  risk_category: string
  duration_seconds: number
  speech_score?: number
  facial_score?: number
  cognitive_score?: number
  speech_analysis?: any
  facial_analysis?: any
  recommendation?: string
  userId?: string
  userEmail?: string
}

// Mock patients data - in a real app this would come from a backend
const MOCK_PATIENTS = [
  { id: 'user-naitik', email: 'dondanaitik@gmail.com', name: 'Naitik Donda', age: 25, lastAssessment: '2024-01-15' },
]

export default function DoctorDashboardContent() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [patientsData, setPatientsData] = useState<Record<string, Assessment[]>>({})
  const [patientsList, setPatientsList] = useState(MOCK_PATIENTS)
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // Load all patients' assessments from shared localStorage
    const loadPatientData = () => {
      const allPatients: typeof MOCK_PATIENTS = []
      const allData: Record<string, Assessment[]> = {}
      
      // Find all patient-data keys in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('patient-data-')) {
          try {
            const stored = localStorage.getItem(key)
            if (stored) {
              const patientData = JSON.parse(stored)
              if (patientData.userId && patientData.assessments) {
                // Add to patients list if not already there
                if (!allPatients.find(p => p.id === patientData.userId)) {
                  allPatients.push({
                    id: patientData.userId,
                    email: patientData.userEmail || 'unknown@example.com',
                    name: patientData.name || patientData.userEmail?.split('@')[0] || 'Unknown Patient',
                    age: 25, // Default age
                    lastAssessment: patientData.assessments[0]?.created_at || 'Never'
                  })
                }
                // Add assessments
                allData[patientData.userId] = patientData.assessments.map((a: any) => ({
                  ...a,
                  userId: patientData.userId,
                  userEmail: patientData.userEmail
                }))
              }
            }
          } catch (e) {
            console.error('Failed to parse patient data from', key)
          }
        }
      }

      // Also load from default assessment-storage (current user's data for backward compatibility)
      const defaultStored = localStorage.getItem('assessment-storage')
      if (defaultStored) {
        try {
          const parsed = JSON.parse(defaultStored)
          if (parsed.state && parsed.state.assessments && parsed.state.assessments.length > 0) {
            const authData = localStorage.getItem('auth-storage')
            const userId = authData ? JSON.parse(authData).state?.user?.id || 'current-user' : 'current-user'
            const userEmail = authData ? JSON.parse(authData).state?.user?.email || 'unknown' : 'unknown'
            
            if (!allPatients.find(p => p.id === userId)) {
              allPatients.push({
                id: userId,
                email: userEmail,
                name: userEmail.split('@')[0],
                age: 25,
                lastAssessment: parsed.state.assessments[0]?.created_at || 'Never'
              })
            }
            
            allData[userId] = parsed.state.assessments.map((a: any) => ({
              ...a,
              userId: userId,
              userEmail: userEmail
            }))
          }
        } catch (e) {
          console.error('Failed to parse default assessments')
        }
      }

      // Merge with mock patients if no real data yet
      if (allPatients.length === 0) {
        setPatientsList(MOCK_PATIENTS)
      } else {
        // Add any missing mock patients that have data
        MOCK_PATIENTS.forEach(mp => {
          if (!allPatients.find(p => p.id === mp.id)) {
            allPatients.push(mp)
          }
        })
        setPatientsList(allPatients)
      }
      
      setPatientsData(allData)
    }

    loadPatientData()
  }, [])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // Filter patients based on search
  const filteredPatients = patientsList.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get latest assessment for a patient
  const getLatestAssessment = (patientId: string): Assessment | null => {
    const assessments = patientsData[patientId] || []
    return assessments.length > 0 ? assessments[0] : null
  }

  // Get all assessments for selected patient
  const selectedPatientAssessments = selectedPatient ? (patientsData[selectedPatient] || []) : []

  const getRiskColor = (category: string) => {
    switch (category) {
      case 'low': return 'bg-green-500'
      case 'mild': return 'bg-yellow-500'
      case 'high': return 'bg-orange-500'
      case 'critical': return 'bg-red-600'
      default: return 'bg-gray-500'
    }
  }

  const getRiskTextColor = (category: string) => {
    switch (category) {
      case 'low': return 'text-green-700 bg-green-100'
      case 'mild': return 'text-yellow-700 bg-yellow-100'
      case 'high': return 'text-orange-700 bg-orange-100'
      case 'critical': return 'text-red-700 bg-red-100'
      default: return 'text-gray-700 bg-gray-100'
    }
  }

  const getHealthScore = (riskScore: number) => Math.round((1 - riskScore) * 100)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">CogniScan AI</span>
                <span className="ml-2 text-sm text-violet-600 font-medium">Doctor Portal</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Dr. {user?.name?.replace('Dr. ', '') || 'Doctor'}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Patients List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-violet-600" />
                  Patients
                </h2>
                <span className="text-sm text-gray-500">{filteredPatients.length} total</span>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              {/* Patient Cards */}
              <div className="space-y-3">
                {filteredPatients.map(patient => {
                  const latest = getLatestAssessment(patient.id)
                  const healthScore = latest ? getHealthScore(latest.overall_risk_score) : null
                  
                  return (
                    <button
                      key={patient.id}
                      onClick={() => setSelectedPatient(patient.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        selectedPatient === patient.id 
                          ? 'border-violet-500 bg-violet-50' 
                          : 'border-gray-200 hover:border-violet-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{patient.name}</p>
                          <p className="text-sm text-gray-500">{patient.email}</p>
                          <p className="text-xs text-gray-400">Age: {patient.age}</p>
                        </div>
                        {healthScore !== null && (
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            healthScore >= 70 ? 'bg-green-100' : 
                            healthScore >= 50 ? 'bg-yellow-100' : 'bg-red-100'
                          }`}>
                            <span className={`text-sm font-bold ${
                              healthScore >= 70 ? 'text-green-700' : 
                              healthScore >= 50 ? 'text-yellow-700' : 'text-red-700'
                            }`}>
                              {healthScore}
                            </span>
                          </div>
                        )}
                      </div>
                      {latest && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-500">
                            Last: {new Date(latest.created_at).toLocaleDateString()}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full font-medium ${getRiskTextColor(latest.risk_category)}`}>
                            {latest.risk_category}
                          </span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Patient Details */}
          <div className="lg:col-span-2">
            {selectedPatient ? (
              <div className="space-y-6">
                {/* Patient Header */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {patientsList.find(p => p.id === selectedPatient)?.name}
                      </h2>
                      <p className="text-gray-500">
                        {patientsList.find(p => p.id === selectedPatient)?.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total Assessments</p>
                      <p className="text-2xl font-bold text-violet-600">
                        {selectedPatientAssessments.length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Assessment History */}
                {selectedPatientAssessments.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-violet-600" />
                      Assessment History
                    </h3>
                    
                    {selectedPatientAssessments.map((assessment) => (
                      <div key={assessment.id} className="bg-white rounded-2xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {new Date(assessment.created_at).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getRiskColor(assessment.risk_category)}`}>
                            {assessment.risk_category.toUpperCase()}
                          </span>
                        </div>

                        <div className="grid md:grid-cols-4 gap-4 mb-4">
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">Health Score</p>
                            <p className={`text-xl font-bold ${
                              getHealthScore(assessment.overall_risk_score) >= 70 ? 'text-green-600' :
                              getHealthScore(assessment.overall_risk_score) >= 50 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {getHealthScore(assessment.overall_risk_score)}
                            </p>
                          </div>
                          <div className="bg-violet-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">Speech Score</p>
                            <p className="text-xl font-bold text-violet-600">
                              {Math.round((assessment.speech_score || 0.5) * 100)}
                            </p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">Facial Score</p>
                            <p className="text-xl font-bold text-blue-600">
                              {Math.round((assessment.facial_score || 0.5) * 100)}
                            </p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">Cognitive Score</p>
                            <p className="text-xl font-bold text-green-600">
                              {Math.round((assessment.cognitive_score || 0.5) * 100)}
                            </p>
                          </div>
                        </div>

                        {/* Analysis Details */}
                        {assessment.speech_analysis && (
                          <div className="border-t border-gray-100 pt-4 mt-4">
                            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                              <Mic className="w-4 h-4 text-violet-600" />
                              Speech Analysis
                            </h4>
                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500">Language: {assessment.speech_analysis.language || 'en'}</p>
                                <p className="text-gray-500">Speech Rate: {assessment.speech_analysis.speech_rate_wpm?.toFixed(1) || 'N/A'} WPM</p>
                              </div>
                              {assessment.speech_analysis.text && (
                                <div className="bg-gray-50 rounded p-2">
                                  <p className="text-gray-600 italic">&ldquo;{assessment.speech_analysis.text.substring(0, 100)}...&rdquo;</p>
                                </div>
                              )}
                            </div>
                            
                            {/* Crisis Alert */}
                            {assessment.speech_analysis.crisis_analysis?.requires_immediate_attention && (
                              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                <span className="text-red-700 font-medium">
                                  Crisis Alert: Immediate attention required
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {assessment.facial_analysis && (
                          <div className="border-t border-gray-100 pt-4 mt-4">
                            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                              <Video className="w-4 h-4 text-violet-600" />
                              Facial Analysis
                            </h4>
                            <div className="grid md:grid-cols-3 gap-4 text-sm">
                              <p className="text-gray-500">Dominant Emotion: {assessment.facial_analysis.dominant_emotion || 'N/A'}</p>
                              <p className="text-gray-500">Attention Level: {assessment.facial_analysis.attention?.level || 'N/A'}</p>
                              <p className="text-gray-500">Face Detection: {((assessment.facial_analysis.face_detection_rate || 0) * 100).toFixed(1)}%</p>
                            </div>
                          </div>
                        )}

                        {assessment.recommendation && (
                          <div className="border-t border-gray-100 pt-4 mt-4">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Recommendation:</span> {assessment.recommendation}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Assessments</h3>
                    <p className="text-gray-500">This patient has not completed any assessments yet.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Select a Patient</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Choose a patient from the list on the left to view their detailed assessment history and cognitive health data.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
