import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Map, TrendingUp, AlertTriangle, ShieldCheck, PieChart, Activity,
  IndianRupee, Users, FileText, Zap, BarChart2, Clock, ChevronRight,
  CheckCircle2, Lock, Filter, Search, ArrowUpDown, Truck, Scale,
  Download, Printer, RefreshCw, Eye, AlertCircle, Building2, MapPin
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../store'
import { apiClient } from '../api/client'
import TopBar from '../components/ui/TopBar'
import DistrictCadastralMap from '../components/dashboard/DistrictCadastralMap'
import { TELANGANA_DISTRICTS, TELANGANA_DISTRICT_NAMES, getUserJurisdiction } from '../utils/districts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DistrictRow {
  district: string
  teluguName: string
  zone: string
  totalLeases: number
  activeMines: number
  majorMinerals: string
  dispatchMT: number
  royaltyTargetCr: number
  royaltyRealizedCr: number
  collectionPct: number
  inspectionsOverdue: number
  status: 'OPTIMAL' | 'MODERATE' | 'ATTENTION'
}

// ─── 33 Districts Official Data Generator ─────────────────────────────────────

const BASE_DISTRICT_DATA: Record<string, Partial<DistrictRow>> = {
  'Rangareddy':             { totalLeases: 26, activeMines: 22, majorMinerals: 'Road Metal, Granite, Quartz', dispatchMT: 148500, royaltyTargetCr: 12.0, royaltyRealizedCr: 11.4 },
  'Nizamabad':              { totalLeases: 19, activeMines: 16, majorMinerals: 'River Sand, Granite, Quartzite', dispatchMT: 98000, royaltyTargetCr: 8.5, royaltyRealizedCr: 7.9 },
  'Bhadradri Kothagudem':   { totalLeases: 32, activeMines: 28, majorMinerals: 'Coal, Iron Ore, Dolomite', dispatchMT: 320000, royaltyTargetCr: 21.0, royaltyRealizedCr: 19.8 },
  'Karimnagar':             { totalLeases: 28, activeMines: 24, majorMinerals: 'Tan Brown Granite, Sand', dispatchMT: 185000, royaltyTargetCr: 14.5, royaltyRealizedCr: 13.8 },
  'Vikarabad':              { totalLeases: 18, activeMines: 15, majorMinerals: 'Limestone, White Clay', dispatchMT: 112000, royaltyTargetCr: 9.0, royaltyRealizedCr: 8.4 },
  'Nalgonda':               { totalLeases: 24, activeMines: 20, majorMinerals: 'Cement Limestone, Feldspar', dispatchMT: 165000, royaltyTargetCr: 11.5, royaltyRealizedCr: 10.2 },
  'Khammam':                { totalLeases: 22, activeMines: 18, majorMinerals: 'Granite, Coal, Sand', dispatchMT: 142000, royaltyTargetCr: 9.5, royaltyRealizedCr: 8.9 },
  'Warangal':               { totalLeases: 17, activeMines: 14, majorMinerals: 'Black Granite, Gravel', dispatchMT: 84000, royaltyTargetCr: 7.0, royaltyRealizedCr: 6.4 },
  'Adilabad':               { totalLeases: 16, activeMines: 12, majorMinerals: 'Iron Ore, Limestone, Clay', dispatchMT: 76000, royaltyTargetCr: 6.5, royaltyRealizedCr: 5.8 },
  'Mahabubnagar':           { totalLeases: 15, activeMines: 12, majorMinerals: 'Granite, Quartz, Sand', dispatchMT: 69000, royaltyTargetCr: 6.0, royaltyRealizedCr: 5.4 },
  'Sangareddy':             { totalLeases: 21, activeMines: 18, majorMinerals: 'Stone Aggregates, Laterite', dispatchMT: 128000, royaltyTargetCr: 9.8, royaltyRealizedCr: 9.1 },
  'Mancherial':             { totalLeases: 20, activeMines: 17, majorMinerals: 'Coal, Limestone, Sandstone', dispatchMT: 195000, royaltyTargetCr: 13.2, royaltyRealizedCr: 12.6 },
  'Peddapalli':             { totalLeases: 19, activeMines: 16, majorMinerals: 'Coal, River Sand', dispatchMT: 172000, royaltyTargetCr: 11.8, royaltyRealizedCr: 11.2 },
  'Suryapet':               { totalLeases: 14, activeMines: 11, majorMinerals: 'Cement Limestone, Sand', dispatchMT: 92000, royaltyTargetCr: 6.8, royaltyRealizedCr: 6.1 },
  'Jagtial':                { totalLeases: 13, activeMines: 10, majorMinerals: 'Granite, Gravel', dispatchMT: 58000, royaltyTargetCr: 5.2, royaltyRealizedCr: 4.8 },
  'Kamareddy':              { totalLeases: 12, activeMines: 9, majorMinerals: 'Stone Aggregates, Sand', dispatchMT: 51000, royaltyTargetCr: 4.8, royaltyRealizedCr: 4.3 },
  'Medak':                  { totalLeases: 14, activeMines: 11, majorMinerals: 'Quartz, Feldspar, Gravel', dispatchMT: 64000, royaltyTargetCr: 5.6, royaltyRealizedCr: 5.1 },
  'Siddipet':               { totalLeases: 11, activeMines: 9, majorMinerals: 'Road Metal, Gravel', dispatchMT: 48000, royaltyTargetCr: 4.2, royaltyRealizedCr: 3.9 },
  'Yadadri Bhuvanagiri':    { totalLeases: 15, activeMines: 13, majorMinerals: 'Granite, Quartzite, Sand', dispatchMT: 78000, royaltyTargetCr: 6.5, royaltyRealizedCr: 6.0 },
  'Mahabubabad':            { totalLeases: 12, activeMines: 10, majorMinerals: 'Granite, River Sand', dispatchMT: 56000, royaltyTargetCr: 4.9, royaltyRealizedCr: 4.5 },
  'Jogulamba Gadwal':       { totalLeases: 11, activeMines: 9, majorMinerals: 'Sand, Limestone', dispatchMT: 52000, royaltyTargetCr: 4.5, royaltyRealizedCr: 4.1 },
  'Nagarkurnool':           { totalLeases: 13, activeMines: 10, majorMinerals: 'Granite, Quartz', dispatchMT: 59000, royaltyTargetCr: 5.1, royaltyRealizedCr: 4.7 },
  'Wanaparthy':             { totalLeases: 9, activeMines: 7, majorMinerals: 'Gravel, Road Metal', dispatchMT: 38000, royaltyTargetCr: 3.5, royaltyRealizedCr: 3.2 },
  'Narayanpet':             { totalLeases: 8, activeMines: 6, majorMinerals: 'Limestone, Gravel', dispatchMT: 34000, royaltyTargetCr: 3.2, royaltyRealizedCr: 2.9 },
  'Nirmal':                 { totalLeases: 10, activeMines: 8, majorMinerals: 'Sand, Road Metal', dispatchMT: 44000, royaltyTargetCr: 4.0, royaltyRealizedCr: 3.7 },
  'Kumuram Bheem Asifabad': { totalLeases: 14, activeMines: 11, majorMinerals: 'Coal, Limestone', dispatchMT: 110000, royaltyTargetCr: 7.8, royaltyRealizedCr: 7.2 },
  'Jayashankar Bhupalpally':{ totalLeases: 16, activeMines: 13, majorMinerals: 'Coal, Sand, Quartzite', dispatchMT: 135000, royaltyTargetCr: 9.2, royaltyRealizedCr: 8.7 },
  'Mulugu':                 { totalLeases: 9, activeMines: 7, majorMinerals: 'River Sand, Gravel', dispatchMT: 42000, royaltyTargetCr: 3.8, royaltyRealizedCr: 3.5 },
  'Hanamkonda':             { totalLeases: 11, activeMines: 9, majorMinerals: 'Granite, Road Metal', dispatchMT: 52000, royaltyTargetCr: 4.6, royaltyRealizedCr: 4.2 },
  'Jangaon':                { totalLeases: 10, activeMines: 8, majorMinerals: 'Gravel, Granite', dispatchMT: 45000, royaltyTargetCr: 4.1, royaltyRealizedCr: 3.8 },
  'Rajanna Sircilla':       { totalLeases: 9, activeMines: 7, majorMinerals: 'Sand, Road Metal', dispatchMT: 39000, royaltyTargetCr: 3.6, royaltyRealizedCr: 3.3 },
  'Medchal-Malkajgiri':     { totalLeases: 13, activeMines: 11, majorMinerals: 'Granite, Quartz', dispatchMT: 68000, royaltyTargetCr: 5.8, royaltyRealizedCr: 5.4 },
  'Hyderabad':              { totalLeases: 3, activeMines: 2, majorMinerals: 'Minor Mineral Depots', dispatchMT: 15000, royaltyTargetCr: 1.5, royaltyRealizedCr: 1.4 },
}

