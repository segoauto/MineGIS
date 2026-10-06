import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store'
import LoginPage from './pages/LoginPage'
import SsoRedirectPortal from './pages/SsoRedirectPortal'
import SsoCallbackPage from './pages/SsoCallbackPage'
import PortalLayout from './pages/PortalLayout'

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/sso-portal" element={<SsoRedirectPortal />} />
          <Route path="/sso-callback" element={<SsoCallbackPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <PortalLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#FFFFFF',
            color: '#0F172A',
            border: '1px solid #CBD5E1',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          },
        }}
      />
    </QueryClientProvider>
  )
}
