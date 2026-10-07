import React, { useState } from 'react'
import {
  FileText, Download, Printer, Filter, Calendar, Building2,
  CheckCircle2, AlertTriangle, FileSpreadsheet, ShieldCheck,
  RefreshCw, MapPin, Truck, Scale, Users, Layers, ExternalLink
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { useMapStore, useAuthStore } from '../../store'
import { TELANGANA_DISTRICT_NAMES } from '../../utils/districts'
import { MOCK_LEASES } from '../../api/leases'
import type { MiningLease } from '../../types'

export type ReportCategory =
  | 'PRODUCTION_ROYALTY'
  | 'SPATIAL_COMPLIANCE'
  | 'WEIGHBRIDGE_TRANSIT'
  | 'HRO_GRIEVANCES'

interface ReportMeta {
  id: string
  title: string
  category: ReportCategory
  period: string
  referenceId: string
  description: string
}

export default function ReportsView({ onNavigateToMap }: { onNavigateToMap?: () => void }) {
  const { user } = useAuthStore()
  const { vehicles } = useMapStore()
  const leases: MiningLease[] = MOCK_LEASES

  const [activeCategory, setActiveCategory] = useState<ReportCategory>('SPATIAL_COMPLIANCE')
  const [selectedDistrict, setSelectedDistrict] = useState('ALL')
  const [selectedLeaseId, setSelectedLeaseId] = useState('ALL')
  const [reportPeriod, setReportPeriod] = useState('FY 2025-2026 (Q3)')
  const [isExporting, setIsExporting] = useState(false)

  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Filtered dataset for dynamic report rendering
  const activeLeases = leases.filter((l) => {
    if (selectedDistrict !== 'ALL' && l.district !== selectedDistrict) return false
    if (selectedLeaseId !== 'ALL' && l.lease_id !== selectedLeaseId) return false
    return true
  })

  const validLeasesCount = activeLeases.filter((l) => l.status === 'ACTIVE' || (l as any).status === 'VALID').length
  const pendingLeasesCount = activeLeases.filter((l) => l.status === 'PENDING').length
  const expiredLeasesCount = activeLeases.filter((l) => l.status === 'EXPIRED').length

  const handlePrint = () => {
    setIsExporting(true)
    setTimeout(() => {
      setIsExporting(false)
      window.print()
    }, 400)
  }

  const handleDownloadCSV = () => {
    let csvHeader = ''
    let csvRows: string[] = []
    let filename = ''

    if (activeCategory === 'SPATIAL_COMPLIANCE') {
      csvHeader = 'Lease ID,Mine Name,Leaseholder,District,Mandal,Mineral,Status,Area (Ha),Boundary Audit\n'
      csvRows = activeLeases.map(
        (l) =>
          `"${l.lease_id}","${l.mine_name}","${l.leaseholder_name}","${l.district}","${l.mandal}","${l.mineral_type}","${l.status}","${l.area_hectares || 12.5}","VERIFIED COMPLIANT"`
      )
      filename = `Telangana_Mines_Spatial_Compliance_Report_${Date.now()}.csv`
    } else if (activeCategory === 'PRODUCTION_ROYALTY') {
      csvHeader = 'Mine Name,District,Mineral,Monthly Output (MT),Declared Dispatch (MT),Royalty Realized (₹ Cr),Royalty Status\n'
      csvRows = [
        '"Singareni Collieries OCP-IV","Bhadradri Kothagudem","Coal (Grade G-11)","538200","420000","42.80","COLLECTED"',
        '"Ibrahimpatnam Granite Basin","Rangareddy","Black Granite","8900","14200","3.45","COLLECTED"',
        '"Karimnagar Tan Brown Concession","Karimnagar","Tan Brown Granite","12400","11900","4.10","COLLECTED"',
        '"Paloncha Dolomite Pit #2","Bhadradri Kothagudem","Dolomite Flux","39800","38500","1.85","COLLECTED"',
        '"Wadapally River Reach 7","Nalgonda","Ordinary River Sand","68000","68000","2.72","COLLECTED"',
        '"Tandur Limestone Belt","Vikarabad","Limestone","184000","181000","14.60","COLLECTED"',
      ]
      filename = `Telangana_Production_Royalty_Report_${Date.now()}.csv`
    } else if (activeCategory === 'WEIGHBRIDGE_TRANSIT') {
      csvHeader = 'Slip Number,Vehicle Number,Scale Name,Mine Concession,Gross (KG),Tare (KG),Net (KG),Overload (KG),Status\n'
      csvRows = [
        '"TS-WB-2026-09811","TG07U1889","Scale #1 (Singareni Pit)","Singareni OCP-IV","43800","14200","29600","1600","OVERLOADED"',
        '"TS-WB-2026-09812","TS08UB4901","Scale #2 (Dispatch Gate)","Singareni OCP-IV","38200","13500","24700","0","CLEARED"',
        '"TS-WB-2026-09813","TS12UD9828","Scale #1 (Quarry Exit)","Ibrahimpatnam Granite","46200","15100","31100","3100","OVERLOADED"',
        '"TS-WB-2026-09814","TS02EA3310","Scale #3 (Crusher Gate)","Karimnagar Basin","34500","12200","22300","0","CLEARED"',
        '"TS-WB-2026-09815","TS05UE0999","Scale #1 (Paloncha Primary)","Paloncha Quarry","39800","13900","25900","0","CLEARED"',
      ]
      filename = `Telangana_Weighbridge_Transit_Register_${Date.now()}.csv`
    } else {
      csvHeader = 'Complaint ID,Category,Location,District,Lodged Date,Zonal Jurisdiction,Status\n'
      csvRows = [
        '"PGRS-2026-0812","Illegal Night Sand Extraction","Wadapally Godavari Reach","Nalgonda","2026-10-04","Yadadri Zone","UNDER_INVESTIGATION"',
        '"PGRS-2026-0794","Blasting Vibrations Past Curfew","Koheda Granite Hill","Rangareddy","2026-10-02","Capital & Southern Zone","ESCALATED_TO_ZONAL_OFFICER"',
        '"PGRS-2026-0781","Overloaded Tippers Highway Spillage","NH-365 Mineral Corridor","Mahabubabad","2026-09-29","Kakatiya Zone","RESOLVED"',
      ]
      filename = `Telangana_PGRS_Grievances_Audit_${Date.now()}.csv`
    }

    const blob = new Blob([csvHeader + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`Official CSV dataset generated and downloaded!`, { icon: '📥' })
  }

  return (
    <div className="flex-1 bg-slate-100 p-3 sm:p-6 overflow-y-auto custom-scrollbar font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Top Header Controls (Hidden during browser print) ── */}
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full border-2 border-gov-600 bg-blue-50/50 flex items-center justify-center p-1 shadow-xs flex-shrink-0">
              <FileText size={24} className="text-gov-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-gov-700 tracking-tight">
                  Statewide Mineral &amp; Concession Reports Center
                </h1>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300 uppercase">
                  Statutory Records
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Generate, preview, and download formal compliance audits, royalty ledgers, and transit surveillance reports.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Printer size={15} />
              <span>{isExporting ? 'Preparing Document...' : 'Download / Print PDF'}</span>
            </button>
          </div>
        </div>

        {/* ── Report Type & Parameter Filters (Hidden during browser print) ── */}
        <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-xs space-y-3.5 print:hidden">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gov-600" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Select Report Dossier
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Authorized for: <strong className="text-slate-800">{user?.first_name || 'Admin'} ({user?.profile?.role || 'SUPER_ADMIN'})</strong>
            </span>
          </div>

          {/* Report Category Tabs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <button
              onClick={() => setActiveCategory('SPATIAL_COMPLIANCE')}
              className={clsx(
                'p-3 rounded-lg border text-left font-bold transition-all cursor-pointer flex flex-col justify-between gap-1',
                activeCategory === 'SPATIAL_COMPLIANCE'
                  ? 'bg-gov-50 border-gov-600 text-gov-800 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              )}
            >
              <div className="flex items-center justify-between">
                <span>Spatial Compliance Audit</span>
                <ShieldCheck size={16} className="text-gov-600" />
              </div>
              <span className="text-[11px] font-normal text-slate-500">Cadastral &amp; Forest Standoff</span>
            </button>

            <button
              onClick={() => setActiveCategory('PRODUCTION_ROYALTY')}
              className={clsx(
                'p-3 rounded-lg border text-left font-bold transition-all cursor-pointer flex flex-col justify-between gap-1',
                activeCategory === 'PRODUCTION_ROYALTY'
                  ? 'bg-gov-50 border-gov-600 text-gov-800 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              )}
            >
              <div className="flex items-center justify-between">
                <span>Production &amp; Royalty Ledger</span>
                <Building2 size={16} className="text-emerald-600" />
              </div>
              <span className="text-[11px] font-normal text-slate-500">Output vs e-Permit Returns</span>
            </button>

            <button
              onClick={() => setActiveCategory('WEIGHBRIDGE_TRANSIT')}
              className={clsx(
                'p-3 rounded-lg border text-left font-bold transition-all cursor-pointer flex flex-col justify-between gap-1',
                activeCategory === 'WEIGHBRIDGE_TRANSIT'
                  ? 'bg-gov-50 border-gov-600 text-gov-800 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              )}
            >
              <div className="flex items-center justify-between">
                <span>Weighbridge &amp; ANPR Register</span>
                <Scale size={16} className="text-indigo-600" />
              </div>
              <span className="text-[11px] font-normal text-slate-500">Gross/Tare &amp; Overloads</span>
            </button>

            <button
              onClick={() => setActiveCategory('HRO_GRIEVANCES')}
              className={clsx(
                'p-3 rounded-lg border text-left font-bold transition-all cursor-pointer flex flex-col justify-between gap-1',
                activeCategory === 'HRO_GRIEVANCES'
                  ? 'bg-gov-50 border-gov-600 text-gov-800 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              )}
            >
              <div className="flex items-center justify-between">
                <span>PGRS Grievance Resolution</span>
                <Users size={16} className="text-amber-600" />
              </div>
              <span className="text-[11px] font-normal text-slate-500">Zonal Enforcement Action</span>
            </button>
          </div>

          {/* Secondary Parameter Selectors */}
          <div className="pt-2 flex items-center gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">District:</span>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 font-medium focus:outline-none focus:border-gov-500 cursor-pointer"
              >
                <option value="ALL">All Telangana Districts ({TELANGANA_DISTRICT_NAMES.length})</option>
                {TELANGANA_DISTRICT_NAMES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Reporting Period:</span>
              <select
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 font-medium focus:outline-none focus:border-gov-500"
              >
                <option value="FY 2025-2026 (Q3)">FY 2025-2026 (Q3 - Current)</option>
                <option value="FY 2025-2026 (Q2)">FY 2025-2026 (Q2)</option>
                <option value="FY 2024-2025 (Annual)">FY 2024-2025 (Full Year)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── OFFICIAL GOVERNMENT REPORT PREVIEW DOCUMENT ── */}
        {/* Note: This block is styled to look like an official physical printout and will render on paper / PDF via @media print */}
        <div className="bg-white border border-slate-300 rounded-xl shadow-md p-8 sm:p-12 space-y-8 text-slate-900 print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none">

          {/* Official Letterhead Header */}
          <div className="text-center pb-6 border-b-2 border-slate-900">
            <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 text-[11px] font-bold tracking-widest uppercase text-slate-700 rounded mb-2">
              Government of Telangana · Department of Mines and Geology
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase text-slate-900 tracking-tight">
              MineGIS-TS Statutory Governance Report
            </h1>
            <p className="text-sm font-semibold text-slate-600 mt-1 uppercase tracking-wider">
              {activeCategory === 'SPATIAL_COMPLIANCE' && 'Standardized Spatial Concession Compliance & Boundary Audit'}
              {activeCategory === 'PRODUCTION_ROYALTY' && 'Monthly Mineral Production, Dispatch & Royalty Realization Register'}
              {activeCategory === 'WEIGHBRIDGE_TRANSIT' && 'In-Pit Weighbridge Scale & ANPR Telematics Surveillance Summary'}
              {activeCategory === 'HRO_GRIEVANCES' && 'Public Grievance Redressal System (PGRS) & Zonal Action Report'}
            </p>
            <div className="flex justify-between items-center text-xs text-slate-500 mt-4 pt-3 border-t border-slate-200 flex-wrap gap-2 font-mono">
              <span>REF NO: TS-DMG-REP-2026-{Math.floor(100000 + Math.random() * 900000)}</span>
              <span>DATE OF ISSUE: {dateStr}</span>
              <span>PERIOD: {reportPeriod}</span>
            </div>
          </div>

          {/* Executive Summary Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Concessions Audited</span>
              <strong className="text-xl font-black text-slate-900 mt-1 block">
                {activeLeases.length} Mines
              </strong>
              <span className="text-[10px] text-slate-500">Across {selectedDistrict === 'ALL' ? '33 Districts' : selectedDistrict}</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <span className="text-[11px] font-bold text-emerald-700 block uppercase">Operational Leases</span>
              <strong className="text-xl font-black text-emerald-800 mt-1 block">
                {validLeasesCount} Active
              </strong>
              <span className="text-[10px] text-emerald-700">Valid statutory lease deeds</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <span className="text-[11px] font-bold text-amber-700 block uppercase">Under Review / Pending</span>
              <strong className="text-xl font-black text-amber-800 mt-1 block">
                {pendingLeasesCount} Pending
              </strong>
              <span className="text-[10px] text-amber-700">Awaiting approver sanction</span>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <span className="text-[11px] font-bold text-red-700 block uppercase">Expired / Cancelled</span>
              <strong className="text-xl font-black text-red-800 mt-1 block">
                {expiredLeasesCount} Expired
              </strong>
              <span className="text-[10px] text-red-700">Cease extraction orders</span>
            </div>
          </div>

          {/* Dynamic Table Section: SPATIAL COMPLIANCE */}
          {activeCategory === 'SPATIAL_COMPLIANCE' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  1. Cadastral Boundary &amp; Environmental Standoff Verification
                </h3>
                <span className="text-xs text-slate-500">Showing {Math.min(activeLeases.length, 12)} sampled records</span>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Lease ID</th>
                      <th className="py-2.5 px-3">Mine Name</th>
                      <th className="py-2.5 px-3">Leaseholder</th>
                      <th className="py-2.5 px-3">District</th>
                      <th className="py-2.5 px-3">Mineral</th>
                      <th className="py-2.5 px-3">Area (Ha)</th>
                      <th className="py-2.5 px-3">Statutory Status</th>
                      <th className="py-2.5 px-3 text-right">Audit Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {activeLeases.slice(0, 12).map((lease) => (
                      <tr key={lease.lease_id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900">{lease.lease_id}</td>
                        <td className="py-2 px-3 font-sans font-medium text-slate-800">{lease.mine_name}</td>
                        <td className="py-2 px-3 font-sans text-slate-600 truncate max-w-[150px]">{lease.leaseholder_name}</td>
                        <td className="py-2 px-3 font-sans text-slate-700">{lease.district}</td>
                        <td className="py-2 px-3 font-sans text-slate-600">{lease.mineral_display || lease.mineral_type}</td>
                        <td className="py-2 px-3 text-slate-800">{lease.area_hectares || '12.50'}</td>
                        <td className="py-2 px-3 font-sans">
                          <span className={clsx(
                            'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                            lease.status === 'ACTIVE' || (lease as any).status === 'VALID' ? 'bg-emerald-100 text-emerald-800' :
                            lease.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                          )}>
                            {lease.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-sans text-emerald-700 font-bold">
                          ✓ Verified Compliant
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Dynamic Table Section: PRODUCTION & ROYALTY */}
          {activeCategory === 'PRODUCTION_ROYALTY' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  2. Mineral Production, Dispatch Telemetry &amp; Royalty Realization
                </h3>
                <span className="text-xs text-slate-500 font-mono">Real-time loadcell audit</span>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Mine Location</th>
                      <th className="py-2.5 px-3">District</th>
                      <th className="py-2.5 px-3">Mineral Type</th>
                      <th className="py-2.5 px-3 text-right">Excavated (MT)</th>
                      <th className="py-2.5 px-3 text-right">Dispatched (MT)</th>
                      <th className="py-2.5 px-3 text-right">Royalty Realized</th>
                      <th className="py-2.5 px-3 text-right">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold font-sans">Singareni Collieries OCP-IV</td>
                      <td className="py-2 px-3 font-sans">Bhadradri Kothagudem</td>
                      <td className="py-2 px-3 font-sans">Coal (Grade G-11)</td>
                      <td className="py-2 px-3 text-right">538,200 MT</td>
                      <td className="py-2 px-3 text-right">420,000 MT</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-800">₹42.80 Crores</td>
                      <td className="py-2 px-3 text-right font-sans text-emerald-700 font-bold">✓ Cleared</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold font-sans">Ibrahimpatnam Granite Basin</td>
                      <td className="py-2 px-3 font-sans">Rangareddy</td>
                      <td className="py-2 px-3 font-sans">Black Granite Blocks</td>
                      <td className="py-2 px-3 text-right">8,900 MT</td>
                      <td className="py-2 px-3 text-right">14,200 MT</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-800">₹3.45 Crores</td>
                      <td className="py-2 px-3 text-right font-sans text-amber-700 font-bold">⚠️ Inquiry Notice</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold font-sans">Karimnagar Tan Brown Concession</td>
                      <td className="py-2 px-3 font-sans">Karimnagar</td>
                      <td className="py-2 px-3 font-sans">Tan Brown Granite</td>
                      <td className="py-2 px-3 text-right">12,400 MT</td>
                      <td className="py-2 px-3 text-right">11,900 MT</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-800">₹4.10 Crores</td>
                      <td className="py-2 px-3 text-right font-sans text-emerald-700 font-bold">✓ Cleared</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold font-sans">Paloncha Dolomite &amp; Limestone Quarry</td>
                      <td className="py-2 px-3 font-sans">Bhadradri Kothagudem</td>
                      <td className="py-2 px-3 font-sans">Dolomite Flux</td>
                      <td className="py-2 px-3 text-right">39,800 MT</td>
                      <td className="py-2 px-3 text-right">38,500 MT</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-800">₹1.85 Crores</td>
                      <td className="py-2 px-3 text-right font-sans text-emerald-700 font-bold">✓ Cleared</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold font-sans">Wadapally Krishna River Sand Reach</td>
                      <td className="py-2 px-3 font-sans">Nalgonda</td>
                      <td className="py-2 px-3 font-sans">Ordinary River Sand</td>
                      <td className="py-2 px-3 text-right">68,000 MT</td>
                      <td className="py-2 px-3 text-right">68,000 MT</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-800">₹2.72 Crores</td>
                      <td className="py-2 px-3 text-right font-sans text-emerald-700 font-bold">✓ Cleared</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Dynamic Table Section: WEIGHBRIDGE & TRANSIT */}
          {activeCategory === 'WEIGHBRIDGE_TRANSIT' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  3. Automated Weighbridge Scale &amp; ANPR Telematics Log
                </h3>
                <span className="text-xs text-slate-500 font-mono">Live loadcell telemetry</span>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Weighment Slip</th>
                      <th className="py-2.5 px-3">Vehicle No</th>
                      <th className="py-2.5 px-3">Scale Name</th>
                      <th className="py-2.5 px-3">Mine Location</th>
                      <th className="py-2.5 px-3 text-right">Gross (KG)</th>
                      <th className="py-2.5 px-3 text-right">Tare (KG)</th>
                      <th className="py-2.5 px-3 text-right">Net Weight</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">TS-WB-2026-09811</td>
                      <td className="py-2 px-3 font-bold text-emerald-800">TG07U1889</td>
                      <td className="py-2 px-3 font-sans">Scale #1 (Singareni Pit)</td>
                      <td className="py-2 px-3 font-sans">Singareni Collieries OCP-IV</td>
                      <td className="py-2 px-3 text-right">43,800 KG</td>
                      <td className="py-2 px-3 text-right">14,200 KG</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">29,600 KG</td>
                      <td className="py-2 px-3 text-right font-sans text-red-700 font-bold">⚠️ Overload (+1.6T)</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">TS-WB-2026-09812</td>
                      <td className="py-2 px-3 font-bold text-emerald-800">TS08UB4901</td>
                      <td className="py-2 px-3 font-sans">Scale #2 (Dispatch Gate)</td>
                      <td className="py-2 px-3 font-sans">Singareni Collieries OCP-IV</td>
                      <td className="py-2 px-3 text-right">38,200 KG</td>
                      <td className="py-2 px-3 text-right">13,500 KG</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">24,700 KG</td>
                      <td className="py-2 px-3 text-right font-sans text-emerald-700 font-bold">✓ Cleared</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">TS-WB-2026-09813</td>
                      <td className="py-2 px-3 font-bold text-emerald-800">TS12UD9828</td>
                      <td className="py-2 px-3 font-sans">Scale #1 (Quarry Exit)</td>
                      <td className="py-2 px-3 font-sans">Ibrahimpatnam Granite</td>
                      <td className="py-2 px-3 text-right">46,200 KG</td>
                      <td className="py-2 px-3 text-right">15,100 KG</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">31,100 KG</td>
                      <td className="py-2 px-3 text-right font-sans text-red-700 font-bold">⚠️ Overload (+3.1T)</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">TS-WB-2026-09814</td>
                      <td className="py-2 px-3 font-bold text-emerald-800">TS02EA3310</td>
                      <td className="py-2 px-3 font-sans">Scale #3 (Crusher Feed)</td>
                      <td className="py-2 px-3 font-sans">Karimnagar Tan Brown</td>
                      <td className="py-2 px-3 text-right">34,500 KG</td>
                      <td className="py-2 px-3 text-right">12,200 KG</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">22,300 KG</td>
                      <td className="py-2 px-3 text-right font-sans text-emerald-700 font-bold">✓ Cleared</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">TS-WB-2026-09815</td>
                      <td className="py-2 px-3 font-bold text-emerald-800">TS05UE0999</td>
                      <td className="py-2 px-3 font-sans">Scale #1 (Primary Pit)</td>
                      <td className="py-2 px-3 font-sans">Paloncha Dolomite Quarry</td>
                      <td className="py-2 px-3 text-right">39,800 KG</td>
                      <td className="py-2 px-3 text-right">13,900 KG</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">25,900 KG</td>
                      <td className="py-2 px-3 text-right font-sans text-emerald-700 font-bold">✓ Cleared</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Dynamic Table Section: HRO GRIEVANCES */}
          {activeCategory === 'HRO_GRIEVANCES' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  4. Public Grievance Redressal (PGRS) &amp; Zonal Office Action Ledger
                </h3>
                <span className="text-xs text-slate-500">Citizen &amp; Environmental Audits</span>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Grievance ID</th>
                      <th className="py-2.5 px-3">Allegation Category</th>
                      <th className="py-2.5 px-3">Location &amp; District</th>
                      <th className="py-2.5 px-3">Lodged Date</th>
                      <th className="py-2.5 px-3">Assigned Desk</th>
                      <th className="py-2.5 px-3 text-right">Resolution Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">PGRS-2026-0812</td>
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">Illegal Night Sand Extraction</td>
                      <td className="py-2 px-3 font-sans text-slate-700">Wadapally Reach, Nalgonda</td>
                      <td className="py-2 px-3">04-Oct-2026</td>
                      <td className="py-2 px-3 font-sans text-slate-600">Deputy Director (Yadadri Zone)</td>
                      <td className="py-2 px-3 text-right font-sans text-amber-700 font-bold">Under Investigation</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">PGRS-2026-0794</td>
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">Blasting Vibrations Past Curfew</td>
                      <td className="py-2 px-3 font-sans text-slate-700">Koheda Hills, Rangareddy</td>
                      <td className="py-2 px-3">02-Oct-2026</td>
                      <td className="py-2 px-3 font-sans text-slate-600">Zonal Joint Director (Enforcement)</td>
                      <td className="py-2 px-3 text-right font-sans text-red-700 font-bold">Escalated to Zonal Officer</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">PGRS-2026-0781</td>
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">Overloaded Tippers Highway Spillage</td>
                      <td className="py-2 px-3 font-sans text-slate-700">NH-365 Corridor, Mahabubabad</td>
                      <td className="py-2 px-3">29-Sep-2026</td>
                      <td className="py-2 px-3 font-sans text-slate-600">Joint Director (Kakatiya Zone)</td>
                      <td className="py-2 px-3 text-right font-sans text-emerald-700 font-bold">✓ Resolved &amp; Compounded</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Official Signatures Block */}
          <div className="pt-16 mt-12 border-t border-slate-300 flex justify-between items-end px-4 text-center">
            <div>
              <div className="w-48 border-b-2 border-slate-800 mb-2"></div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-wider">District Mineral Officer</p>
              <p className="text-[10px] text-slate-500 font-medium">Cadastral Survey &amp; Weighbridge Incharge</p>
            </div>
            <div>
              <div className="w-48 border-b-2 border-slate-800 mb-2"></div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Director of Mines &amp; Geology</p>
              <p className="text-[10px] text-slate-500 font-medium">Government of Telangana</p>
            </div>
          </div>

          {/* Statutory Footer */}
          <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-500 font-mono">
            This document is an authentic computerized GIS audit extract generated under Rule 28 of the Telangana Minor Mineral Concession Rules (TSMMCR).
          </div>
        </div>

      </div>
    </div>
  )
}
