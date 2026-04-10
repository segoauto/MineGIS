import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore, useMapStore } from './store'
import LoginPage from './pages/LoginPage'
import MapView from './components/map/MapView'
import LayerPanel from './components/map/LayerPanel'
import LeaseInfoPanel from './components/panels/LeaseInfoPanel'
import VehicleTrackingPanel from './components/vehicle/VehicleTrackingPanel'
import TopBar from './components/ui/TopBar'
import SpatialToolbar from './components/ui/SpatialToolbar'
import TemporalSlider from './components/ui/TemporalSlider'
import ComplianceReportModal from './components/reports/ComplianceReportModal'
import { authApi } from './api/auth'
import LeaseFormPanel from './components/panels/LeaseFormPanel'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function MainApp() {
  const { setUser, logout } = useAuthStore()
  const reportModalOpen = useMapStore(s => s.reportModalOpen)

  // Revalidate session on mount
  useEffect(() => {
    authApi.getMe()
      .then(setUser)
      .catch(() => { logout(); window.location.href = '/login' })
  }, [setUser, logout])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-map-bg">
      {/* Top navigation bar */}
      <TopBar />

      {/* Map area */}
      <div className="flex-1 relative overflow-hidden">
        {/* OpenLayers map */}
        <MapView />

        {/* Spatial analysis toolbar (centered above map) */}
        <SpatialToolbar />

        {/* Temporal Slider for Time-Lapse (bottom center) */}
        <TemporalSlider />

        {/* Layer panel (left side) */}
        <LayerPanel />

        {/* Lease info panel (right side, slide-in) */}
        <LeaseInfoPanel />

        {/* Vehicle tracking panel (bottom, resizable) */}
        <VehicleTrackingPanel />

        {/* Lease form panel (right side, slide-in) */}
        <LeaseFormPanel />

        {/* Global modals */}
        <ComplianceReportModal 
           isOpen={reportModalOpen} 
           onClose={() => useMapStore.getState().setReportModalOpen(false)} 
        />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1E293B',
            color: '#F1F5F9',
            border: '1px solid #334155',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
          },
        }}
      />
    </QueryClientProvider>
  )
}
