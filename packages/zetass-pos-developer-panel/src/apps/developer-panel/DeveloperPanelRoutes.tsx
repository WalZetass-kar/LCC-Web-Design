import { lazy } from 'react'
import { Navigate, Route } from 'react-router-dom'

const LicenseCenter = lazy(() => import('../../renderer/pages/LicenseCenter'))

export function DeveloperPanelRoutes() {
  return (
    <>
      <Route index element={<LicenseCenter />} />
      <Route path="license" element={<LicenseCenter />} />
      <Route path="*" element={<Navigate to="/developer" replace />} />
    </>
  )
}
