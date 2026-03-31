import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
}

interface AssessmentState {
  assessments: Assessment[]
  addAssessment: (assessment: Omit<Assessment, 'id' | 'created_at'>) => void
  clearAllAssessments: () => void
  getLatestAssessment: () => Assessment | null
  getTrend: () => { date: string; score: number }[]
}

export const useAssessmentStore = create<AssessmentState>()(
  persist(
    (set, get) => ({
      assessments: [],

      addAssessment: (assessment) => {
        const newAssessment: Assessment = {
          ...assessment,
          id: 'assessment-' + Date.now(),
          created_at: new Date().toISOString(),
        }
        set((state) => ({
          assessments: [newAssessment, ...state.assessments],
        }))
        
        // Also save to shared patient data storage for doctor access
        try {
          const userId = localStorage.getItem('auth-storage') 
            ? JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.user?.id || 'unknown'
            : 'unknown'
          const userEmail = localStorage.getItem('auth-storage')
            ? JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.user?.email || 'unknown'
            : 'unknown'
          
          const sharedKey = `patient-data-${userId}`
          const existing = localStorage.getItem(sharedKey)
          const patientData = existing ? JSON.parse(existing) : { 
            userId, 
            userEmail, 
            name: userEmail.split('@')[0],
            assessments: [] 
          }
          
          patientData.assessments = [newAssessment, ...patientData.assessments]
          localStorage.setItem(sharedKey, JSON.stringify(patientData))
        } catch (e) {
          console.error('Failed to save to shared storage:', e)
        }
      },

      clearAllAssessments: () => {
        set({ assessments: [] })
        
        // Also clear from shared patient data storage
        try {
          const authStorage = localStorage.getItem('auth-storage')
          const userId = authStorage 
            ? JSON.parse(authStorage).state?.user?.id || 'unknown'
            : 'unknown'
          const sharedKey = `patient-data-${userId}`
          localStorage.removeItem(sharedKey)
          console.log('[ASSESSMENTS] Cleared shared storage:', sharedKey)
        } catch (e) {
          console.error('Failed to clear shared storage:', e)
        }
      },

      getLatestAssessment: () => {
        const { assessments } = get()
        return assessments.length > 0 ? assessments[0] : null
      },

      getTrend: () => {
        const { assessments } = get()
        return assessments
          .slice(0, 30)
          .reverse()
          .map((a) => ({
            date: new Date(a.created_at).toLocaleDateString(),
            score: Math.round((1 - a.overall_risk_score) * 100),
          }))
      },
    }),
    {
      name: 'assessment-storage',
    }
  )
)
