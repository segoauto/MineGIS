import { useState, FormEvent } from 'react'
import { Lock, Eye, EyeOff, AlertCircle, ShieldCheck, CheckCircle2, ChevronRight, UserCheck, MapPin } from 'lucide-react'
import { useAuthStore } from '../store'
import { authApi, DEMO_ACCOUNTS, type DemoAccount } from '../api/auth'
import { TELANGANA_DISTRICT_NAMES, TELANGANA_DISTRICTS } from '../utils/districts'
import clsx from 'clsx'

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<DemoAccount>(DEMO_ACCOUNTS[0])
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Rangareddy')
  const [username, setUsername] = useState(DEMO_ACCOUNTS[0].username)
  const [password, setPassword] = useState(DEMO_ACCOUNTS[0].password)
  const [showPass, setShowPass] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { setUser } = useAuthStore()

  const handleDistrictChange = (district: string) => {
    setSelectedDistrict(district)
    const slug = district.toLowerCase().replace(/[^a-z]/g, '')
    setUsername(`dmo.${slug}@mining.telangana.gov.in`)
    setPassword('District@123')
  }

  const handleSelectAccount = (account: DemoAccount) => {
    setSelectedRole(account)
    if (account.roleCode === 'R04_DISTRICT_OFFICER') {
      const dist = account.district || 'Rangareddy'
      setSelectedDistrict(dist)
    }
    setUsername(account.username)
    setPassword(account.password)
    setError('')
  }

  const handleQuickLogin = async (account: DemoAccount, districtOverride?: string) => {
    setSelectedRole(account)
    const activeDistrict = districtOverride || (account.roleCode === 'R04_DISTRICT_OFFICER' ? selectedDistrict : undefined)
    const loginUser = activeDistrict && account.roleCode === 'R04_DISTRICT_OFFICER' 
      ? `dmo.${activeDistrict.toLowerCase().replace(/[^a-z]/g, '')}@mining.telangana.gov.in`
      : account.username

    setUsername(loginUser)
    setPassword(account.password)
    setError('')
    setIsLoading(true)

    try {
      const tokens = await authApi.login(loginUser, account.password, activeDistrict)
      setUser(tokens.user)
      window.location.href = '/'
    } catch {
      setError('Invalid credentials. Please check your username and password.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const isDistOfficer = selectedRole.roleCode === 'R04_DISTRICT_OFFICER' || username.toLowerCase().includes('dmo') || username.toLowerCase().includes('district')
    const activeDistrict = isDistOfficer ? selectedDistrict : undefined

    try {
      const tokens = await authApi.login(username, password, activeDistrict)
      setUser(tokens.user)
      window.location.href = '/'
    } catch {
      setError('Invalid credentials. Please check your username and password.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans text-slate-800">
      {/* Top Tricolor Banner */}
      <div className="w-full flex flex-col">
        <div className="h-1.5 w-full flex">
          <div className="h-full w-1/3 bg-[#FF671F]" />
          <div className="h-full w-1/3 bg-[#FFFFFF]" />
          <div className="h-full w-1/3 bg-[#046A38]" />
        </div>
        
        {/* Official Government Portal Header */}
        <header className="bg-white border-b border-slate-300 px-6 py-3 shadow-xs">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Emblem */}
              <div className="w-12 h-12 rounded-full border-2 border-gov-600 bg-white flex items-center justify-center p-1 shadow-xs flex-shrink-0">
                <div className="w-full h-full rounded-full border border-gov-600 flex items-center justify-center bg-blue-50/50">
                  <span className="text-[10px] font-black text-gov-600 tracking-tighter">TS DMG</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold text-gov-600 tracking-tight leading-none">
                    తెలంగాణ ప్రభుత్వం | Government of Telangana
                  </h1>
                </div>
                <h2 className="text-xs font-semibold text-slate-700 leading-tight mt-1">
                  Department of Mines &amp; Geology (గనుల మరియు భూగర్భ వనరుల శాఖ)
                </h2>
                <p className="text-[11px] text-slate-500">
                  MineGIS-TS: Mining Lease Administration &amp; Spatial Surveillance Portal
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="px-2.5 py-1 bg-amber-50 border border-amber-300 text-amber-900 rounded text-xs font-bold">
                OFFICIAL PORTAL
              </span>
            </div>
          </div>
        </header>
      </div>

      {/* Main Login Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 flex flex-col items-center gap-8">
        <div className="w-full max-w-md bg-white border border-slate-300 rounded shadow-md overflow-hidden">
          {/* Form Header */}
          <div className="bg-gov-600 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-amber-400" />
                <h3 className="font-bold text-base">Department Official Login</h3>
              </div>
              <span className="text-[10px] bg-blue-800/80 border border-blue-400/40 text-blue-100 font-mono px-2 py-0.5 rounded">
                RBAC v2.4
              </span>
            </div>
            <p className="text-blue-100 text-xs mt-0.5">
              Statutory Access for Mining Directors, Officers &amp; Field Staff
            </p>
          </div>

          {/* Statutory Advisory Notice */}
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-[11px] text-amber-900 flex items-start gap-2">
            <AlertCircle size={14} className="text-amber-700 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Statutory Warning:</strong> Unauthorized access to this portal is strictly prohibited and punishable under the IT Act 2000 &amp; TS Mineral Rules.
            </span>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Role Preset Selector */}
            <div className="bg-blue-50/60 border border-blue-200 rounded p-3 text-xs">
              <label className="text-gov-800 font-bold block mb-1.5 flex items-center justify-between">
                <span>Select Department Role for Demo:</span>
                <span className="text-[10px] text-gov-600 font-normal">{DEMO_ACCOUNTS.length} Active Roles</span>
              </label>
              <select
                value={selectedRole.username}
                onChange={(e) => {
                  const acc = DEMO_ACCOUNTS.find((a) => a.username === e.target.value)
                  if (acc) handleSelectAccount(acc)
                }}
                className="w-full bg-white border border-blue-300 rounded px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-gov-600"
              >
                {DEMO_ACCOUNTS.map((acc) => (
                  <option key={acc.username} value={acc.username}>
                    {acc.roleName} — {acc.username}
                  </option>
                ))}
              </select>

              {/* If District Officer is chosen, allow picking ANY of the 33 Telangana districts */}
              {selectedRole.roleCode === 'R04_DISTRICT_OFFICER' && (
                <div className="mt-2.5 pt-2 border-t border-blue-200/90">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                      <MapPin size={12} className="text-gov-600" />
                      <span>Assigned District Jurisdiction:</span>
                    </label>
                    <span className="text-[10px] text-amber-900 font-bold bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded uppercase">
                      33 Districts Available
                    </span>
                  </div>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-gov-600"
                  >
                    {TELANGANA_DISTRICT_NAMES.map((d) => (
                      <option key={d} value={d}>
                        {d} District ({TELANGANA_DISTRICTS[d]?.teluguName || ''}) — {TELANGANA_DISTRICTS[d]?.zone}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-600 mt-1 leading-snug">
                    Officers logged in from <strong>{selectedDistrict}</strong> can <em>only</em> access {selectedDistrict} map data, leases, and fleet; panning or inspecting other locations is strictly restricted.
                  </p>
                </div>
              )}

              <div className="mt-2 pt-2 border-t border-blue-200/80 flex items-center justify-between text-[11px]">
                <div className="text-slate-600 truncate pr-2">
                  <span className="font-semibold text-slate-800">{selectedRole.fullName}</span> ({selectedRole.designation})
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickLogin(selectedRole)}
                  className="px-2 py-0.5 bg-gov-600 hover:bg-gov-700 text-white rounded font-bold text-[10px] whitespace-nowrap cursor-pointer shadow-2xs"
                >
                  ⚡ 1-Click Login
                </button>
              </div>
            </div>

            <div>
              <label className="text-slate-700 text-xs font-bold block mb-1">
                Official User ID / Email Address <span className="text-red-600">*</span>
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin@mining.telangana.gov.in"
                required
                autoComplete="username"
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 text-xs font-medium placeholder:text-slate-400 outline-none focus:border-gov-600 focus:ring-1 focus:ring-gov-600 transition-colors shadow-xs font-mono"
              />
            </div>

            <div>
              <label className="text-slate-700 text-xs font-bold block mb-1">
                Password <span className="text-red-600">*</span>
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
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 pr-10 text-slate-900 text-xs font-medium placeholder:text-slate-400 outline-none focus:border-gov-600 focus:ring-1 focus:ring-gov-600 transition-colors shadow-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                  title={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded p-2.5 text-xs text-red-700">
                <AlertCircle size={14} className="flex-shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full bg-gov-600 hover:bg-gov-700 disabled:opacity-60 text-white font-bold py-2.5 rounded transition-all text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying Credentials...
                </>
              ) : (
                <>
                  <Lock size={14} />
                  Login to MineGIS Portal
                </>
              )}
            </button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200"></span>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-500">
                <span className="bg-white px-2">National SSO Integration</span>
              </div>
            </div>

            <button
              onClick={() => window.location.assign('/sso-portal')}
              type="button"
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold py-2 rounded transition-colors text-xs flex items-center justify-center gap-2 border border-slate-300 shadow-xs cursor-pointer"
            >
              <ShieldCheck size={15} className="text-gov-600" />
              Sign in with e-Pramaan (NIC SSO)
            </button>
          </form>
        </div>

        {/* ── Official RBAC Roles & Demo Credentials Matrix Table ── */}
        <div className="w-full bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h4 className="font-bold text-xs text-gov-800 flex items-center gap-1.5 uppercase tracking-wide">
                <UserCheck size={15} className="text-gov-600" />
                Department Role Matrix &amp; Demo Credentials Directory
              </h4>
              <p className="text-[11px] text-slate-500">
                Authorized roles configured for the Telangana State Mining Governance Portal
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold self-start sm:self-auto">
              <CheckCircle2 size={12} className="text-emerald-600" />
              All Roles Active &amp; Verified
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-300 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Email / User ID</th>
                  <th className="py-2.5 px-4">Password</th>
                  <th className="py-2.5 px-4">Comments / Scope</th>
                  <th className="py-2.5 px-4 text-right">Quick Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isCurrent = username === acc.username
                  const isViewOnly = acc.roleName.toLowerCase().includes('view')

                  return (
                    <tr
                      key={acc.username}
                      className={isCurrent ? 'bg-blue-50/70 font-medium' : 'hover:bg-slate-50/80'}
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{acc.roleName}</span>
                          {isViewOnly && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded border border-emerald-300">
                              Resolved
                            </span>
                          )}
                          {acc.district && acc.district !== 'Statewide' && !acc.district.includes('HQ') && !acc.district.includes('Secretariat') && (
                            <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded border border-amber-300 flex items-center gap-1">
                              🔒 {acc.district} Only
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal">{acc.designation}</div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-800 text-[11px]">
                        {acc.username}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600 text-[11px]">
                        {acc.password}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                        {acc.comment ? (
                          <span className={clsx(
                            "px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                            acc.comment.includes('Restricted') 
                              ? "bg-amber-50 border-amber-300 text-amber-900 font-bold"
                              : "bg-slate-100 border-slate-200 text-slate-700"
                          )}>
                            {acc.comment}
                          </span>
                        ) : (
                          <span className="text-slate-500">{acc.department}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleQuickLogin(acc)}
                          className="px-2.5 py-1 bg-white hover:bg-gov-600 hover:text-white text-gov-700 border border-gov-600 rounded text-[11px] font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Sign In</span>
                          <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Official Government Portal Footer */}
      <footer className="bg-white border-t border-slate-300 py-4 px-6 text-center text-xs text-slate-600 shadow-inner">
        <div className="max-w-6xl mx-auto space-y-1">
          <p className="font-semibold text-slate-700">
            MineGIS-TS &copy; 2026 Department of Mines &amp; Geology, Government of Telangana. All Rights Reserved.
          </p>
          <p className="text-[11px] text-slate-500">
            Designed, Developed and Hosted by National Informatics Centre (NIC) / Centre for Good Governance (CGG)
          </p>
          <div className="flex justify-center gap-4 text-[11px] text-gov-600 pt-1">
            <span className="hover:underline cursor-pointer">Terms of Use</span>
            <span>|</span>
            <span className="hover:underline cursor-pointer">Privacy Policy</span>
            <span>|</span>
            <span className="hover:underline cursor-pointer">Hyperlink Policy</span>
            <span>|</span>
            <span className="hover:underline cursor-pointer">Helpdesk: 1800-425-MINE</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
