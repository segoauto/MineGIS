import { useState, FormEvent } from 'react'
import { MapPin, Lock, Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '../store'
import { authApi } from '../api/auth'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { setUser } = useAuthStore()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const tokens = await authApi.login(username, password)
      setUser(tokens.user)
      window.location.href = '/'
    } catch {
      setError('Invalid credentials. Please check your username and password.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-map-bg flex items-center justify-center p-4"
      style={{
        backgroundImage: 'radial-gradient(ellipse at 60% 20%, rgba(26, 60, 110, 0.3) 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(255, 107, 43, 0.1) 0%, transparent 40%)',
      }}>

      {/* Background decorative grid */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-map-panel border border-map-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gov-600 px-8 py-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'radial-gradient(circle at 30% 50%, white 0%, transparent 50%)',
              }}
            />
            <div className="relative">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl mb-4">
                <MapPin size={28} className="text-white" />
              </div>
              <h1 className="text-white font-bold text-2xl tracking-tight">MineGIS-TS</h1>
              <p className="text-white/70 text-sm mt-1">Mining Governance Platform</p>
              <p className="text-white/50 text-xs mt-0.5">Government of Telangana</p>
              <p className="text-white/40 text-xs">Department of Mines &amp; Geology</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
            <div>
              <label className="text-map-muted text-xs font-medium block mb-1.5">
                Email / Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin@minegis.ts.gov.in"
                required
                autoComplete="username"
                className="w-full bg-map-bg border border-map-border rounded-lg px-4 py-3 text-map-text text-sm placeholder:text-map-muted/50 outline-none focus:border-gov-400 transition-colors"
              />
            </div>

            <div>
              <label className="text-map-muted text-xs font-medium block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-map-bg border border-map-border rounded-lg px-4 py-3 pr-11 text-map-text text-sm placeholder:text-map-muted/50 outline-none focus:border-gov-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-map-muted hover:text-map-text"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/40 rounded-lg px-4 py-3 animate-fade-in">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-xs">{error}</p>
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full bg-gov-600 hover:bg-gov-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all text-sm flex items-center justify-center gap-2 shadow-lg"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Lock size={14} />
                  Sign in to MineGIS-TS
                </>
              )}
            </button>
            
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-map-border"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-map-panel px-2 text-map-muted">or</span>
              </div>
            </div>

            <button
              onClick={() => window.location.assign('/sso-portal')}
              type="button"
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-lg transition-all text-sm flex items-center justify-center gap-2 border border-slate-700 shadow-md"
            >
               <ShieldCheck size={16} className="text-gov-400" />
               Sign in with e-Pramaan (NIC)
            </button>

            {/* Demo credentials */}
            <div className="bg-map-bg border border-map-border rounded-lg px-4 py-3">
              <p className="text-map-muted text-xs font-medium mb-1">Demo Credentials</p>
              <p className="text-gov-300 text-xs font-mono">admin@minegis.ts.gov.in</p>
              <p className="text-gov-300 text-xs font-mono">MineGIS@2026</p>
            </div>
          </form>

          {/* Footer */}
          <div className="px-8 pb-6 text-center">
            <p className="text-map-muted text-xs">
              Secure access — Government of Telangana
            </p>
            <p className="text-map-muted text-xs mt-0.5">
              NIC e-Pramaan SSO available for registered officers
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
