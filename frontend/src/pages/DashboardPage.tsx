import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Map, TrendingUp, AlertTriangle, ShieldCheck, PieChart, Activity,
  IndianRupee, Users, FileText, Zap, BarChart2, Clock, ChevronRight,
  TriangleAlert, CheckCircle2, Lock
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../store'
import { apiClient } from '../api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  kpis: {
    total_leases: number
    active_operations: number
    inactive_closed: number
    total_royalty_due: number
  }
  mineral_distribution: { name: string; value: number }[]
  district_stats: { district: string; leases: number; area_ha: number; active: number; royalty_cr: number }[]
  production_trends: { month: string; production: number; target: number }[]
  predictive_insights: { id: string; type: string; detail: string; severity: string; action: string }[]
}

interface AuditSummary {
  total_actions: number
  actions_this_week: number
  actions_this_month: number
  by_action: { action: string; count: number }[]
  recent_logins: { username: string; ip_address: string; timestamp: string }[]
}

// ─── Mock data for showcase ───────────────────────────────────────────────────

const MOCK_DISTRICT_STATS = [
  { district: 'Karimnagar', leases: 28, area_ha: 4820, active: 22, royalty_cr: 12.4 },
  { district: 'Nalgonda',   leases: 24, area_ha: 3960, active: 18, royalty_cr: 9.8  },
  { district: 'Khammam',    leases: 22, area_ha: 3710, active: 17, royalty_cr: 8.6  },
  { district: 'Warangal',   leases: 18, area_ha: 2980, active: 14, royalty_cr: 7.2  },
  { district: 'Adilabad',   leases: 16, area_ha: 2640, active: 11, royalty_cr: 5.9  },
]

const MOCK_STATS: DashboardStats = {
  kpis: { total_leases: 154, active_operations: 112, inactive_closed: 42, total_royalty_due: 45000000 },
  mineral_distribution: [
    { name: 'Granite', value: 45 },
    { name: 'Limestone', value: 25 },
    { name: 'Quartz', value: 15 },
    { name: 'Feldspar', value: 15 },
  ],
  district_stats: MOCK_DISTRICT_STATS,
  production_trends: [
    { month: 'Jan', production: 12000, target: 10000 },
    { month: 'Feb', production: 13500, target: 10000 },
    { month: 'Mar', production: 11000, target: 12000 },
    { month: 'Apr', production: 14000, target: 12000 },
    { month: 'May', production: 16000, target: 15000 },
    { month: 'Jun', production: 15500, target: 15000 },
    { month: 'Jul', production: 17200, target: 16000 },
    { month: 'Aug', production: 15800, target: 16000 },
  ]
}

const MOCK_PREDICTIVE = [
  { id: 'P-001', type: 'Lease Expiry Risk',   detail: '18 leases expire within 60 days',            severity: 'HIGH',   action: 'Initiate Renewals' },
  { id: 'P-002', type: 'Revenue Shortfall',    detail: 'Q3 royalty collection 13% below forecast',   severity: 'MEDIUM', action: 'Send Reminders' },
  { id: 'P-003', type: 'Production Anomaly',   detail: '3 mines flagged for unusual output spikes',   severity: 'HIGH',   action: 'Schedule Inspection' },
  { id: 'P-004', type: 'Unauthorized Activity',detail: 'Satellite diff detected in sector B-7',       severity: 'HIGH',   action: 'Investigate' },
  { id: 'P-005', type: 'Survey Overdue',       detail: '9 leases without DGPS survey in 12 months',  severity: 'LOW',    action: 'Assign Surveyors' },
]

