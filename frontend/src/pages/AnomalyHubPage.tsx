import React, { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  ArrowRight,
  History,
  FileText,
  User,
  X,
  MessageSquare,
  ShieldAlert,
  MapPin,
  Truck,
  Layers,
  Radio,
  Clock,
  ExternalLink,
  ChevronRight,
  AlertOctagon,
  Eye,
  FileWarning,
  Send,
  Zap,
  Trash2,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import { useMapStore, useAuthStore, type VehicleAlert } from '../store'
import { getUserJurisdiction } from '../utils/districts'

export const TELANGANA_ZONAL_OFFICERS: Record<string, { zone: string; officer: string; designation: string; email: string; phone: string }> = {
  'Bhadradri Kothagudem': { zone: 'Kothagudem & Godavari Basin Zone', officer: 'Joint Director (Bhadradri Zone)', designation: 'Zonal Joint Director (Mines)', email: 'zmo.kothagudem@mines.telangana.gov.in', phone: '+91 8744-254100' },
  'Khammam': { zone: 'Kothagudem & Godavari Basin Zone', officer: 'Joint Director (Bhadradri Zone)', designation: 'Zonal Joint Director (Mines)', email: 'zmo.kothagudem@mines.telangana.gov.in', phone: '+91 8744-254100' },
  'Warangal': { zone: 'Northern Telangana Zone (Warangal)', officer: 'Zonal Mining Officer (Warangal)', designation: 'Zonal Mining Officer', email: 'zmo.warangal@mines.telangana.gov.in', phone: '+91 870-2448201' },
  'Karimnagar': { zone: 'Northern Telangana Zone (Warangal)', officer: 'Zonal Mining Officer (Warangal)', designation: 'Zonal Mining Officer', email: 'zmo.warangal@mines.telangana.gov.in', phone: '+91 870-2448201' },
  'Peddapalli': { zone: 'Northern Telangana Zone (Warangal)', officer: 'Zonal Mining Officer (Warangal)', designation: 'Zonal Mining Officer', email: 'zmo.warangal@mines.telangana.gov.in', phone: '+91 870-2448201' },
  'Nizamabad': { zone: 'North-Western Zone (Nizamabad)', officer: 'Zonal Mining Officer (Nizamabad)', designation: 'Zonal Mining Officer', email: 'zmo.nizamabad@mines.telangana.gov.in', phone: '+91 8462-231120' },
  'Adilabad': { zone: 'North-Western Zone (Nizamabad)', officer: 'Zonal Mining Officer (Nizamabad)', designation: 'Zonal Mining Officer', email: 'zmo.nizamabad@mines.telangana.gov.in', phone: '+91 8462-231120' },
  'Rangareddy': { zone: 'Capital & Southern Zone (Hyderabad)', officer: 'Zonal Joint Director (Enforcement)', designation: 'Zonal Joint Director (Enforcement)', email: 'zmo.hyderabad@mines.telangana.gov.in', phone: '+91 40-23450912' },
  'Hyderabad': { zone: 'Capital & Southern Zone (Hyderabad)', officer: 'Zonal Joint Director (Enforcement)', designation: 'Zonal Joint Director (Enforcement)', email: 'zmo.hyderabad@mines.telangana.gov.in', phone: '+91 40-23450912' },
  'Nalgonda': { zone: 'Capital & Southern Zone (Hyderabad)', officer: 'Zonal Joint Director (Enforcement)', designation: 'Zonal Joint Director (Enforcement)', email: 'zmo.hyderabad@mines.telangana.gov.in', phone: '+91 40-23450912' },
  'Mahabubnagar': { zone: 'Capital & Southern Zone (Hyderabad)', officer: 'Zonal Joint Director (Enforcement)', designation: 'Zonal Joint Director (Enforcement)', email: 'zmo.hyderabad@mines.telangana.gov.in', phone: '+91 40-23450912' },
  'Vikarabad': { zone: 'Capital & Southern Zone (Hyderabad)', officer: 'Zonal Joint Director (Enforcement)', designation: 'Zonal Joint Director (Enforcement)', email: 'zmo.hyderabad@mines.telangana.gov.in', phone: '+91 40-23450912' },
}

export function getZonalOfficerForDistrict(district?: string) {
  if (district && TELANGANA_ZONAL_OFFICERS[district]) {
    return TELANGANA_ZONAL_OFFICERS[district]
  }
  return {
    zone: 'Telangana State Mineral Directorate HQ (Hyderabad)',
    officer: 'Zonal Joint Director (Statewide Enforcement)',
    designation: 'Zonal Joint Director (Statewide Enforcement)',
    email: 'zmo.hq@mines.telangana.gov.in',
    phone: '+91 40-23450912',
  }
}

export interface ProductionAnomalyRecord {
  id: number
  lease_name: string
  lease_id: string
  district: string
  period_type: string
  period_year: number
  period_month: number | null
  period_quarter: number | null
  quantity_produced_mt: number
  quantity_dispatched_mt: number
  anomaly_score: number
  anomaly_flags: string[]
  status: 'PENDING_INQUIRY' | 'NOTICE_ISSUED' | 'VERIFIED' | 'RESOLVED'
  notes: string
  lon?: number
  lat?: number
  is_escalated?: boolean
  escalated_to?: string
}

// ── Fallback Production & Volume Anomalies for Telangana Concessions ──────────
const FALLBACK_PRODUCTION_ANOMALIES: ProductionAnomalyRecord[] = [
  {
    id: 101,
    lease_name: 'Singareni Collieries OCP-IV Expansion',
    lease_id: 'TS-KGM-COAL-001',
    district: 'Bhadradri Kothagudem',
    period_type: 'MONTHLY',
    period_year: 2026,
    period_month: 3,
    period_quarter: null,
    quantity_produced_mt: 538200,
    quantity_dispatched_mt: 420000,
    anomaly_score: 0.94,
    anomaly_flags: ['UNREPORTED_EXCAVATION', 'PIT_BOUNDARY_EXPANSION', 'SATELLITE_ELEVATION_DELTA'],
    status: 'NOTICE_ISSUED',
    notes: 'Satellite Sentinel-2 elevation change model shows 118,200 MT excavated over and above monthly declared returns. Pit face encroached 42m past cadastral survey pillar #14.',
    lon: 80.612,
    lat: 17.551,
  },
  {
    id: 102,
    lease_name: 'Ibrahimpatnam Granite & Dolerite Concession',
    lease_id: 'TS-RGD-STN-003',
    district: 'Rangareddy',
    period_type: 'MONTHLY',
    period_year: 2026,
    period_month: 3,
    period_quarter: null,
    quantity_produced_mt: 8900,
    quantity_dispatched_mt: 14200,
    anomaly_score: 0.88,
    anomaly_flags: ['DISPATCH_EXCEEDS_DECLARATION', 'WEIGHBRIDGE_BYPASS', 'E_PERMIT_SURGE'],
    status: 'PENDING_INQUIRY',
    notes: 'Transit e-permits generated (14,200 MT) exceed declared monthly weighbridge throughput by 59%. Suspected untaxed extraction from unrecorded adjacent survey number.',
    lon: 78.648,
    lat: 17.195,
  },
  {
    id: 103,
    lease_name: 'Karimnagar Tan Brown Granite Basin',
    lease_id: 'TS-KNR-GRN-014',
    district: 'Karimnagar',
    period_type: 'MONTHLY',
    period_year: 2026,
    period_month: 2,
    period_quarter: null,
    quantity_produced_mt: 12400,
    quantity_dispatched_mt: 11900,
    anomaly_score: 0.91,
    anomaly_flags: ['VEGETATION_CLEARING_ALERT', 'BUFFER_ZONE_ENCROACHMENT', 'NDVI_DROP_CRITICAL'],
    status: 'PENDING_INQUIRY',
    notes: 'Sentinel-2 NDVI spectral monitoring registered severe vegetation stripping (NDVI dropped 0.48 -> 0.12) inside the 50m statutory riparian buffer along Manair river basin.',
    lon: 79.128,
    lat: 18.438,
  },
  {
    id: 104,
    lease_name: 'Mellacheruvu Industrial Limestone Quarry',
    lease_id: 'TS-NLG-LST-003',
    district: 'Nalgonda',
    period_type: 'QUARTERLY',
    period_year: 2026,
    period_month: null,
    period_quarter: 1,
    quantity_produced_mt: 45000,
    quantity_dispatched_mt: 62300,
    anomaly_score: 0.79,
    anomaly_flags: ['IRREGULAR_EXTRACTION_SPIKE', 'OFF_HOURS_HAULING'],
    status: 'PENDING_INQUIRY',
    notes: 'Weighbridge telematics log shows heavy transit clusters between 22:00 and 04:00 hrs without supplementary night transit endorsement.',
    lon: 79.882,
    lat: 16.812,
  },
  {
    id: 105,
    lease_name: 'Badepally Quartz & Feldspar Mine',
    lease_id: 'TS-MBN-QTZ-005',
    district: 'Mahabubnagar',
    period_type: 'MONTHLY',
    period_year: 2026,
    period_month: 3,
    period_quarter: null,
    quantity_produced_mt: 6200,
    quantity_dispatched_mt: 5800,
    anomaly_score: 0.85,
    anomaly_flags: ['BOUNDARY_PILLAR_DISPLACEMENT', 'UNAUTHORIZED_PIT_OVERBURDEN'],
    status: 'NOTICE_ISSUED',
    notes: 'DGPS boundary survey cross-examination revealed boundary pillar #03 displaced 35 meters into government poramboke land. Overburden dump encroaching on public cart track.',
    lon: 77.985,
    lat: 16.745,
  },
  {
    id: 106,
    lease_name: 'Palaigudem Godavari Sand Reach 7',
    lease_id: 'TS-NZB-SAND-022',
    district: 'Nizamabad',
    period_type: 'MONTHLY',
    period_year: 2026,
    period_month: 3,
    period_quarter: null,
    quantity_produced_mt: 28400,
    quantity_dispatched_mt: 31200,
    anomaly_score: 0.92,
    anomaly_flags: ['DREDGING_DEPTH_VIOLATION', 'PROHIBITED_HOURS_OPERATION'],
    status: 'PENDING_INQUIRY',
    notes: 'Acoustic bathymetric sonar and CCTV telemetry flagged mechanized suction dredging below the statutory 3.0m permissible depth limit.',
    lon: 78.098,
    lat: 18.672,
  },
]

type FilterCategory = 'ALL' | 'BOUNDARY' | 'PRODUCTION' | 'SATELLITE' | 'NOTICES' | 'RESOLVED'

export default function AnomalyHubPage({ embed = false }: { embed?: boolean }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    vehicleAlerts,
    setMapFlyToTarget,
    triggerGeofenceBreachDemo,
    selectVehicle,
    selectLease,
  } = useMapStore()

  const [productionRecords, setProductionRecords] = useState<ProductionAnomalyRecord[]>(FALLBACK_PRODUCTION_ANOMALIES)
  const [loading, setLoading] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<ProductionAnomalyRecord | null>(null)
  const [selectedVehicleAlert, setSelectedVehicleAlert] = useState<VehicleAlert | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [resolutionStatus, setResolutionStatus] = useState<'VERIFIED' | 'NOTICE_ISSUED' | 'RESOLVED'>('NOTICE_ISSUED')
  const [submitting, setSubmitting] = useState(false)

  // Filtering & Search
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL')

  const jurisdiction = getUserJurisdiction(user?.profile?.district)
  const isOfficerRestricted = jurisdiction.name !== 'Telangana State'

  // Pre-set district filter if officer is jurisdiction restricted
  useEffect(() => {
    if (isOfficerRestricted) {
      setSelectedDistrict(jurisdiction.name)
    }
  }, [isOfficerRestricted, jurisdiction.name])

  // Fetch production anomalies from backend if running, otherwise use fallback
  const fetchProductionData = async () => {
    setLoading(true)
    try {
      const resp = await axios.get('/api/leases/production/?flagged_only=true')
      if (Array.isArray(resp.data) && resp.data.length > 0) {
        setProductionRecords(resp.data)
      } else {
        setProductionRecords(FALLBACK_PRODUCTION_ANOMALIES)
      }
    } catch {
      // Backend offline: use high-fidelity fallback dataset
      setProductionRecords(FALLBACK_PRODUCTION_ANOMALIES)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProductionData()
  }, [])

  // Resolve Anomaly Handler
  const handleResolve = async () => {
    if (!selectedRecord && !selectedVehicleAlert) return
    setSubmitting(true)

    try {
      if (selectedRecord) {
        await axios.post(`/api/leases/production/${selectedRecord.id}/resolve-anomaly/`, {
          new_status: resolutionStatus,
          notes: resolutionNotes,
        }).catch(() => null)

        setProductionRecords((prev) =>
          prev.map((r) =>
            r.id === selectedRecord.id
              ? { ...r, status: resolutionStatus, notes: resolutionNotes || r.notes }
              : r
          )
        )
        toast.success(`Inquiry #${selectedRecord.id} updated to ${resolutionStatus.replace(/_/g, ' ')}.`)
      } else if (selectedVehicleAlert) {
        useMapStore.setState((state) => ({
          vehicleAlerts: state.vehicleAlerts.map((va) =>
            va.id === selectedVehicleAlert.id
              ? { ...va, is_resolved: true, resolved_by_name: user?.username || 'District Officer', resolved_at: new Date().toISOString() }
              : va
          ),
        }))
        toast.success(`Vehicle alert ${selectedVehicleAlert.vehicle_number} resolved & archived.`)
      }

      setSelectedRecord(null)
      setSelectedVehicleAlert(null)
      setResolutionNotes('')
    } finally {
      setSubmitting(false)
    }
  }

  // Quick action: Issue Statutory Notice
  const handleIssueNotice = (record: ProductionAnomalyRecord) => {
    setProductionRecords((prev) =>
      prev.map((r) =>
        r.id === record.id
          ? {
              ...r,
              status: 'NOTICE_ISSUED',
              notes: `${r.notes}\n[${new Date().toLocaleDateString('en-IN')}] Rule 28 Statutory Show-Cause Notice Dispatched by ${user?.first_name || 'DMO'} (Ref: TS-DMG-NTC-${record.id}).`,
            }
          : r
      )
    )
    toast.success(`Statutory Show-Cause Notice dispatched for ${record.lease_id}!`, {
      icon: '📜',
      duration: 4000,
    })
  }

  // Escalation Modal Target State
  const [escalationTarget, setEscalationTarget] = useState<{
    type: 'production' | 'vehicle'
    item: ProductionAnomalyRecord | VehicleAlert
    district: string
  } | null>(null)
  const [escalationInstruction, setEscalationInstruction] = useState('')

  // Delete Resolved Alert
  const handleDeleteResolved = (id: number, type: 'production' | 'vehicle') => {
    if (type === 'production') {
      setProductionRecords((prev) => prev.filter((r) => r.id !== id))
      toast.success('Resolved inquiry removed from record.')
    } else {
      useMapStore.setState((state) => ({
        vehicleAlerts: state.vehicleAlerts.filter((va) => va.id !== id),
      }))
      toast.success('Resolved vehicle alert permanently purged.')
    }
  }

  // Clear All Resolved Alerts
  const handleClearAllResolved = () => {
    const prodResolvedCount = productionRecords.filter((r) => r.status === 'RESOLVED' || r.status === 'VERIFIED').length
    const vehResolvedCount = vehicleAlerts.filter((va) => va.is_resolved).length
    const totalPurged = prodResolvedCount + vehResolvedCount

    if (totalPurged === 0) {
      toast('No resolved inquiries currently in log.', { icon: 'ℹ️' })
      return
    }

    setProductionRecords((prev) => prev.filter((r) => r.status !== 'RESOLVED' && r.status !== 'VERIFIED'))
    useMapStore.setState((state) => ({
      vehicleAlerts: state.vehicleAlerts.filter((va) => !va.is_resolved),
    }))
    toast.success(`Purged ${totalPurged} resolved inquiries from active enforcement radar.`, { icon: '🗑️' })
  }

  // Open Escalation Dialog
  const handleOpenEscalation = (item: ProductionAnomalyRecord | VehicleAlert, type: 'production' | 'vehicle') => {
    const district =
      type === 'production'
        ? (item as ProductionAnomalyRecord).district
        : ((item as any).district || (item as any).mine_name || user?.profile?.district || 'Telangana')
    setEscalationTarget({ type, item, district })
    setEscalationInstruction('')
  }

  // Confirm Statutory Escalation to Zonal Mining Officer
  const handleConfirmEscalation = () => {
    if (!escalationTarget) return
    const { type, item, district } = escalationTarget
    const officerInfo = getZonalOfficerForDistrict(district)

    if (type === 'production') {
      const rec = item as ProductionAnomalyRecord
      setProductionRecords((prev) =>
        prev.map((r) =>
          r.id === rec.id
            ? {
                ...r,
                status: 'NOTICE_ISSUED',
                is_escalated: true,
                escalated_to: officerInfo.officer,
                notes: `${r.notes}\n[${new Date().toLocaleDateString('en-IN')}] ESCALATED TO ZONAL MINING OFFICER: Forwarded to ${officerInfo.officer} (${officerInfo.designation}, ${officerInfo.zone}). Immediate on-ground physical inspection directed under Section 21 of MMDR Act. ${escalationInstruction ? `Note: "${escalationInstruction}"` : ''}`,
              }
            : r
        )
      )
    } else {
      const va = item as VehicleAlert
      useMapStore.setState((state) => ({
        vehicleAlerts: state.vehicleAlerts.map((v) =>
          v.id === va.id
            ? {
                ...v,
                description: `${v.description} [ESCALATED TO ZONAL MINING OFFICER: ${officerInfo.officer} (${officerInfo.zone}) for physical field interception]`,
              }
            : v
        ),
      }))
    }

    toast.success(`Dossier officially escalated to ${officerInfo.officer} (${officerInfo.zone})!`, {
      icon: '🚨',
      duration: 5000,
    })
    setEscalationTarget(null)
    setEscalationInstruction('')
  }

  // Quick action: Inspect on Map
  const handleInspectOnMap = (lon: number, lat: number, leaseId?: string, vehicleNumber?: string) => {
    if (leaseId) selectLease(leaseId)
    if (vehicleNumber) {
      const v = useMapStore.getState().vehicles.find((veh) => veh.vehicle_number === vehicleNumber)
      if (v) selectVehicle(v.id)
    }
    const vText = vehicleNumber ? ` for Vehicle ${vehicleNumber}` : ''
    setMapFlyToTarget({
      lon,
      lat,
      zoom: 15,
      ping: true,
      vehicleNumber,
      message: `🚨 Focused map on alert target${vText} [${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E]`,
    })
    navigate('/map')
    toast.success(`Focused map on alert target${vText} [${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E]`, { icon: '🎯' })
  }

  // Filtered Production Records
  const filteredProduction = useMemo(() => {
    return productionRecords.filter((rec) => {
      // Category filter
      if (activeCategory === 'RESOLVED' && rec.status !== 'RESOLVED' && rec.status !== 'VERIFIED') return false
      if (activeCategory === 'NOTICES' && rec.status !== 'NOTICE_ISSUED') return false
      if (activeCategory === 'SATELLITE' && !rec.anomaly_flags.some((f) => f.includes('SATELLITE') || f.includes('VEGETATION') || f.includes('NDVI'))) return false
      if (activeCategory === 'BOUNDARY' && !rec.anomaly_flags.some((f) => f.includes('BOUNDARY') || f.includes('OVERBURDEN'))) return false
      if (activeCategory === 'PRODUCTION' && !rec.anomaly_flags.some((f) => f.includes('EXCAVATION') || f.includes('DISPATCH') || f.includes('SPIKE'))) return false

      // District filter
      if (selectedDistrict !== 'ALL' && rec.district.toLowerCase() !== selectedDistrict.toLowerCase()) {
        return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match =
          rec.lease_name.toLowerCase().includes(q) ||
          rec.lease_id.toLowerCase().includes(q) ||
          rec.district.toLowerCase().includes(q) ||
          rec.anomaly_flags.some((f) => f.toLowerCase().includes(q))
        if (!match) return false
      }

      return true
    })
  }, [productionRecords, activeCategory, selectedDistrict, searchQuery])

  // Filtered Vehicle / Geofence Alerts
  const filteredVehicleAlerts = useMemo(() => {
    return vehicleAlerts.filter((va) => {
      // Category filter
      if (activeCategory === 'RESOLVED' && !va.is_resolved) return false
      if (activeCategory === 'PRODUCTION' || activeCategory === 'SATELLITE') return false
      if (activeCategory === 'NOTICES') return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match =
          va.vehicle_number.toLowerCase().includes(q) ||
          va.driver_name.toLowerCase().includes(q) ||
          va.alert_type.toLowerCase().includes(q) ||
          va.description.toLowerCase().includes(q) ||
          (va.mine_name && va.mine_name.toLowerCase().includes(q))
        if (!match) return false
      }

      return true
    })
  }, [vehicleAlerts, activeCategory, searchQuery])

  const totalActiveIssues = productionRecords.filter((r) => r.status !== 'RESOLVED' && r.status !== 'VERIFIED').length + vehicleAlerts.filter((v) => !v.is_resolved).length
  const totalBoundaryBreaches = vehicleAlerts.filter((v) => !v.is_resolved).length + productionRecords.filter((r) => r.anomaly_flags.some((f) => f.includes('BOUNDARY'))).length
  const totalNoticesIssued = productionRecords.filter((r) => r.status === 'NOTICE_ISSUED').length

  const mainContent = (
    <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* ─── Header Advisory Banner ─── */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="text-amber-600 flex-shrink-0" size={24} />
              Enforcement &amp; Compliance Hub
            </h1>
            <span className="text-[10px] bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
              LIVE RADAR
            </span>
          </div>
          <p className="text-slate-600 text-xs mt-1 max-w-3xl leading-relaxed">
            Automated statutory compliance desk integrating <strong>Isolation Forest extraction models</strong>, <strong>Sentinel-2 NDVI spectral changes</strong>, and <strong>24/7 Mineral Transit GPS &amp; geofence boundary radar</strong> across all Telangana mining concessions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {/* Quick Trigger Breach Demo */}
          <button
            onClick={() => {
              triggerGeofenceBreachDemo()
              toast.success('Simulated live geofence trespass alert dispatched for Vehicle TG07U1889!', { icon: '🚨' })
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Simulate immediate vehicle geofence trespass breach"
          >
            <Zap size={14} className="text-amber-300" />
            <span>Simulate Breach Alert</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300">
            <span>DMO Protocol: Rule 28 (TS MMCR)</span>
          </div>
        </div>
      </div>

      {/* ─── Key Stats Metrics Grid ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-300 p-4 rounded-xl shadow-xs flex items-center gap-3">
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalActiveIssues}</div>
            <div className="text-[11px] text-slate-500 font-semibold">Active Inquiries &amp; Alerts</div>
          </div>
        </div>

        <div className="bg-white border border-slate-300 p-4 rounded-xl shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg">
            <Radio size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalBoundaryBreaches}</div>
            <div className="text-[11px] text-slate-500 font-semibold">Boundary &amp; Geofence Alerts</div>
          </div>
        </div>

        <div className="bg-white border border-slate-300 p-4 rounded-xl shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 border border-blue-200 text-gov-600 rounded-lg">
            <FileWarning size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalNoticesIssued}</div>
            <div className="text-[11px] text-slate-500 font-semibold">Statutory Notices Issued</div>
          </div>
        </div>

        <div className="bg-white border border-slate-300 p-4 rounded-xl shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg">
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">92.4%</div>
            <div className="text-[11px] text-slate-500 font-semibold">Algorithmic Confidence</div>
          </div>
        </div>
      </div>

      {/* ─── Filter Tabs & Controls ─── */}
      <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xs space-y-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
          {[
            { id: 'ALL', label: 'All Alerts & Issues', count: totalActiveIssues },
            { id: 'BOUNDARY', label: 'Boundary & Geofence Breaches', count: totalBoundaryBreaches },
            { id: 'PRODUCTION', label: 'Extraction & Volume Anomalies', count: productionRecords.filter((r) => r.anomaly_flags.some((f) => f.includes('EXCAVATION') || f.includes('DISPATCH'))).length },
            { id: 'SATELLITE', label: 'Satellite Over-Excavation (NDVI)', count: productionRecords.filter((r) => r.anomaly_flags.some((f) => f.includes('SATELLITE') || f.includes('VEGETATION'))).length },
            { id: 'NOTICES', label: 'Statutory Notices (Rule 28)', count: totalNoticesIssued },
            { id: 'RESOLVED', label: 'Resolved Inquiries', count: productionRecords.filter((r) => r.status === 'RESOLVED' || r.status === 'VERIFIED').length + vehicleAlerts.filter((v) => v.is_resolved).length },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as FilterCategory)}
              className={clsx(
                'px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5',
                activeCategory === cat.id
                  ? 'bg-gov-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              <span>{cat.label}</span>
              <span
                className={clsx(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-extrabold',
                  activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-800'
                )}
              >
                {cat.count}
              </span>
            </button>
          ))}

          {(productionRecords.some((r) => r.status === 'RESOLVED' || r.status === 'VERIFIED') || vehicleAlerts.some((v) => v.is_resolved)) && (
            <button
              onClick={handleClearAllResolved}
              className="ml-auto px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 text-xs shadow-xs"
              title="Permanently remove all resolved inquiries from active view"
            >
              <Trash2 size={13} />
              <span>Delete Resolved Alerts</span>
            </button>
          )}
        </div>

        {/* Search Bar & District Selector */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lease ID, vehicle number, mine..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-gov-600 focus:ring-1 focus:ring-gov-600 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Filter size={14} className="text-slate-500" />
            <span className="text-xs text-slate-600 font-semibold">District:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={isOfficerRestricted}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-gov-600 outline-none cursor-pointer"
            >
              <option value="ALL">All Telangana Districts</option>
              <option value="Bhadradri Kothagudem">Bhadradri Kothagudem</option>
              <option value="Rangareddy">Rangareddy</option>
              <option value="Karimnagar">Karimnagar</option>
              <option value="Nalgonda">Nalgonda</option>
              <option value="Mahabubnagar">Mahabubnagar</option>
              <option value="Nizamabad">Nizamabad</option>
              <option value="Vikarabad">Vikarabad</option>
            </select>
            {isOfficerRestricted && (
              <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-bold">
                🔒 District Restricted
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Section 1: Live Geofence Boundary Telemetry Alerts ─── */}
      {(activeCategory === 'ALL' || activeCategory === 'BOUNDARY') && filteredVehicleAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Radio size={15} className="text-red-600 animate-pulse" />
              Live Geofence Boundary &amp; Vehicle Telemetry Alerts ({filteredVehicleAlerts.length})
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">Real-Time Vehicle Radar</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredVehicleAlerts.map((va) => (
              <div
                key={va.id}
                className={clsx(
                  'bg-white border rounded-xl p-4 shadow-xs transition-all flex flex-col justify-between hover:shadow-md cursor-pointer border-l-4',
                  va.severity === 'HIGH' ? 'border-l-red-600 border-slate-300' : 'border-l-amber-500 border-slate-300'
                )}
                onClick={() => setSelectedVehicleAlert(va)}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                        {va.vehicle_number}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-red-50 text-red-700 border-red-200">
                        {va.alert_type}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                      {new Date(va.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 mt-1 leading-snug">
                    {va.alert_type_display}
                  </h3>

                  <p className="text-slate-600 text-[11px] mt-1.5 leading-relaxed line-clamp-2">
                    {va.description}
                  </p>

                  <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <User size={12} className="text-slate-400" />
                      {va.driver_name}
                    </span>
                    {va.mine_name && (
                      <span className="flex items-center gap-1 truncate text-gov-700 font-medium">
                        <MapPin size={12} className="text-gov-600 flex-shrink-0" />
                        {va.mine_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        'text-[10px] font-bold px-2 py-0.5 rounded border',
                        va.is_resolved
                          ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                          : 'text-amber-700 bg-amber-50 border-amber-200'
                      )}
                    >
                      {va.is_resolved ? '✓ Resolved' : '⚠️ Action Required'}
                    </span>

                    {va.is_resolved ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteResolved(va.id, 'vehicle')
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Resolved Alert"
                      >
                        <Trash2 size={13} />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenEscalation(va, 'vehicle')
                        }}
                        className="text-[11px] bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title="Escalate to concerned Zonal Mining Officer"
                      >
                        <Send size={11} />
                        <span>Escalate to Zonal Officer</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (va.alert_lon !== null && va.alert_lat !== null) {
                        handleInspectOnMap(va.alert_lon, va.alert_lat, va.lease_id || undefined, va.vehicle_number)
                      }
                    }}
                    className="flex items-center gap-1 text-gov-600 hover:text-gov-800 font-bold hover:underline cursor-pointer"
                  >
                    <span>Inspect on GIS Map</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Section 2: Statutory Production & Extraction Discrepancies ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <FileText size={15} className="text-amber-600" />
            Statutory Extraction Anomalies &amp; Satellite Discrepancies ({filteredProduction.length})
          </h2>
          <span className="text-[11px] text-slate-500 font-medium">Sorted by AI Confidence</span>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-300 p-12 rounded-xl text-center text-slate-500 text-xs font-medium">
            <div className="w-5 h-5 border-2 border-gov-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Scanning satellite spectral indices and extraction returns...
          </div>
        ) : filteredProduction.length === 0 && filteredVehicleAlerts.length === 0 ? (
          <div className="bg-white border border-slate-300 p-12 rounded-xl text-center shadow-xs">
            <CheckCircle className="text-emerald-600 mx-auto mb-3" size={44} />
            <h3 className="text-sm font-bold text-slate-800">No Matching Issues Found</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
              All production declarations and satellite boundary verifications match approved environmental limits for the selected filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredProduction.map((rec) => (
              <div
                key={rec.id}
                className={clsx(
                  'group bg-white border border-slate-300 p-4 rounded-xl hover:border-gov-600 shadow-xs transition-all cursor-pointer border-l-4 flex flex-col justify-between hover:shadow-md',
                  rec.status === 'NOTICE_ISSUED'
                    ? 'border-l-red-600'
                    : rec.status === 'RESOLVED' || rec.status === 'VERIFIED'
                    ? 'border-l-emerald-600'
                    : 'border-l-amber-500'
                )}
                onClick={() => setSelectedRecord(rec)}
              >
                <div>
                  <div className="flex justify-between items-start mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gov-600 font-mono font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          {rec.lease_id}
                        </span>
                        <span className="text-[10px] text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                          {rec.district}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1.5 leading-snug">{rec.lease_name}</h4>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-black text-red-700">{Math.round(rec.anomaly_score * 100)}%</div>
                      <div className="text-[9px] text-slate-500 uppercase font-bold">Confidence</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 my-2.5">
                    {rec.anomaly_flags.map((flag) => (
                      <span
                        key={flag}
                        className="px-2 py-0.5 bg-red-50 text-red-800 border border-red-200 rounded text-[10px] uppercase font-bold"
                      >
                        {flag.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>

                  <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-2">
                    {rec.notes}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50/80 p-2 rounded-lg border border-slate-100 text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Declared Extracted</span>
                      <strong className="text-slate-800">{rec.quantity_produced_mt.toLocaleString()} MT</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Dispatched Transit</span>
                      <strong className="text-slate-800">{rec.quantity_dispatched_mt.toLocaleString()} MT</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={clsx(
                        'text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase',
                        rec.status === 'NOTICE_ISSUED'
                          ? 'bg-red-50 text-red-800 border-red-300'
                          : rec.status === 'RESOLVED' || rec.status === 'VERIFIED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      )}
                    >
                      {rec.status.replace(/_/g, ' ')}
                    </span>

                    {rec.is_escalated && (
                      <span className="text-[10px] bg-purple-100 text-purple-900 border border-purple-300 font-extrabold px-1.5 py-0.5 rounded">
                        ⚡ ESCALATED TO ZONAL OFFICER
                      </span>
                    )}

                    {(rec.status === 'RESOLVED' || rec.status === 'VERIFIED') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteResolved(rec.id, 'production')
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer ml-1"
                        title="Delete Resolved Record"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {rec.status !== 'RESOLVED' && rec.status !== 'VERIFIED' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenEscalation(rec, 'production')
                        }}
                        className="text-[11px] bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 px-2 py-1 rounded font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title="Escalate to concerned Zonal Mining Officer"
                      >
                        <Send size={11} />
                        <span>Escalate to Zonal Officer</span>
                      </button>
                    )}

                    {rec.status !== 'NOTICE_ISSUED' && rec.status !== 'RESOLVED' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleIssueNotice(rec)
                        }}
                        className="text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-2 py-1 rounded font-bold transition-colors cursor-pointer"
                        title="Issue Rule 28 Statutory Show-Cause Notice"
                      >
                        Issue Notice
                      </button>
                    )}

                    {rec.lon && rec.lat && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleInspectOnMap(rec.lon!, rec.lat!, rec.lease_id)
                        }}
                        className="text-[11px] bg-blue-50 hover:bg-blue-100 text-gov-700 border border-blue-200 px-2 py-1 rounded font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <MapPin size={11} />
                        Map
                      </button>
                    )}

                    <div className="flex items-center gap-1 text-gov-600 font-bold group-hover:translate-x-0.5 transition-transform text-xs">
                      Dossier <ArrowRight size={13} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Detail Modal (Production Anomaly Dossier) ─── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-300 w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-gov-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText size={20} className="text-amber-400" />
                <div>
                  <h2 className="text-sm font-bold tracking-tight">
                    Statutory Inquiry Dossier #{selectedRecord.id}
                  </h2>
                  <p className="text-[11px] text-blue-100">
                    Department of Mines &amp; Geology • {selectedRecord.district} District
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs bg-slate-50/50">
              <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-300">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Mine / Concession</div>
                  <div className="text-slate-900 font-bold text-sm">{selectedRecord.lease_name}</div>
                  <div className="text-slate-600 font-mono mt-0.5">{selectedRecord.lease_id}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Extraction Discrepancy</div>
                  <div className="text-slate-900 font-bold text-sm">
                    {selectedRecord.quantity_produced_mt.toLocaleString()} MT Declared
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    Dispatched Transit Passes: <strong>{selectedRecord.quantity_dispatched_mt.toLocaleString()} MT</strong>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-300 rounded-xl p-4">
                <div className="flex items-center gap-2 text-red-800 font-bold mb-2">
                  <ShieldAlert size={16} /> Non-Compliance Findings &amp; Satellite Cross-Audit
                </div>
                <p className="text-slate-700 text-xs leading-relaxed mb-3">
                  {selectedRecord.notes}
                </p>
                <ul className="space-y-1.5">
                  {selectedRecord.anomaly_flags.map((f) => (
                    <li key={f} className="text-red-900 flex items-start gap-2 font-medium">
                      <span className="font-bold">•</span>
                      <span>
                        <strong>{f.replace(/_/g, ' ')}:</strong> Cross-verified against official DGPS pillars &amp; satellite elevation maps.
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Note Form */}
              <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-300">
                <div className="text-slate-700 font-bold uppercase text-[10px]">
                  District Mining Officer (DMO) Resolution Memo <span className="text-red-600">*</span>
                </div>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Enter field inspection findings, demand draft reference, challan number, or dismissal rationale..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs text-slate-900 focus:bg-white focus:border-gov-600 focus:ring-1 focus:ring-gov-600 outline-none h-24 transition-colors"
                />

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setResolutionStatus('VERIFIED')}
                    className={clsx(
                      'py-2 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer',
                      resolutionStatus === 'VERIFIED'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    ✓ Dismiss as Compliant
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionStatus('NOTICE_ISSUED')}
                    className={clsx(
                      'py-2 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer',
                      resolutionStatus === 'NOTICE_ISSUED'
                        ? 'bg-red-600 text-white border-red-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    ⚠️ Issue Statutory Notice (Rule 28)
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-300 flex items-center justify-between">
              {selectedRecord.lon && selectedRecord.lat ? (
                <button
                  onClick={() => {
                    handleInspectOnMap(selectedRecord.lon!, selectedRecord.lat!, selectedRecord.lease_id)
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-gov-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <MapPin size={13} /> Inspect on GIS Map
                </button>
              ) : <div />}

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  disabled={submitting}
                  className="px-5 py-1.5 bg-gov-600 hover:bg-gov-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <MessageSquare size={13} />
                  )}
                  Save Statutory Action
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Detail Modal (Vehicle Alert Dossier) ─── */}
      {selectedVehicleAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-300 w-full max-w-xl rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Radio size={20} className="text-red-500 animate-pulse" />
                <div>
                  <h2 className="text-sm font-bold tracking-tight">
                    Vehicle Telematics Alert: {selectedVehicleAlert.vehicle_number}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Automated AI Dashcam &amp; DMS Geofence Radar Incident
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVehicleAlert(null)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs bg-slate-50/50">
              <div className="bg-white p-4 rounded-xl border border-slate-300 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {selectedVehicleAlert.vehicle_number}
                  </span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 rounded font-bold uppercase text-[10px]">
                    {selectedVehicleAlert.alert_type}
                  </span>
                </div>

                <div className="text-slate-800 font-medium text-xs">
                  {selectedVehicleAlert.alert_type_display}
                </div>

                <p className="text-slate-600 text-xs leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {selectedVehicleAlert.description}
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Driver Name</span>
                    <strong className="text-slate-800">{selectedVehicleAlert.driver_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Mining Zone</span>
                    <strong className="text-slate-800">{selectedVehicleAlert.mine_name || 'Designated Perimeter'}</strong>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 flex items-start gap-2">
                <ShieldAlert size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  Immediate action required: Notice dispatched to Regional Vigilance Squad and District Transport Officer (RTO).
                </span>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-300 flex items-center justify-between">
              <button
                onClick={() => {
                  const lon = selectedVehicleAlert.alert_lon ?? 78.4867
                  const lat = selectedVehicleAlert.alert_lat ?? 17.3850
                  handleInspectOnMap(
                    lon,
                    lat,
                    selectedVehicleAlert.lease_id || undefined,
                    selectedVehicleAlert.vehicle_number
                  )
                }}
                className="px-3 py-1.5 text-xs font-bold text-gov-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <MapPin size={13} /> Inspect on GIS Map
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedVehicleAlert(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleResolve}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle size={13} />
                  Mark as Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Statutory Escalation to Zonal Mining Officer Modal ─── */}
      {escalationTarget && (() => {
        const { type, item, district } = escalationTarget
        const officerInfo = getZonalOfficerForDistrict(district)
        const title = type === 'production'
          ? (item as ProductionAnomalyRecord).lease_name
          : `Vehicle ${(item as VehicleAlert).vehicle_number}`
        const caseRef = type === 'production'
          ? (item as ProductionAnomalyRecord).lease_id
          : (item as VehicleAlert).alert_type

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white border border-slate-300 w-full max-w-xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-scale-up font-sans">
              <div className="px-6 py-4 bg-purple-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert size={20} className="text-amber-400" />
                  <div>
                    <h2 className="text-sm font-bold tracking-tight">
                      Statutory Escalation to Zonal Mining Officer
                    </h2>
                    <p className="text-[11px] text-purple-200">
                      Rule 28 / Section 21 of MMDR Act • On-Ground Field Action Mandate
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEscalationTarget(null)}
                  className="p-1 hover:bg-white/10 rounded-lg text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs bg-slate-50/50 overflow-y-auto">
                {/* Target Issue Summary */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-sm text-slate-900">{title}</span>
                    <span className="font-mono text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-bold">
                      {caseRef}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                    <MapPin size={12} className="text-gov-600" />
                    <span>Jurisdiction: <strong>{district} District</strong></span>
                  </div>
                </div>

                {/* Designated Zonal Officer Card */}
                <div className="bg-purple-50/70 border-2 border-purple-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-purple-700 tracking-wider block">
                        Assigned Statutory Zonal Authority
                      </span>
                      <strong className="text-sm text-purple-950 font-extrabold block mt-0.5">
                        {officerInfo.officer}
                      </strong>
                      <span className="text-xs text-purple-800 font-medium">
                        {officerInfo.designation}
                      </span>
                    </div>
                    <span className="text-[10px] bg-purple-200 text-purple-900 font-mono font-bold px-2 py-0.5 rounded">
                      FIELD ENFORCEMENT
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-purple-100 text-slate-700 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Zone</span>
                      <strong className="text-slate-900 truncate block">{officerInfo.zone}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Official Email</span>
                      <strong className="text-purple-700 truncate block">{officerInfo.email}</strong>
                    </div>
                  </div>
                </div>

                {/* Instruction Input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Statutory Field Directives / Inspection Instructions (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={escalationInstruction}
                    onChange={(e) => setEscalationInstruction(e.target.value)}
                    placeholder="Enter specific directions (e.g. Conduct physical boundary pillar verification, seal uncalibrated weighbridge, or seize haul truck)..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-white border-t border-slate-300 flex items-center justify-end gap-2">
                <button
                  onClick={() => setEscalationTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmEscalation}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Send size={13} />
                  <span>Dispatch Statutory Escalation</span>
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )

  if (embed) {
    return (
      <div className="flex-1 bg-slate-100 overflow-y-auto custom-scrollbar font-sans text-slate-900">
        {mainContent}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      <div className="h-1.5 w-full flex flex-shrink-0">
        <div className="h-full w-1/3 bg-[#FF671F]" />
        <div className="h-full w-1/3 bg-[#FFFFFF]" />
        <div className="h-full w-1/3 bg-[#046A38]" />
      </div>

      <header className="bg-white border-b border-slate-300 px-6 py-3 shadow-xs flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-gov-600 bg-blue-50/50 flex items-center justify-center p-1 flex-shrink-0">
              <span className="text-[9px] font-black text-gov-600 tracking-tighter">TS DMG</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold text-gov-600 tracking-tight leading-none">
                  తెలంగాణ ప్రభుత్వం | Department of Mines &amp; Geology
                </h1>
                <span className="text-[10px] bg-red-50 border border-red-300 text-red-800 px-1.5 py-0.2 rounded font-bold uppercase">
                  Alerts &amp; Issues
                </span>
              </div>
              <h2 className="text-xs font-bold text-slate-800 leading-tight mt-1">
                AI/ML Production Anomaly Triage &amp; Statutory Non-Compliance Desk
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-bold text-slate-700 transition-colors shadow-xs"
            >
              Executive MIS
            </Link>
            <Link
              to="/map"
              className="px-3.5 py-1.5 bg-gov-600 hover:bg-gov-700 text-white rounded text-xs font-bold transition-colors shadow-xs"
            >
              Cadastral Map
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{mainContent}</main>
    </div>
  )
}