function getAllDistrictStats(): DistrictRow[] {
  return TELANGANA_DISTRICT_NAMES.map((name) => {
    const geo = TELANGANA_DISTRICTS[name]
    const base = BASE_DISTRICT_DATA[name] || {}
    const totalLeases = base.totalLeases ?? 12
    const activeMines = base.activeMines ?? 10
    const dispatchMT = base.dispatchMT ?? 55000
    const royaltyTargetCr = base.royaltyTargetCr ?? 5.0
    const royaltyRealizedCr = base.royaltyRealizedCr ?? 4.6
    const collectionPct = Math.round((royaltyRealizedCr / royaltyTargetCr) * 100)
    const overdue = Math.max(0, Math.floor((totalLeases - activeMines) / 2))

    let status: 'OPTIMAL' | 'MODERATE' | 'ATTENTION' = 'OPTIMAL'
    if (collectionPct < 85) status = 'ATTENTION'
    else if (collectionPct < 92) status = 'MODERATE'

    return {
      district: name,
      teluguName: geo?.teluguName || name,
      zone: geo?.zone || 'State Zone',
      totalLeases,
      activeMines,
      majorMinerals: base.majorMinerals || 'Granite, Sand, Road Metal',
      dispatchMT,
      royaltyTargetCr,
      royaltyRealizedCr,
      collectionPct,
      inspectionsOverdue: overdue,
      status,
    }
  })
}