const MOCK_AUDIT: AuditSummary = {
  total_actions: 4821,
  actions_this_week: 312,
  actions_this_month: 1138,
  by_action: [
    { action: 'VIEW', count: 2410 },
    { action: 'UPDATE', count: 890 },
    { action: 'LOGIN', count: 754 },
    { action: 'CREATE', count: 497 },
    { action: 'DELETE', count: 270 },
  ],
  recent_logins: [
    { username: 'dmg_admin', ip_address: '192.168.1.10', timestamp: new Date(Date.now() - 3 * 60000).toISOString() },
    { username: 'karimnagar_officer', ip_address: '10.0.0.45', timestamp: new Date(Date.now() - 28 * 60000).toISOString() },
    { username: 'surveyor_k_rao', ip_address: '10.0.0.82', timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
  ],
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [audit, setAudit] = useState<AuditSummary>(MOCK_AUDIT)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'overview' | 'operations' | 'governance'>('overview')

  useEffect(() => {
    Promise.all([
      apiClient.get<DashboardStats>('/leases/dashboard-stats/').catch(() => ({ data: MOCK_STATS })),
      apiClient.get<{ data: AuditSummary }>('/audit/logs/summary/').catch(() => ({ data: MOCK_AUDIT })),
    ]).then(([statsRes, auditRes]) => {
      setStats(statsRes.data)
      setAudit((auditRes as any).data ?? MOCK_AUDIT)
    }).finally(() => setLoading(false))
  }, [])

  if (loading || !stats) {
    return (
      <div className="flex h-screen items-center justify-center bg-map-bg">
        <div className="flex flex-col items-center gap-4">
          <Activity className="animate-spin text-gov-400" size={48} />
          <p className="text-map-muted text-sm">Loading MIS Dashboard…</p>
        </div>
      </div>
    )
  }

  const { kpis, mineral_distribution, production_trends, district_stats } = stats
  const maxVal = Math.max(...production_trends.map(t => Math.max(t.production, t.target)))
  const formatCr = (val: number) => `₹${(val / 10000000).toFixed(2)} Cr`
  const formatRelTime = (iso: string) => {
    const diff = (Date.now() - new Date(iso).getTime()) / 60000
    if (diff < 1) return 'just now'
    if (diff < 60) return `${Math.floor(diff)}m ago`
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
    return `${Math.floor(diff / 1440)}d ago`
  }

  return (
    <div className="min-h-screen bg-map-bg text-map-text font-sans overflow-auto">

      {/* ── Top Navigation ── */}
      <div className="sticky top-0 z-20 bg-map-bg/95 backdrop-blur-xl border-b border-map-border">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-map-muted hover:text-white transition-colors text-sm">
              <Map size={16} /> Web-GIS Map
            </Link>
            <div className="h-4 w-px bg-map-border" />
            <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
              {(['overview', 'operations', 'governance'] as const).map(s => (
                <button key={s} onClick={() => setActiveSection(s)}
                  className={clsx(
                    'px-4 py-1.5 rounded text-xs font-medium capitalize transition-all',
                    activeSection === s ? 'bg-gov-600 text-white shadow' : 'text-map-muted hover:text-white'
                  )}
                >{s}</button>
              ))}
            </div>
          </div>
          <div className="text-right leading-none">
            <div className="text-white text-sm font-semibold">{user?.full_name || user?.username}</div>
            <div className="text-map-muted text-xs">{user?.profile?.role?.replace(/_/g, ' ')}</div>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <BarChart2 size={28} className="text-gov-400" />
              {activeSection === 'overview' && 'Executive MIS Dashboard'}
              {activeSection === 'operations' && 'Operational & Financial Intelligence'}
              {activeSection === 'governance' && 'Platform Governance & Audit'}
            </h1>
            <p className="text-sm text-map-muted mt-1">
              Dept. of Mines &amp; Geology, Government of Telangana
              &nbsp;·&nbsp;as of {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2 print-hidden">
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-all text-xs font-medium"
            >
              <FileText size={14} /> Export Report
            </button>
            <Link to="/" className="flex items-center gap-2 px-4 py-2 bg-gov-600 hover:bg-gov-500 text-white rounded-lg transition-all text-sm font-medium shadow-lg shadow-gov-900/50">
              <Map size={16} /> Open GIS Map
            </Link>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            OVERVIEW SECTION
        ══════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'overview' && (
          <div className="space-y-8">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <KpiCard value={kpis.total_leases.toString()} label="Total Leases" trend="+12% YoY" icon={<PieChart size={18} />} color="blue" />
              <KpiCard value={kpis.active_operations.toString()} label="Active Operations" sub={`${kpis.inactive_closed} closed`} icon={<Activity size={18} />} color="green" />
              <KpiCard value={formatCr(kpis.total_royalty_due)} label="Royalty Outstanding" trend="92% collected" icon={<IndianRupee size={18} />} color="emerald" />
              <KpiCard value="24" label="Active Alerts" trend="Needs review" icon={<AlertTriangle size={18} />} color="red" urgent />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bar Chart */}
              <div className="col-span-2 bg-map-panel/60 backdrop-blur-xl border border-map-border/50 p-6 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <TrendingUp size={16} className="text-gov-400" /> Monthly Production vs Targets
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-map-muted">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gov-500 inline-block" /> Actual</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-white/20 inline-block" /> Target</span>
                  </div>
                </div>
                <div className="h-56 flex items-end gap-2">
                  {production_trends.map((item) => {
                    const prodH = (item.production / maxVal) * 100
                    const targH = (item.target / maxVal) * 100
                    return (
                      <div key={item.month} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 px-3 py-2 rounded-lg text-xs whitespace-nowrap z-10 border border-white/10 pointer-events-none">
                          <p className="text-gov-400 font-semibold">{item.month}</p>
                          <p>Actual: <span className="text-white">{item.production.toLocaleString()} MT</span></p>
                          <p>Target: <span className="text-white">{item.target.toLocaleString()} MT</span></p>
                        </div>
                        <div className="w-full flex justify-center gap-0.5 h-[85%] items-end">
                          <div className="w-2/5 bg-white/10 rounded-t transition-all" style={{ height: `${targH}%` }} />
                          <div className="w-2/5 bg-gradient-to-t from-gov-700 to-gov-400 rounded-t shadow-[0_0_12px_rgba(37,99,168,0.4)] transition-all" style={{ height: `${prodH}%` }} />
                        </div>
                        <div className="mt-2 text-[10px] text-map-muted font-medium">{item.month}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Mineral Distribution */}
              <div className="bg-map-panel/60 backdrop-blur-xl border border-map-border/50 p-6 rounded-2xl shadow-xl flex flex-col gap-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <PieChart size={16} className="text-purple-400" /> Mineral Distribution
                </h3>
                <p className="text-xs text-map-muted -mt-2">By share of active leases</p>
                <div className="flex flex-col gap-4 flex-1 justify-center">
                  {mineral_distribution.map((item, i) => {
                    const colors = ['from-gov-500 to-gov-300', 'from-purple-600 to-purple-400', 'from-emerald-600 to-emerald-400', 'from-orange-600 to-orange-400']
                    const textClr = ['text-gov-300', 'text-purple-300', 'text-emerald-300', 'text-orange-300']
                    return (
                      <div key={item.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={clsx('font-medium', textClr[i % 4])}>{item.name}</span>
                          <span className="text-white font-bold">{item.value}%</span>
                        </div>
                        <div className="w-full bg-black/30 h-2 rounded-full overflow-hidden">
                          <div className={clsx('h-full rounded-full bg-gradient-to-r transition-all duration-1000', colors[i % 4])} style={{ width: `${item.value}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* District Stats + Predictive */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* District Summary — GIS linked */}
              <div className="bg-map-panel/60 backdrop-blur-xl border border-map-border/50 rounded-2xl shadow-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Map size={15} className="text-gov-400" /> District-wise Lease Statistics</h3>
                  <Link to="/" className="text-xs text-gov-400 hover:text-gov-300 flex items-center gap-1 transition-colors">
                    Open on Map <ChevronRight size={12} />
                  </Link>
                </div>
                <div className="divide-y divide-white/5">
                  {district_stats?.map((d) => (
                    <div key={d.district} className="px-5 py-3 flex items-center hover:bg-white/5 transition-colors group cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium">{d.district}</div>
                        <div className="text-xs text-map-muted">{d.area_ha.toLocaleString()} ha total • {d.active} active</div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-sm font-bold text-emerald-400">₹{d.royalty_cr} Cr</div>
                        <div className="text-xs text-map-muted">{d.leases} leases</div>
                      </div>
                      <ChevronRight size={14} className="ml-2 text-map-border group-hover:text-gov-400 transition-colors flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Predictive Analytics */}
              <div className="bg-map-panel/60 backdrop-blur-xl border border-map-border/50 rounded-2xl shadow-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                  <Zap size={15} className="text-yellow-400" />
                  <h3 className="text-sm font-semibold text-white">Predictive Analytics &amp; AI Insights</h3>
                  <Link to="/anomaly-hub" className="text-xs text-gov-400 hover:text-gov-300 flex items-center gap-1 transition-colors ml-auto">
                    Open Anomaly Hub <ChevronRight size={12} />
                  </Link>
                </div>
                <div className="divide-y divide-white/5">
                  {(stats.predictive_insights || MOCK_PREDICTIVE).map((p) => (
                    <div key={p.id} className="px-5 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors">
                      <div className={clsx('mt-0.5 w-2 h-2 rounded-full flex-shrink-0 mt-2',
                        p.severity === 'HIGH' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' :
                        p.severity === 'MEDIUM' ? 'bg-orange-500' : 'bg-yellow-600'
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white">{p.type}</div>
                        <div className="text-xs text-map-muted mt-0.5">{p.detail}</div>
                      </div>
                      <button className="text-[10px] px-2 py-1 rounded-full border border-gov-600/50 text-gov-400 hover:bg-gov-600/20 transition-colors flex-shrink-0 font-medium whitespace-nowrap">
                        {p.action}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Compliance Activity Table */}
            <div className="bg-map-panel/60 backdrop-blur-xl border border-map-border/50 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400" /> Recent Compliance Alerts &amp; Actions
                </h3>
                <button className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors text-white">View All</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="text-map-muted text-[11px] uppercase tracking-wider bg-white/5">
                    <th className="p-4">Event ID</th><th className="p-4">Lease / Entity</th>
                    <th className="p-4">Category</th><th className="p-4">Status</th><th className="p-4">Timestamp</th>
                  </tr></thead>
                  <tbody className="text-sm divide-y divide-white/5">
                    {[
                      { id: 'EVT-9921', entity: 'Devi Granites (#304)', cat: 'Spatial Conflict / Overlap', status: 'Investigating', sc: 'red', time: '2 hours ago' },
                      { id: 'EVT-9920', entity: 'Srinivasa Sand & Gravel', cat: 'Royalty Payment Delayed', status: 'Warning Sent', sc: 'orange', time: '5 hours ago' },
                      { id: 'EVT-9919', entity: 'Vehicle: TS08UA1203', cat: 'Route Deviation (Geofence)', status: 'Resolved', sc: 'emerald', time: 'Yesterday' },
                      { id: 'EVT-9918', entity: 'Sri Balaji Mines (#198)', cat: 'Survey Overdue', status: 'Pending', sc: 'yellow', time: '3 days ago' },
                    ].map(row => (
                      <tr key={row.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-gov-300 font-mono text-xs">{row.id}</td>
                        <td className="p-4 text-white font-medium">{row.entity}</td>
                        <td className="p-4 text-map-muted">{row.cat}</td>
                        <td className="p-4">
                          <span className={clsx('px-2 py-1 rounded-full text-xs font-medium',
                            row.sc === 'red' ? 'bg-red-500/20 text-red-400' :
                            row.sc === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                            row.sc === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          )}>{row.status}</span>
                        </td>
                        <td className="p-4 text-map-muted text-xs">{row.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            OPERATIONS SECTION — Module 3
        ══════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'operations' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <KpiCard value="1,84,250 MT" label="Total Production (YTD)" trend="+8.4% vs target" icon={<Activity size={18} />} color="blue" />
              <KpiCard value="₹4.5 Cr" label="Royalty Collected" trend="92% efficiency" icon={<IndianRupee size={18} />} color="green" />
              <KpiCard value="₹40.2 L" label="Penalties Levied" sub="FY 2024-25" icon={<TriangleAlert size={18} />} color="red" />
              <KpiCard value="3" label="Anomalies Detected" trend="AI/ML flagged" icon={<Zap size={18} />} color="orange" urgent />
            </div>

            {/* Anomaly Alerts */}
            <div className="bg-map-panel/60 backdrop-blur-xl border border-map-border/50 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
                <Zap size={16} className="text-yellow-400 animate-pulse" />
                <h3 className="text-sm font-semibold text-white">AI/ML Anomaly Detection — Flagged Production Records</h3>
              </div>
              <div className="divide-y divide-white/5">
                {[
                  { lease: 'ML/TS/2019/00214', mine: 'Krishnaveni Granites', flag: 'PRODUCTION_WITHOUT_WORKFORCE', score: 0.85, district: 'Karimnagar', period: '2024-07' },
                  { lease: 'ML/TS/2020/00187', mine: 'Lakshmi Sand Quarry', flag: 'HIGH_ROYALTY_OUTSTANDING', score: 0.72, district: 'Nalgonda', period: '2024-07' },
                  { lease: 'ML/TS/2018/00098', mine: 'Sai Limestone Works', flag: 'LOW_DISPATCH_EFFICIENCY', score: 0.65, district: 'Khammam', period: '2024-06' },
                ].map((a, i) => (
                  <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-red-400 font-bold text-sm">{Math.round(a.score * 100)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-semibold">{a.mine}</div>
                      <div className="text-xs text-map-muted">{a.lease} · {a.district} · {a.period}</div>
                      <div className="text-xs text-red-400 mt-1 font-medium">{a.flag.replace(/_/g, ' ')}</div>
                    </div>
                    <Link to="/" className="text-xs px-3 py-1.5 bg-gov-600/30 hover:bg-gov-600 text-gov-300 hover:text-white border border-gov-600/50 rounded-lg transition-all font-medium flex items-center gap-1">
                      <Map size={11} /> View on Map
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial summary by district */}
            <div className="bg-map-panel/60 backdrop-blur-xl border border-map-border/50 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <IndianRupee size={15} className="text-emerald-400" /> Financial Revenue Tracking — FY 2024-25
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="text-map-muted text-[11px] uppercase tracking-wider bg-white/5">
                    <th className="p-4">District</th><th className="p-4">Payable</th>
                    <th className="p-4">Collected</th><th className="p-4">Outstanding</th><th className="p-4">Collection %</th>
                  </tr></thead>
                  <tbody className="text-sm divide-y divide-white/5">
                    {district_stats?.map(d => {
                      const payable = d.royalty_cr * 1.12
                      const collected = d.royalty_cr
                      const outstanding = payable - collected
                      const pct = Math.round((collected / payable) * 100)
                      return (
                        <tr key={d.district} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 text-white font-medium">{d.district}</td>
                          <td className="p-4 text-map-text">₹{payable.toFixed(1)} Cr</td>
                          <td className="p-4 text-emerald-400 font-semibold">₹{collected.toFixed(1)} Cr</td>
                          <td className="p-4 text-red-400">₹{outstanding.toFixed(1)} Cr</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-black/30 h-1.5 rounded-full overflow-hidden">
                                <div className={clsx('h-full rounded-full', pct >= 90 ? 'bg-emerald-500' : pct >= 75 ? 'bg-yellow-500' : 'bg-red-500')} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-map-text font-medium">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            GOVERNANCE SECTION — Module 5
        ══════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'governance' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <KpiCard value={audit.total_actions.toLocaleString()} label="Total Audit Events" sub="All time" icon={<Lock size={18} />} color="blue" />
              <KpiCard value={audit.actions_this_week.toString()} label="Actions This Week" icon={<Clock size={18} />} color="green" />
              <KpiCard value={audit.actions_this_month.toString()} label="Actions This Month" icon={<FileText size={18} />} color="purple" />
              <KpiCard value="8" label="Active User Roles" sub="RBAC defined" icon={<Users size={18} />} color="orange" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Audit by action */}
              <div className="bg-map-panel/60 backdrop-blur-xl border border-map-border/50 rounded-2xl shadow-xl p-6">
                <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
                  <ShieldCheck size={15} className="text-emerald-400" /> Actions by Type
                </h3>
                <div className="space-y-3">
                  {audit.by_action.map((a) => {
                    const total = audit.by_action.reduce((s, x) => s + x.count, 0)
                    const pct = Math.round((a.count / total) * 100)
                    const clrMap: Record<string, string> = {
                      VIEW: 'bg-blue-500',  UPDATE: 'bg-gov-500',
                      LOGIN: 'bg-purple-500', CREATE: 'bg-emerald-500', DELETE: 'bg-red-500',
                    }
                    return (
                      <div key={a.action}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-map-muted font-medium">{a.action}</span>
                          <span className="text-white font-bold">{a.count.toLocaleString()} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-black/30 h-2 rounded-full overflow-hidden">
                          <div className={clsx('h-full rounded-full transition-all duration-1000', clrMap[a.action] || 'bg-white/30')} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Recent Logins */}
              <div className="bg-map-panel/60 backdrop-blur-xl border border-map-border/50 rounded-2xl shadow-xl p-6">
                <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
                  <Users size={15} className="text-gov-400" /> Recent Login Activity
                </h3>
                <div className="space-y-3">
                  {audit.recent_logins.map((l, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                      <div className="w-8 h-8 rounded-full bg-gov-600/40 border border-gov-600/30 flex items-center justify-center text-gov-300 text-xs font-bold flex-shrink-0">
                        {l.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium truncate">{l.username}</div>
                        <div className="text-xs text-map-muted font-mono">{l.ip_address}</div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 size={11} /> Verified</div>
                        <div className="text-xs text-map-muted mt-0.5">{formatRelTime(l.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RBAC Roles Table */}
            <div className="bg-map-panel/60 backdrop-blur-xl border border-map-border/50 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Lock size={15} className="text-gov-400" /> Role-Based Access Control (RBAC) Matrix
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="text-map-muted text-[11px] uppercase tracking-wider bg-white/5">
                    <th className="p-4">Role</th><th className="p-4 text-center">Map View</th>
                    <th className="p-4 text-center">Data Entry</th><th className="p-4 text-center">Approve</th>
                    <th className="p-4 text-center">Audit Logs</th><th className="p-4 text-center">User Mgmt</th>
                  </tr></thead>
                  <tbody className="text-sm divide-y divide-white/5">
                    {[
                      { role: 'R01 Super Admin', map: true, entry: true, approve: true, audit: true, users: true },
                      { role: 'R02 State Executive', map: true, entry: false, approve: true, audit: true, users: false },
                      { role: 'R04 District Officer', map: true, entry: true, approve: true, audit: true, users: false },
                      { role: 'R05 Field Officer', map: true, entry: true, approve: false, audit: false, users: false },
                      { role: 'R07 GIS Analyst', map: true, entry: true, approve: false, audit: false, users: false },
                      { role: 'R08 Auditor', map: true, entry: false, approve: false, audit: true, users: false },
                      { role: 'R11 Report Viewer', map: true, entry: false, approve: false, audit: false, users: false },
                    ].map(row => (
                      <tr key={row.role} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-white font-medium">{row.role}</td>
                        {[row.map, row.entry, row.approve, row.audit, row.users].map((v, i) => (
                          <td key={i} className="p-4 text-center">
                            {v ? <CheckCircle2 size={16} className="text-emerald-400 mx-auto" /> : <span className="text-white/20 text-lg mx-auto block text-center">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── KPI Card Sub-component ───────────────────────────────────────────────────

function KpiCard({ value, label, trend, sub, icon, color, urgent }: {
  value: string; label: string; trend?: string; sub?: string;
  icon: React.ReactNode; color: string; urgent?: boolean;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/15 border-blue-500/20 text-blue-400',
    green: 'bg-green-500/15 border-green-500/20 text-green-400',
    emerald: 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400',
    red: 'bg-red-500/15 border-red-500/20 text-red-400',
    orange: 'bg-orange-500/15 border-orange-500/20 text-orange-400',
    purple: 'bg-purple-500/15 border-purple-500/20 text-purple-400',
  }

  return (
    <div className={clsx(
      'bg-map-panel/60 backdrop-blur-xl border border-map-border/50 p-5 rounded-2xl shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group',
      urgent && 'border-red-500/30'
    )}>
      {urgent && <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />}
      <div className="flex items-center justify-between mb-3">
        <div className="text-map-muted text-xs font-medium">{label}</div>
        <div className={clsx('w-8 h-8 rounded-full border flex items-center justify-center', colorMap[color] || colorMap.blue)}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-white tracking-tight relative">{value}</div>
      {(trend || sub) && (
        <div className={clsx('mt-2 text-xs font-medium', urgent ? 'text-red-400' : 'text-map-muted')}>
          {trend || sub}
        </div>
      )}
      <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-white/5" />
    </div>
  )
}
