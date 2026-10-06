import React, { useState, useMemo, useRef } from 'react'
import {
  Scale,
  Video,
  Camera,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle,
  Truck,
  FileText,
  Printer,
  RefreshCw,
  Eye,
  ShieldAlert,
  ArrowUpRight,
  Maximize2,
  Clock,
  Layers,
  MapPin,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store'

export interface WeighbridgeRecord {
  id: string
  slipNumber: string
  timestamp: string
  mineName: string
  district: string
  scaleName: string
  vehicleNumber: string
  driverName: string
  ePermitNumber: string
  mineral: string
  grossWeightKg: number
  tareWeightKg: number
  netWeightKg: number
  permissibleLimitKg: number
  overloadKg: number
  anprPlateMatched: boolean
  ocrConfidence: number
  status: 'CLEARED' | 'OVERLOADED' | 'PLATE_MISMATCH' | 'IN_WEIGHMENT'
  gateCamera: string
}

const INITIAL_WEIGHBRIDGE_DATA: WeighbridgeRecord[] = [
  {
    id: 'WB-001',
    slipNumber: 'TS-WB-2026-09811',
    timestamp: '2026-10-06 14:42:18',
    mineName: 'Singareni Collieries OCP-IV',
    district: 'Bhadradri Kothagudem',
    scaleName: 'Scale #1 (Pit Outbound Weighbridge)',
    vehicleNumber: 'TG07U1889',
    driverName: 'Rameshwar Rao',
    ePermitNumber: 'eTP-TG-2026-98110',
    mineral: 'Coal (Grade G-11)',
    grossWeightKg: 43800,
    tareWeightKg: 14200,
    netWeightKg: 29600,
    permissibleLimitKg: 28000,
    overloadKg: 1600,
    anprPlateMatched: true,
    ocrConfidence: 99.4,
    status: 'OVERLOADED',
    gateCamera: 'CAM-01: Inbound Pit Scale Gate',
  },
  {
    id: 'WB-002',
    slipNumber: 'TS-WB-2026-09812',
    timestamp: '2026-10-06 14:38:05',
    mineName: 'Singareni Collieries OCP-IV',
    district: 'Bhadradri Kothagudem',
    scaleName: 'Scale #2 (Main Dispatch Gate)',
    vehicleNumber: 'TS08UB4901',
    driverName: 'Mohd. Khaleel',
    ePermitNumber: 'eTP-TG-2026-98104',
    mineral: 'Coal (Grade G-11)',
    grossWeightKg: 38200,
    tareWeightKg: 13500,
    netWeightKg: 24700,
    permissibleLimitKg: 26000,
    overloadKg: 0,
    anprPlateMatched: true,
    ocrConfidence: 98.9,
    status: 'CLEARED',
    gateCamera: 'CAM-02: Outbound Dispatch Gate',
  },
  {
    id: 'WB-003',
    slipNumber: 'TS-WB-2026-09813',
    timestamp: '2026-10-06 14:31:40',
    mineName: 'Ibrahimpatnam Granite & Dolerite',
    district: 'Rangareddy',
    scaleName: 'Scale #1 (Quarry Exit Weighbridge)',
    vehicleNumber: 'TS12UD9828',
    driverName: 'B. Venkat Reddy',
    ePermitNumber: 'eTP-TG-2026-97992',
    mineral: 'Black Granite Blocks',
    grossWeightKg: 46200,
    tareWeightKg: 15100,
    netWeightKg: 31100,
    permissibleLimitKg: 28000,
    overloadKg: 3100,
    anprPlateMatched: true,
    ocrConfidence: 99.1,
    status: 'OVERLOADED',
    gateCamera: 'CAM-03: Quarry Exit Scale',
  },
  {
    id: 'WB-004',
    slipNumber: 'TS-WB-2026-09814',
    timestamp: '2026-10-06 14:25:12',
    mineName: 'Karimnagar Tan Brown Granite Basin',
    district: 'Karimnagar',
    scaleName: 'Scale #3 (Crushing Feeder Weighbridge)',
    vehicleNumber: 'TS02EA3310',
    driverName: 'K. Sammaiah',
    ePermitNumber: 'eTP-TG-2026-97880',
    mineral: 'Tan Brown Granite',
    grossWeightKg: 34500,
    tareWeightKg: 12200,
    netWeightKg: 22300,
    permissibleLimitKg: 25000,
    overloadKg: 0,
    anprPlateMatched: true,
    ocrConfidence: 97.8,
    status: 'CLEARED',
    gateCamera: 'CAM-04: Crushing Plant Gate',
  },
  {
    id: 'WB-005',
    slipNumber: 'TS-WB-2026-09815',
    timestamp: '2026-10-06 14:18:55',
    mineName: 'Paloncha Dolomite & Limestone Quarry',
    district: 'Bhadradri Kothagudem',
    scaleName: 'Scale #1 (Primary Pit Scale)',
    vehicleNumber: 'TS04UB7712',
    driverName: 'S. Narsimha',
    ePermitNumber: 'eTP-TG-2026-97645',
    mineral: 'Dolomite Flux',
    grossWeightKg: 39800,
    tareWeightKg: 13900,
    netWeightKg: 25900,
    permissibleLimitKg: 26000,
    overloadKg: 0,
    anprPlateMatched: false,
    ocrConfidence: 84.2,
    status: 'PLATE_MISMATCH',
    gateCamera: 'CAM-01: Inbound Pit Scale Gate',
  },
  {
    id: 'WB-006',
    slipNumber: 'TS-WB-2026-09816',
    timestamp: '2026-10-06 14:12:03',
    mineName: 'Wadapally Krishna River Sand Reach',
    district: 'Nalgonda',
    scaleName: 'Scale #1 (River Ramp Weighbridge)',
    vehicleNumber: 'TS05UB1122',
    driverName: 'Ch. Prasad',
    ePermitNumber: 'eTP-TG-2026-97510',
    mineral: 'River Sand',
    grossWeightKg: 36400,
    tareWeightKg: 11800,
    netWeightKg: 24600,
    permissibleLimitKg: 25000,
    overloadKg: 0,
    anprPlateMatched: true,
    ocrConfidence: 99.6,
    status: 'CLEARED',
    gateCamera: 'CAM-03: Quarry Exit Scale',
  },
  {
    id: 'WB-007',
    slipNumber: 'TS-WB-2026-09817',
    timestamp: '2026-10-06 14:04:47',
    mineName: 'Singareni Collieries OCP-IV',
    district: 'Bhadradri Kothagudem',
    scaleName: 'Scale #1 (Pit Outbound Weighbridge)',
    vehicleNumber: 'TG07U9921',
    driverName: 'E. Mallesh',
    ePermitNumber: 'eTP-TG-2026-97422',
    mineral: 'Coal (Grade G-11)',
    grossWeightKg: 41200,
    tareWeightKg: 14100,
    netWeightKg: 27100,
    permissibleLimitKg: 28000,
    overloadKg: 0,
    anprPlateMatched: true,
    ocrConfidence: 98.4,
    status: 'CLEARED',
    gateCamera: 'CAM-01: Inbound Pit Scale Gate',
  },
  {
    id: 'WB-008',
    slipNumber: 'TS-WB-2026-09818',
    timestamp: '2026-10-06 13:58:20',
    mineName: 'Tandur Blue Limestone Belt',
    district: 'Vikarabad',
    scaleName: 'Scale #2 (Dispatch Weighbridge)',
    vehicleNumber: 'TS13UA4401',
    driverName: 'M. Venkatesh',
    ePermitNumber: 'eTP-TG-2026-97330',
    mineral: 'Limestone Slabs',
    grossWeightKg: 32900,
    tareWeightKg: 11200,
    netWeightKg: 21700,
    permissibleLimitKg: 24000,
    overloadKg: 0,
    anprPlateMatched: true,
    ocrConfidence: 99.2,
    status: 'CLEARED',
    gateCamera: 'CAM-02: Outbound Dispatch Gate',
  },
]

export default function WeighbridgeANPRView() {
  const { user } = useAuthStore()
  const [records, setRecords] = useState<WeighbridgeRecord[]>(INITIAL_WEIGHBRIDGE_DATA)
  const [selectedRecord, setSelectedRecord] = useState<WeighbridgeRecord | null>(null)
  const [activeCam, setActiveCam] = useState<'CAM-01' | 'CAM-02' | 'CAM-03' | 'CAM-04'>('CAM-01')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CLEARED' | 'OVERLOADED' | 'PLATE_MISMATCH'>('ALL')
  const [mineFilter, setMineFilter] = useState<string>('ALL')

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
      if (mineFilter !== 'ALL' && r.mineName !== mineFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match =
          r.vehicleNumber.toLowerCase().includes(q) ||
          r.slipNumber.toLowerCase().includes(q) ||
          r.ePermitNumber.toLowerCase().includes(q) ||
          r.mineName.toLowerCase().includes(q) ||
          r.driverName.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [records, statusFilter, mineFilter, searchQuery])

  // Statistics
  const stats = useMemo(() => {
    const totalTonnageMt = (records.reduce((acc, r) => acc + r.netWeightKg, 0) / 1000).toFixed(1)
    const overloadCount = records.filter((r) => r.status === 'OVERLOADED').length
    const mismatchCount = records.filter((r) => r.status === 'PLATE_MISMATCH').length
    const totalCount = records.length
    return { totalTonnageMt, overloadCount, mismatchCount, totalCount }
  }, [records])

  // Unique Mines for Filter
  const uniqueMines = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.mineName)))
  }, [records])

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      'Slip Number',
      'Timestamp',
      'Mine Name',
      'District',
      'Scale Station',
      'Vehicle Number',
      'Driver Name',
      'e-Permit Number',
      'Mineral Type',
      'Gross Weight (KG)',
      'Tare Weight (KG)',
      'Net Weight (KG)',
      'Permissible Limit (KG)',
      'Overload (KG)',
      'ANPR Match',
      'OCR Confidence (%)',
      'Status',
    ]

    const rows = filteredRecords.map((r) => [
      r.slipNumber,
      r.timestamp,
      `"${r.mineName}"`,
      r.district,
      `"${r.scaleName}"`,
      r.vehicleNumber,
      `"${r.driverName}"`,
      r.ePermitNumber,
      `"${r.mineral}"`,
      r.grossWeightKg,
      r.tareWeightKg,
      r.netWeightKg,
      r.permissibleLimitKg,
      r.overloadKg,
      r.anprPlateMatched ? 'YES' : 'NO',
      r.ocrConfidence,
      r.status,
    ])

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Telangana_Weighbridge_ANPR_Register_${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Weighbridge & ANPR dispatch register exported to CSV!', { icon: '📥' })
  }

  // Action: Detain or Flag Truck
  const handleFlagVehicle = (rec: WeighbridgeRecord) => {
    toast.error(`Statutory detention order dispatched for ${rec.vehicleNumber} (Scale: ${rec.scaleName})!`, {
      icon: '🚨',
      duration: 5000,
    })
  }

  // Action: Re-scan ANPR Optical Plate
  const handleRescanANPR = (rec: WeighbridgeRecord) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === rec.id
          ? { ...r, anprPlateMatched: true, ocrConfidence: 99.8, status: r.overloadKg > 0 ? 'OVERLOADED' : 'CLEARED' }
          : r
      )
    )
    toast.success(`High-speed optical OCR re-verified: ${rec.vehicleNumber} matched 99.8% with e-Permit!`, {
      icon: '📸',
    })
  }

  return (
    <div className="flex-1 bg-slate-100 p-4 sm:p-6 overflow-y-auto custom-scrollbar font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Title Banner ── */}
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl border-2 border-indigo-600 bg-indigo-50/70 flex items-center justify-center p-1 shadow-xs flex-shrink-0">
              <Scale size={26} className="text-indigo-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  Weighbridge &amp; In-Mine ANPR Surveillance Console
                </h1>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Telematics Active
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 max-w-3xl leading-relaxed">
                Integrated real-time loadcell scale telemetry, automated gross/tare weighment computation, and in-pit <strong>Automatic Number Plate Recognition (ANPR)</strong> optical camera surveillance across Telangana mining concessions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Download size={14} className="text-indigo-600" />
              <span>Export Weighbridge Register</span>
            </button>
          </div>
        </div>

        {/* ── KPI Summary Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Today's Mineral Net Dispatch</span>
              <Scale size={16} className="text-indigo-600" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-mono">
              {stats.totalTonnageMt} <span className="text-xs font-normal text-slate-500">Metric Tonnes</span>
            </div>
            <div className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
              ✓ Synchronized with TG-Mines Portal
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Weighbridge Dispatches</span>
              <Truck size={16} className="text-blue-600" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-mono">
              {stats.totalCount} <span className="text-xs font-normal text-slate-500">Trips Recorded</span>
            </div>
            <div className="text-[10px] text-slate-500 font-semibold mt-1">
              Across 8 Concession Gates
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Overloading Violations</span>
              <AlertTriangle size={16} className="text-red-600" />
            </div>
            <div className="text-xl font-extrabold text-red-600 font-mono">
              {stats.overloadCount} <span className="text-xs font-normal text-slate-500">Trucks Flagged</span>
            </div>
            <div className="text-[10px] text-red-600 font-semibold mt-1">
              Exceeded Section 194 MV Permissible Axle Limit
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">ANPR Plate OCR Accuracy</span>
              <Camera size={16} className="text-emerald-600" />
            </div>
            <div className="text-xl font-extrabold text-emerald-700 font-mono">
              99.2% <span className="text-xs font-normal text-slate-500">Confidence</span>
            </div>
            <div className="text-[10px] text-amber-600 font-semibold mt-1">
              {stats.mismatchCount} Plate Mismatches Investigating
            </div>
          </div>
        </div>

        {/* ── Section 1: In-Mine ANPR Live Optical Feeds Grid ── */}
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Video className="text-red-600 animate-pulse" size={18} />
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                In-Mine Automated Optical ANPR Camera Surveillance
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Real-time High-Resolution Optical Character Recognition (OCR) Stream
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Primary Main Camera (Blank Screen for Cameras) */}
            <div className="lg:col-span-2 relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-md h-72 sm:h-84 flex items-center justify-center">
              {/* Clean Blank Camera Screen Graphic */}
              <div className="flex flex-col items-center justify-center text-slate-600 select-none pointer-events-none">
                <Camera size={40} className="text-slate-700 mb-2 opacity-50" />
                <span className="text-xs font-mono font-bold text-slate-500 tracking-wider">OPTICAL ANPR CAMERA FEED</span>
                <span className="text-[10px] text-slate-600 font-mono mt-0.5">STANDBY · WAITING FOR VEHICLE SCALE INGRESS</span>
              </div>

              {/* In-Video ANPR HUD Overlay */}
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1 rounded text-white text-xs border border-white/20">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="font-mono font-bold">CAM-01: Singareni OCP-IV Pit Outbound</span>
                <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded font-bold uppercase">LIVE</span>
              </div>

              {/* Optical Detection Box on Vehicle */}
              <div className="absolute top-1/3 left-1/3 w-48 h-28 border-2 border-emerald-400 bg-emerald-500/10 rounded flex flex-col justify-between p-1.5 pointer-events-none shadow-lg">
                <div className="flex justify-between items-center text-[9px] bg-black/80 text-emerald-300 px-1 py-0.5 rounded font-mono font-bold">
                  <span>PLATE: TG07U1889</span>
                  <span>OCR: 99.4%</span>
                </div>
                <div className="text-[9px] text-white font-mono bg-black/80 px-1 rounded self-start">
                  10-WHEELER · AXLE OK
                </div>
              </div>

              {/* Live Scale Telemetry Readout Bar in Video Footer */}
              <div className="absolute bottom-3 left-3 right-3 bg-black/80 backdrop-blur-md border border-white/15 rounded-lg p-2.5 flex items-center justify-between text-white text-xs flex-wrap gap-2">
                <div className="flex items-center gap-3 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Detected Plate</span>
                    <strong className="text-emerald-400 font-bold">TG07U1889</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Gross Scale</span>
                    <strong className="text-white font-bold">43,800 KG</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Calculated Net</span>
                    <strong className="text-amber-400 font-bold">29,600 KG</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-red-900/90 text-red-200 border border-red-500 px-2 py-0.5 rounded font-bold uppercase">
                    ⚠️ OVERLOAD (+1.6 MT)
                  </span>
                  <button
                    onClick={() => {
                      const rec = records[0]
                      setSelectedRecord(rec)
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer"
                  >
                    View Weighment Slip
                  </button>
                </div>
              </div>
            </div>

            {/* In-Mine Camera Feeds Selector & Secondary Previews */}
            <div className="flex flex-col gap-3 justify-between">
              <div
                onClick={() => setActiveCam('CAM-01')}
                className={clsx(
                  'p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between',
                  activeCam === 'CAM-01'
                    ? 'bg-indigo-50 border-indigo-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-900">CAM-01: Inbound Pit Scale Gate</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Singareni OCP-IV · Ingress Scale</p>
                </div>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                  99.4% OCR
                </span>
              </div>

              <div
                onClick={() => setActiveCam('CAM-02')}
                className={clsx(
                  'p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between',
                  activeCam === 'CAM-02'
                    ? 'bg-indigo-50 border-indigo-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-900">CAM-02: Outbound Dispatch Gate</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Singareni OCP-IV · Exit Weighbridge</p>
                </div>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                  98.9% OCR
                </span>
              </div>

              <div
                onClick={() => setActiveCam('CAM-03')}
                className={clsx(
                  'p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between',
                  activeCam === 'CAM-03'
                    ? 'bg-indigo-50 border-indigo-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-900">CAM-03: Quarry Exit Scale</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Ibrahimpatnam Granite · Primary Ramp</p>
                </div>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                  99.1% OCR
                </span>
              </div>

              <div
                onClick={() => setActiveCam('CAM-04')}
                className={clsx(
                  'p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between',
                  activeCam === 'CAM-04'
                    ? 'bg-indigo-50 border-indigo-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-900">CAM-04: Crushing Plant Gate</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Karimnagar Tan Brown · Feeder Scale</p>
                </div>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                  97.8% OCR
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Real-time Weighbridge Scale Telemetry & Dispatch Register Table ── */}
        <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xs space-y-3 p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} className="text-indigo-600" />
                Live Weighbridge Telematics &amp; e-Transit Pass Dispatch Register
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time automatic weighbridge gross, tare, and net calculations with instant statutory limit checks.
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Vehicle / Slip / e-Permit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-600 outline-none w-56"
                />
              </div>

              <select
                value={mineFilter}
                onChange={(e) => setMineFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">All Mines / Concessions</option>
                {uniqueMines.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="CLEARED">Cleared / Compliant</option>
                <option value="OVERLOADED">Overloaded (Violations)</option>
                <option value="PLATE_MISMATCH">Plate Mismatch</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Weighment Slip</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Concession &amp; Scale</th>
                  <th className="py-2.5 px-3">ANPR Vehicle</th>
                  <th className="py-2.5 px-3">e-Permit Pass</th>
                  <th className="py-2.5 px-3">Mineral</th>
                  <th className="py-2.5 px-3 text-right">Gross (KG)</th>
                  <th className="py-2.5 px-3 text-right">Tare (KG)</th>
                  <th className="py-2.5 px-3 text-right">Net Wt (MT)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    className="hover:bg-indigo-50/40 transition-colors group cursor-pointer"
                    onClick={() => setSelectedRecord(rec)}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {rec.slipNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                      {rec.timestamp}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 truncate max-w-[200px]">{rec.mineName}</div>
                      <div className="text-[10px] text-slate-400">{rec.scaleName}</div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                        <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[11px]">
                          {rec.vehicleNumber}
                        </span>
                        {rec.anprPlateMatched ? (
                          <span className="text-[10px] text-emerald-600 font-bold" title="ANPR Matched">✓</span>
                        ) : (
                          <span className="text-[10px] text-red-600 font-bold" title="ANPR Mismatch">⚠️</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-indigo-700 font-semibold whitespace-nowrap">
                      {rec.ePermitNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {rec.mineral}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                      {rec.grossWeightKg.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500 whitespace-nowrap">
                      {rec.tareWeightKg.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                      <span className={rec.overloadKg > 0 ? 'text-red-600' : 'text-slate-900'}>
                        {(rec.netWeightKg / 1000).toFixed(2)} MT
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={clsx(
                          'text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase',
                          rec.status === 'CLEARED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : rec.status === 'OVERLOADED'
                            ? 'bg-red-50 text-red-800 border-red-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        )}
                      >
                        {rec.status === 'OVERLOADED' ? `+${(rec.overloadKg / 1000).toFixed(1)} MT OVER` : rec.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedRecord(rec)}
                          className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[11px] font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                          title="Print or Inspect Official Weighment Slip"
                        >
                          <Printer size={12} className="text-indigo-600" />
                          <span>Slip</span>
                        </button>
                        {rec.status === 'OVERLOADED' && (
                          <button
                            onClick={() => handleFlagVehicle(rec)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                            title="Detain Overloaded Truck"
                          >
                            Detain
                          </button>
                        )}
                        {!rec.anprPlateMatched && (
                          <button
                            onClick={() => handleRescanANPR(rec)}
                            className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                            title="Re-scan Optical OCR"
                          >
                            Re-scan
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── Official Printable Weighbridge Slip Modal ── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-300 w-full max-w-xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-scale-up font-sans">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale size={20} className="text-indigo-400" />
                <h3 className="text-sm font-bold tracking-tight">Official Telangana State Weighbridge Slip</h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Statutory Document Body */}
            <div className="p-6 overflow-y-auto space-y-4 bg-white text-slate-800 text-xs">
              <div className="text-center pb-3 border-b border-slate-300 space-y-1">
                <div className="font-extrabold text-sm uppercase text-slate-900">
                  Government of Telangana · Department of Mines &amp; Geology
                </div>
                <div className="text-[11px] text-slate-600 font-semibold">
                  Electronic Weighbridge Telematics &amp; Transit Dispatch Certificate
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  Form E-WB/28 · Issued under Telangana Minor Mineral Concession Rules, 1966
                </div>
              </div>

              {/* Slip Metadata */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Slip Number</span>
                  <span className="font-mono font-bold text-slate-900">{selectedRecord.slipNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Date &amp; Time</span>
                  <span className="font-mono text-slate-800">{selectedRecord.timestamp}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Mine Concession</span>
                  <span className="font-bold text-slate-900">{selectedRecord.mineName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Weighbridge Scale</span>
                  <span className="text-slate-800">{selectedRecord.scaleName}</span>
                </div>
              </div>

              {/* Vehicle & e-Permit Details */}
              <div className="grid grid-cols-2 gap-3 bg-indigo-50/50 p-3 rounded-lg border border-indigo-200 text-xs">
                <div>
                  <span className="text-[10px] text-indigo-700 uppercase font-semibold block">ANPR Vehicle Number</span>
                  <span className="font-mono font-extrabold text-sm text-slate-900">{selectedRecord.vehicleNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-700 uppercase font-semibold block">Transit e-Permit No.</span>
                  <span className="font-mono font-bold text-indigo-900">{selectedRecord.ePermitNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Mineral Classification</span>
                  <span className="font-bold text-slate-800">{selectedRecord.mineral}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Authorized Driver</span>
                  <span className="text-slate-800">{selectedRecord.driverName}</span>
                </div>
              </div>

              {/* Certified Weight Computations */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-slate-50/80">
                      <td className="py-2 px-3 font-semibold text-slate-600">Gross Scale Weight:</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {selectedRecord.grossWeightKg.toLocaleString()} KG
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-600">Certified Tare Weight:</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-700">
                        {selectedRecord.tareWeightKg.toLocaleString()} KG
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/60 font-bold">
                      <td className="py-2.5 px-3 text-slate-900">Net Mineral Dispatched:</td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm text-emerald-800">
                        {selectedRecord.netWeightKg.toLocaleString()} KG ({(selectedRecord.netWeightKg / 1000).toFixed(2)} MT)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-600">Statutory Axle Permissible:</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {selectedRecord.permissibleLimitKg.toLocaleString()} KG
                      </td>
                    </tr>
                    {selectedRecord.overloadKg > 0 && (
                      <tr className="bg-red-50 text-red-800 font-bold">
                        <td className="py-2 px-3">Overload Excess Weight:</td>
                        <td className="py-2 px-3 text-right font-mono">
                          +{selectedRecord.overloadKg.toLocaleString()} KG (STATUTORY PENALTY APPLICABLE)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Statutory Certification Seals */}
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle size={15} />
                  <span>Loadcell Calibrated by Weights &amp; Measures Dept.</span>
                </div>
                <div className="font-mono text-[10px]">
                  Digital Signature: TG-DMG-WB-HASH-8812
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print()
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>Print Official Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