export interface MandalRow {
  mandal: string
  district: string
  totalLeases: number
  activeMines: number
  majorMinerals: string
  dispatchMT: number
  royaltyRealizedCr: number
  collectionPct: number
  surveyStatus: 'DGPS_VERIFIED' | 'ETS_IN_PROGRESS' | 'SCHEDULED'
}

const DISTRICT_MANDALS_MAP: Record<string, string[]> = {
  'Rangareddy': ['Maheshwaram', 'Ibrahimpatnam', 'Rajendranagar', 'Chevella', 'Shamshabad', 'Kandukur', 'Farooqnagar', 'Hayathnagar', 'Moinabad', 'Shankarpally'],
  'Nizamabad': ['Bodhan', 'Kotgiri', 'Armoor', 'Nizamabad South', 'Nizamabad North', 'Varni', 'Bheemgal', 'Balkonda', 'Navipet', 'Renjal'],
  'Bhadradri Kothagudem': ['Kothagudem', 'Paloncha', 'Yellandu', 'Manuguru', 'Burgampahad', 'Bhadrachalam', 'Aswaraopeta', 'Dammapeta'],
  'Karimnagar': ['Karimnagar', 'Manakondur', 'Choppadandi', 'Huzurabad', 'Jammikunta', 'Gangadhara', 'Timmapur'],
  'Mahabubnagar': ['Mahabubnagar Urban', 'Mahabubnagar Rural', 'Jadcherla', 'Bhoothpur', 'Devarkadra', 'Hanwada'],
  'Nalgonda': ['Miryalaguda', 'Nalgonda', 'Mellacheruvu', 'Devarakonda', 'Chityal', 'Nakrekal'],
  'Vikarabad': ['Tandur', 'Vikarabad', 'Pargi', 'Kodangal', 'Mominpet'],
}

function getDistrictMandalStats(districtName: string): MandalRow[] {
  const mandals = DISTRICT_MANDALS_MAP[districtName] || [
    `${districtName} Central`,
    `${districtName} North`,
    `${districtName} South`,
    `${districtName} East`,
    `${districtName} West`,
    `${districtName} Rural`,
  ]

  return mandals.map((m, idx) => {
    const totalLeases = Math.max(1, 3 + ((idx * 2) % 5))
    const activeMines = Math.max(1, totalLeases - (idx % 2))
    const dispatchMT = 12000 + (idx * 5500)
    const royalty = Number((1.2 + (idx * 0.45)).toFixed(2))
    const pct = Math.min(100, 88 + (idx * 3) % 14)
    return {
      mandal: m,
      district: districtName,
      totalLeases,
      activeMines,
      majorMinerals: idx % 2 === 0 ? 'Granite / Road Metal' : 'River Sand / Quartz',
      dispatchMT,
      royaltyRealizedCr: royalty,
      collectionPct: pct,
      surveyStatus: idx % 3 === 0 ? 'DGPS_VERIFIED' : idx % 3 === 1 ? 'ETS_IN_PROGRESS' : 'SCHEDULED',
    }
  })
}

// ─── Main Executive MIS Dashboard Component ───────────────────────────────────

