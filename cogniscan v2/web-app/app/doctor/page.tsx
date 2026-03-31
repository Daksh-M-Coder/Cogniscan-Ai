'use client'

import { DoctorProtectedRoute } from '@/lib/auth-provider'
import DoctorDashboardContent from './DoctorDashboardContent'

export default function DoctorPage() {
  return (
    <DoctorProtectedRoute>
      <DoctorDashboardContent />
    </DoctorProtectedRoute>
  )
}