export default function DashboardPage({
  embed = false,
  onNavigateToMap,
}: {
  embed?: boolean
  onNavigateToMap?: () => void
}) {
  const { user } = useAuthStore()
  const jurisdiction = getUserJurisdiction(user?.profile?.district)
  const isRestricted = jurisdiction.name !== 'Statewide'

  // Filter States
  const [selectedDistrict, setSelectedDistrict] = useState<string>(
    isRestricted ? jurisdiction.name : 'ALL'
  )
  const [selectedFY, setSelectedFY] = useState<string>('2025-26')
  const [selectedMineral, setSelectedMineral] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortField, setSortField] = useState<keyof DistrictRow>('royaltyRealizedCr')
  const [sortAsc, setSortAsc] = useState<boolean>(false)
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now')

  // Keep district synchronized if user is restricted
  useEffect(() => {
    if (isRestricted) {
      setSelectedDistrict(jurisdiction.name)
    }
  }, [isRestricted, jurisdiction.name])

  const allDistricts = useMemo(() => getAllDistrictStats(), [])

  // Filtered rows for District MIS table
  const displayedDistricts = useMemo(() => {
    let rows = allDistricts

    // Role-level constraint: if restricted to a district, officer only sees their district
    if (isRestricted) {
      rows = rows.filter((r) => r.district.toLowerCase() === jurisdiction.name.toLowerCase())
    } else if (selectedDistrict !== 'ALL') {
      rows = rows.filter((r) => r.district === selectedDistrict)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.district.toLowerCase().includes(q) ||
          r.teluguName.toLowerCase().includes(q) ||
          r.majorMinerals.toLowerCase().includes(q) ||
          r.zone.toLowerCase().includes(q)
      )
    }

    return [...rows].sort((a, b) => {
      const valA = a[sortField]
      const valB = b[sortField]
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA))
    })
  }, [allDistricts, isRestricted, jurisdiction.name, selectedDistrict, searchQuery, sortField, sortAsc])

  // Mandal statistics for restricted district officers
  const mandalStats = useMemo(() => {
    if (!isRestricted) return []
    return getDistrictMandalStats(jurisdiction.name)
  }, [isRestricted, jurisdiction.name])

  const filteredMandals = useMemo(() => {
    if (!searchQuery.trim()) return mandalStats
    const q = searchQuery.toLowerCase()
    return mandalStats.filter(
      (m) =>
        m.mandal.toLowerCase().includes(q) ||
        m.majorMinerals.toLowerCase().includes(q)
    )
  }, [mandalStats, searchQuery])

  // Aggregated KPI Stats
  const kpis = useMemo(() => {
    const rows = isRestricted
      ? allDistricts.filter((r) => r.district.toLowerCase() === jurisdiction.name.toLowerCase())
      : selectedDistrict !== 'ALL'
      ? allDistricts.filter((r) => r.district === selectedDistrict)
      : allDistricts

    const totalLeases = rows.reduce((s, r) => s + r.totalLeases, 0)
    const activeMines = rows.reduce((s, r) => s + r.activeMines, 0)
    const inactiveLeases = totalLeases - activeMines
    const targetCr = rows.reduce((s, r) => s + r.royaltyTargetCr, 0)
    const realizedCr = rows.reduce((s, r) => s + r.royaltyRealizedCr, 0)
    const dispatchMT = rows.reduce((s, r) => s + r.dispatchMT, 0)
    const overdueSurveys = rows.reduce((s, r) => s + r.inspectionsOverdue, 0)
    const realizationRate = targetCr > 0 ? Math.round((realizedCr / targetCr) * 100) : 0

    return {
      totalLeases,
      activeMines,
      inactiveLeases,
      targetCr: targetCr.toFixed(1),
      realizedCr: realizedCr.toFixed(1),
      outstandingCr: Math.max(0, targetCr - realizedCr).toFixed(1),
      realizationRate,
      dispatchMT: dispatchMT.toLocaleString('en-IN'),
      overdueSurveys,
      vehiclesActive: Math.round(rows.length * 3.4),
      transitAlerts: Math.round(rows.length * 0.7),
    }
  }, [allDistricts, isRestricted, jurisdiction.name, selectedDistrict])

  const handleSort = (field: keyof DistrictRow) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  const handleRefresh = () => {
    setLastRefreshed(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
  }

  const content = (
    <div className="max-w-7xl mx-auto w-full space-y-6">

        {/* ── Dashboard Title Banner ── */}
        <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full border-2 border-gov-600 bg-blue-50/50 flex items-center justify-center p-1 shadow-xs flex-shrink-0">
              <Building2 size={24} className="text-gov-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-gov-700 tracking-tight">
                  Mining &amp; Royalty Dashboard
                </h1>
                <span className="text-[10px] bg-gov-100 text-gov-800 font-bold px-2 py-0.5 rounded border border-gov-300 uppercase">
                  Official Summary
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Department of Mines &amp; Geology, Government of Telangana | 
                <span className="font-semibold text-slate-800 ml-1">
                  {isRestricted ? `District: ${jurisdiction.name} (${jurisdiction.teluguName})` : 'All 33 Districts of Telangana'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={13} className="text-slate-500" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Printer size={13} className="text-slate-500" />
              <span>Print Report</span>
            </button>
            {onNavigateToMap ? (
              <button
                onClick={onNavigateToMap}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gov-600 hover:bg-gov-700 text-white rounded text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Map size={14} />
                <span>View Map</span>
              </button>
            ) : (
              <Link
                to="/map"
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gov-600 hover:bg-gov-700 text-white rounded text-xs font-bold shadow-xs transition-colors"
              >
                <Map size={14} />
                <span>View Map</span>
              </Link>
            )}
          </div>
        </div>

        {/* ── Filters Bar ── */}
        <div className="bg-white border border-slate-300 rounded-lg p-3.5 shadow-xs">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <Filter size={15} className="text-gov-600 flex-shrink-0" />
              <span>Filters:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 md:flex md:items-center gap-2.5 flex-1 md:justify-end">
              {/* District Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded px-2.5 py-1">
                <MapPin size={13} className="text-slate-500 flex-shrink-0" />
                <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">District:</span>
                {isRestricted ? (
                  <span className="font-bold text-gov-700 text-xs">
                    {jurisdiction.name} (Assigned)
                  </span>
                ) : (
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 outline-none text-xs cursor-pointer"
                  >
                    <option value="ALL">All 33 Districts</option>
                    {TELANGANA_DISTRICT_NAMES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Year Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded px-2.5 py-1">
                <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Year:</span>
                <select
                  value={selectedFY}
                  onChange={(e) => setSelectedFY(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none text-xs cursor-pointer"
                >
                  <option value="2025-26">FY 2025-26 (Current Year)</option>
                  <option value="2024-25">FY 2024-25 (Last Year)</option>
                  <option value="2023-24">FY 2023-24 (Previous Year)</option>
                </select>
              </div>

              {/* Mineral Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded px-2.5 py-1">
                <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Mineral:</span>
                <select
                  value={selectedMineral}
                  onChange={(e) => setSelectedMineral(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none text-xs cursor-pointer"
                >
                  <option value="ALL">All Minerals</option>
                  <option value="GRANITE">Granite</option>
                  <option value="SAND">Sand</option>
                  <option value="LIMESTONE">Limestone</option>
                  <option value="COAL">Coal</option>
                  <option value="OTHER">Quartz &amp; Other Stones</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Key Summary Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Mines */}
          <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-600">Total Mines &amp; Leases</span>
              <span className="p-1.5 bg-blue-50 text-gov-600 rounded border border-blue-200">
                <FileText size={15} />
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{kpis.totalLeases}</div>
            <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
              <span className="text-emerald-700 font-bold">{kpis.activeMines} Working</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">{kpis.inactiveLeases} Inactive / Closed</span>
            </div>
          </div>

          {/* Royalty Collected */}
          <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-600">Royalty Collected</span>
              <span className="p-1.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                <IndianRupee size={15} />
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-800 tracking-tight">₹{kpis.realizedCr} Cr</div>
            <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Target: ₹{kpis.targetCr} Cr</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                {kpis.realizationRate}% Collected
              </span>
            </div>
          </div>

          {/* Minerals Transported */}
          <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-600">Minerals Transported</span>
              <span className="p-1.5 bg-amber-50 text-amber-800 rounded border border-amber-200">
                <Scale size={15} />
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{kpis.dispatchMT} <span className="text-xs font-bold text-slate-500">Tons</span></div>
            <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Verified Transit Passes</span>
              <span className="text-gov-700 font-semibold">GPS Tracked</span>
            </div>
          </div>

          {/* Active Vehicles & Warnings */}
          <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-600">Vehicles &amp; Warnings</span>
              <span className="p-1.5 bg-red-50 text-red-700 rounded border border-red-200">
                <Truck size={15} />
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{kpis.vehiclesActive} <span className="text-xs font-bold text-slate-500">Vehicles Active</span></div>
            <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
              <span className="text-red-700 font-bold">{kpis.transitAlerts} Route Warnings</span>
              <span className="text-amber-700 font-semibold">{kpis.overdueSurveys} Inspections Due</span>
            </div>
          </div>
        </div>

        {/* ── Operational Visual Analytics Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue vs Target Monthly Trend */}
          <div className="lg:col-span-2 bg-white border border-slate-300 rounded-lg p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp size={16} className="text-gov-600" />
                  Monthly Royalty Collections (FY 2025-26)
                </h3>
                <p className="text-[11px] text-slate-500">Collected money vs target in ₹ Crores</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-gov-600 inline-block" /> Collected
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-3 h-3 rounded-xs bg-slate-300 inline-block" /> Target
                </span>
              </div>
            </div>

            <div className="h-52 flex items-end gap-3 pt-3 px-2">
              {[
                { m: 'Apr', target: 12.0, actual: 11.2 },
                { m: 'May', target: 14.5, actual: 14.1 },
                { m: 'Jun', target: 15.0, actual: 14.8 },
                { m: 'Jul', target: 16.0, actual: 15.9 },
                { m: 'Aug', target: 15.5, actual: 15.2 },
                { m: 'Sep', target: 16.5, actual: 16.8 },
                { m: 'Oct', target: 17.0, actual: 16.4 },
                { m: 'Nov', target: 17.5, actual: 17.1 },
                { m: 'Dec', target: 18.0, actual: 17.8 },
                { m: 'Jan', target: 18.5, actual: 18.2 },
                { m: 'Feb', target: 19.0, actual: 18.6 },
                { m: 'Mar', target: 20.0, actual: 19.5 },
              ].map((item) => {
                const max = 22.0
                const targetH = (item.target / max) * 100
                const actualH = (item.actual / max) * 100
                return (
                  <div key={item.m} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <div className="text-[9px] font-bold text-gov-700 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                      ₹{item.actual}Cr
                    </div>
                    <div className="w-full flex justify-center items-end gap-1 h-[78%]">
                      <div
                        className="w-2.5 bg-slate-200 rounded-t border-t border-slate-300"
                        style={{ height: `${targetH}%` }}
                        title={`Target: ₹${item.target} Cr`}
                      />
                      <div
                        className="w-2.5 bg-gov-600 rounded-t hover:bg-gov-700 transition-colors shadow-2xs"
                        style={{ height: `${actualH}%` }}
                        title={`Collected: ₹${item.actual} Cr`}
                      />
                    </div>
                    <div className="mt-2 text-[10px] text-slate-700 font-bold">{item.m}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Mineral Distribution & Major Minerals Portfolio */}
          <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs flex flex-col justify-between">
            <div className="border-b border-slate-200 pb-3 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChart size={16} className="text-gov-600" />
                Minerals Breakdown
              </h3>
              <p className="text-[11px] text-slate-500">Money collected by mineral type</p>
            </div>

            <div className="space-y-3.5 my-auto">
              {[
                { name: 'Granite', pct: 38, revenue: '₹34.2 Cr', color: 'bg-gov-600' },
                { name: 'Limestone (Cement)', pct: 24, revenue: '₹21.6 Cr', color: 'bg-emerald-600' },
                { name: 'River Sand', pct: 18, revenue: '₹16.2 Cr', color: 'bg-amber-600' },
                { name: 'Coal (SCCL)', pct: 12, revenue: '₹10.8 Cr', color: 'bg-slate-700' },
                { name: 'Quartz & Other Stones', pct: 8, revenue: '₹7.2 Cr', color: 'bg-indigo-600' },
              ].map((m) => (
                <div key={m.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-slate-700 truncate pr-2">{m.name}</span>
                    <span className="font-mono text-slate-900 font-bold text-[11px]">
                      {m.revenue} <span className="text-slate-500 font-normal">({m.pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                    <div className={clsx('h-full rounded-full', m.color)} style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span>Department of Mines &amp; Geology</span>
              <span className="font-semibold text-gov-700">All Locations Mapped</span>
            </div>
          </div>
        </div>

        {/* ── Restricted District Spatial Cadastral Map Widget ── */}
        {isRestricted && (
          <DistrictCadastralMap onNavigateToFullMap={onNavigateToMap} />
        )}

        {/* ── District / Mandal Performance Table ── */}
        <div className="bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden">
          <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-gov-700" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {isRestricted ? `${jurisdiction.name} Mandal Cadastral Concession Summary` : 'District Summary Table'}
                </h3>
                <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-1.5 py-0.2 rounded">
                  {isRestricted
                    ? `${filteredMandals.length} ${filteredMandals.length === 1 ? 'Mandal' : 'Mandals'}`
                    : `${displayedDistricts.length} ${displayedDistricts.length === 1 ? 'District' : 'Districts'}`}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isRestricted
                  ? `Active mining concessions, dispatches, royalty and DGPS/ETS cadastral status within ${jurisdiction.name} District`
                  : 'Total mines, minerals moved, and payments collected by district across Telangana'}
              </p>
            </div>

            {/* Table Search Input */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRestricted ? "Search mandal or mineral..." : "Search district or mineral..."}
                className="w-full bg-white border border-slate-300 rounded pl-8 pr-3 py-1.5 text-xs text-slate-800 font-medium placeholder:text-slate-400 outline-none focus:border-gov-600 focus:ring-1 focus:ring-gov-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {isRestricted ? (
              /* MANDAL CADASTRE TABLE (Strictly locked to Officer's District) */
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-300 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-4">Mandal Division</th>
                    <th className="py-2.5 px-3 text-center">Sanctioned Mines</th>
                    <th className="py-2.5 px-3 text-center">Operating Pits</th>
                    <th className="py-2.5 px-4">Primary Mineral Concessions</th>
                    <th className="py-2.5 px-4 text-right">Dispatch Volume (MT)</th>
                    <th className="py-2.5 px-4 text-right">Realized Royalty (₹ Cr)</th>
                    <th className="py-2.5 px-4 text-center">Cadastral Survey Status</th>
                    <th className="py-2.5 px-4 text-right">Cadastral Map</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredMandals.map((m) => (
                    <tr key={m.mandal} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-gov-600" />
                          <span>{m.mandal} Mandal</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">{m.totalLeases}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-800">
                        <span className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          {m.activeMines}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">{m.majorMinerals}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {m.dispatchMT.toLocaleString('en-IN')} MT
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                        ₹{m.royaltyRealizedCr.toFixed(2)} Cr
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={clsx(
                            'text-[10px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1',
                            m.surveyStatus === 'DGPS_VERIFIED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : m.surveyStatus === 'ETS_IN_PROGRESS'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          )}
                        >
                          <CheckCircle2 size={10} />
                          <span>
                            {m.surveyStatus === 'DGPS_VERIFIED'
                              ? 'DGPS Demarcated'
                              : m.surveyStatus === 'ETS_IN_PROGRESS'
                              ? 'ETS In Progress'
                              : 'Cadastral Survey Due'}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {onNavigateToMap ? (
                          <button
                            onClick={onNavigateToMap}
                            className="px-2.5 py-1 bg-white hover:bg-gov-600 hover:text-white text-gov-700 border border-gov-600 rounded text-[11px] font-bold transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Map size={11} />
                            <span>Inspect</span>
                          </button>
                        ) : (
                          <Link
                            to="/map"
                            className="px-2.5 py-1 bg-white hover:bg-gov-600 hover:text-white text-gov-700 border border-gov-600 rounded text-[11px] font-bold transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Map size={11} />
                            <span>Inspect</span>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              /* STATEWIDE 33-DISTRICT TABLE (For Secretariat & Headquarters Admins) */
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-300 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                    <th onClick={() => handleSort('district')} className="py-2.5 px-4 cursor-pointer hover:bg-slate-200 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <span>District</span>
                        <ArrowUpDown size={12} className="text-slate-400" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('totalLeases')} className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-200 transition-colors">
                      <div className="flex items-center justify-center gap-1">
                        <span>Total Mines</span>
                        <ArrowUpDown size={12} className="text-slate-400" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('activeMines')} className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-200 transition-colors">
                      <div className="flex items-center justify-center gap-1">
                        <span>Working</span>
                        <ArrowUpDown size={12} className="text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-4">Main Minerals</th>
                    <th onClick={() => handleSort('dispatchMT')} className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-200 transition-colors">
                      <div className="flex items-center justify-end gap-1">
                        <span>Transported (Tons)</span>
                        <ArrowUpDown size={12} className="text-slate-400" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('royaltyTargetCr')} className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-200 transition-colors">
                      <div className="flex items-center justify-end gap-1">
                        <span>Target (₹ Cr)</span>
                        <ArrowUpDown size={12} className="text-slate-400" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('royaltyRealizedCr')} className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-200 transition-colors">
                      <div className="flex items-center justify-end gap-1">
                        <span>Collected (₹ Cr)</span>
                        <ArrowUpDown size={12} className="text-slate-400" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('collectionPct')} className="py-2.5 px-4 text-center cursor-pointer hover:bg-slate-200 transition-colors">
                      <div className="flex items-center justify-center gap-1">
                        <span>Goal Reached</span>
                        <ArrowUpDown size={12} className="text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-4 text-right">View on Map</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {displayedDistricts.map((d) => {
                    const isCurrentDistrict = jurisdiction.name.toLowerCase() === d.district.toLowerCase()
                    return (
                      <tr
                        key={d.district}
                        className={clsx(
                          'transition-colors',
                          isCurrentDistrict ? 'bg-amber-50/70 font-semibold' : 'hover:bg-slate-50/80'
                        )}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{d.district}</span>
                            <span className="text-slate-500 font-normal">({d.teluguName})</span>
                            {isCurrentDistrict && (
                              <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded border border-amber-300 uppercase">
                                Your District
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">{d.zone}</div>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800">{d.totalLeases}</td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-800">
                          <span className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            {d.activeMines}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px]">{d.majorMinerals}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                          {d.dispatchMT.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          ₹{d.royaltyTargetCr.toFixed(1)} Cr
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                          ₹{d.royaltyRealizedCr.toFixed(1)} Cr
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-300">
                              <div
                                className={clsx(
                                  'h-full rounded-full',
                                  d.collectionPct >= 92 ? 'bg-emerald-600' : d.collectionPct >= 85 ? 'bg-amber-500' : 'bg-red-600'
                                )}
                                style={{ width: `${Math.min(100, d.collectionPct)}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-800 min-w-[28px]">{d.collectionPct}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to="/map"
                            className="px-2.5 py-1 bg-white hover:bg-gov-600 hover:text-white text-gov-700 border border-gov-600 rounded text-[11px] font-bold transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Map size={11} />
                            <span>Map</span>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Recent Notices & Quick Action Links ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Notices */}
          <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-700" />
                Recent Notices &amp; Warnings
              </h3>
              <span className="text-[11px] text-slate-500 font-semibold">Mining Rules</span>
            </div>

            <div className="divide-y divide-slate-100 space-y-2">
              {[
                { id: 'NTC-2026-081', entity: 'Maheshwaram Road Metal Quarry', district: 'Rangareddy', offense: 'Quarry dug outside approved area', status: 'Notice Sent', date: 'Today, 14:20' },
                { id: 'NTC-2026-079', entity: 'Ibrahimpatnam Granite Quarry', district: 'Rangareddy', offense: 'Late monthly payment report', status: 'Fine Issued', date: 'Yesterday' },
                { id: 'NTC-2026-074', entity: 'Godavari River Sand Reach Reach-7', district: 'Nizamabad', offense: 'Truck weight did not match transit pass', status: 'Officer Sent', date: '01 Oct 2026' },
                { id: 'NTC-2026-068', entity: 'Singareni Collieries OCP-IV', district: 'Bhadradri Kothagudem', offense: 'Boundary pillar survey due for check', status: 'Under Review', date: '28 Sep 2026' },
              ]
                .filter((n) => !isRestricted || n.district.toLowerCase() === jurisdiction.name.toLowerCase() || n.district === 'Rangareddy')
                .map((item) => (
                  <div key={item.id} className="pt-2 flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gov-700 text-[11px]">{item.id}</span>
                        <span className="font-bold text-slate-900 truncate">{item.entity}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded border border-slate-200">{item.district}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{item.offense}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded whitespace-nowrap">
                        {item.status}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">{item.date}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Quick Action Links */}
          <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Zap size={16} className="text-amber-600" />
                Quick Actions
              </h3>
              <span className="text-[11px] text-slate-500 font-semibold">Shortcuts</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-auto">
              <Link
                to="/governance"
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors flex items-start gap-2.5"
              >
                <Lock size={16} className="text-gov-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold text-slate-900 text-xs">Security &amp; Login Log</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Check who logged in and made changes</div>
                </div>
              </Link>

              <Link
                to="/alerts"
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors flex items-start gap-2.5"
              >
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold text-slate-900 text-xs">Warnings &amp; Boundary Issues</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Check boundary alerts and satellite images</div>
                </div>
              </Link>

              <Link
                to="/map"
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors flex items-start gap-2.5"
              >
                <Map size={16} className="text-gov-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold text-slate-900 text-xs">Interactive Map</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">See mine boundaries, land survey numbers &amp; trucks</div>
                </div>
              </Link>

              <button
                onClick={() => window.print()}
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors flex items-start gap-2.5 cursor-pointer"
              >
                <Download size={16} className="text-emerald-700 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold text-slate-900 text-xs">Download Report</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Download and print this summary as PDF</div>
                </div>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Department of Mines &amp; Geology</span>
              <span>Updated: {lastRefreshed}</span>
            </div>
          </div>
        </div>
      </div>
  )

  if (embed) {
    return (
      <div className="flex-1 bg-slate-100 p-4 sm:p-6 overflow-y-auto custom-scrollbar font-sans text-slate-800">
        {content}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      <TopBar />
      <main className="flex-1 p-4 sm:p-6">
        {content}
      </main>
      <footer className="bg-white border-t border-slate-300 py-4 px-6 text-center text-xs text-slate-600 mt-auto">
        <div className="max-w-7xl mx-auto space-y-1">
          <p className="font-semibold text-slate-700">
            MineGIS-TS &copy; 2026 Department of Mines &amp; Geology, Government of Telangana. All Rights Reserved.
          </p>
          <p className="text-[11px] text-slate-500">
            Telangana Mines, Transport &amp; Royalty Tracking System
          </p>
        </div>
      </footer>
    </div>
  )
}
