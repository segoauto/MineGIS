import React, { useState } from 'react'
import {
  MessageSquareWarning, Filter, Search, Plus, MapPin, AlertTriangle,
  CheckCircle2, Clock, ShieldAlert, ArrowUpRight, User, Phone,
  FileText, ExternalLink, Trash2, Send, Eye, X, Download
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { useAuthStore, useMapStore } from '../../store'
import { TELANGANA_DISTRICTS } from '../../utils/districts'

export interface MiningComplaint {
  id: string
  complainantName: string
  phone: string
  district: string
  mandal: string
  village: string
  category: 'ILLEGAL_MINING' | 'OVERLOADING' | 'UNAUTHORIZED_BLASTING' | 'WATER_POLLUTION' | 'ROYALTY_EVASION'
  categoryLabel: string
  description: string
  lat: number
  lon: number
  dateSubmitted: string
  status: 'PENDING' | 'UNDER_INVESTIGATION' | 'ESCALATED_TO_HRO' | 'RESOLVED'
  assignedOfficer: string
  assignedOfficerRole: string
  evidenceFilesCount: number
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM'
}

const INITIAL_COMPLAINTS: MiningComplaint[] = [
  {
    id: 'CMP-2026-0841',
    complainantName: 'Ramesh Goud (Village Sarpanch)',
    phone: '+91 98490 23145',
    district: 'Bhadradri Kothagudem',
    mandal: 'Burgampahad',
    village: 'Sarapaka',
    category: 'ILLEGAL_MINING',
    categoryLabel: 'Illegal Riverbed Sand Excavation',
    description: 'Heavy JCB excavators lifting riverbed sand at midnight near Godavari bank without statutory transit permits (e-Waybills). Dust causing distress.',
    lat: 17.6542,
    lon: 80.8921,
    dateSubmitted: '2026-10-06 08:30',
    status: 'ESCALATED_TO_HRO',
    assignedOfficer: 'Joint Director (Bhadradri Zone)',
    assignedOfficerRole: 'Bhadradri Zonal Flying Squad',
    evidenceFilesCount: 3,
    priority: 'CRITICAL',
  },
  {
    id: 'CMP-2026-0839',
    complainantName: 'A. Chandrasekhar',
    phone: '+91 94401 88231',
    district: 'Karimnagar',
    mandal: 'Manakondur',
    village: 'Vemulawada Road',
    category: 'UNAUTHORIZED_BLASTING',
    categoryLabel: 'Deep Hole Blasting Beyond Permitted Hours',
    description: 'Heavy granite quarry detonated high-grade explosives at 19:45 hrs after daylight curfew. Structural cracks observed on adjacent village borewell casing.',
    lat: 18.3912,
    lon: 79.1845,
    dateSubmitted: '2026-10-05 20:15',
    status: 'UNDER_INVESTIGATION',
    assignedOfficer: 'Assistant Director (Karimnagar Division)',
    assignedOfficerRole: 'Karimnagar District Mining Office',
    evidenceFilesCount: 2,
    priority: 'HIGH',
  },
  {
    id: 'CMP-2026-0836',
    complainantName: 'T. Malleshwar Rao',
    phone: '+91 99890 55412',
    district: 'Vikarabad',
    mandal: 'Tandur',
    village: 'Kangan Kalan',
    category: 'OVERLOADING',
    categoryLabel: 'Overloaded Mineral Tippers Damaging PWD Road',
    description: 'Multi-axle tippers carrying 42 metric tons of limestone (exceeding 28T limit) traveling without tarpaulin covers, spilling stones across highway.',
    lat: 17.2415,
    lon: 77.5921,
    dateSubmitted: '2026-10-04 14:10',
    status: 'ESCALATED_TO_HRO',
    assignedOfficer: 'Senior Geologist (Jogulamba-Vikarabad Unit)',
    assignedOfficerRole: 'Jogulamba-Vikarabad Zonal Unit',
    evidenceFilesCount: 4,
    priority: 'HIGH',
  },
  {
    id: 'CMP-2026-0828',
    complainantName: 'G. Narayana Reddy',
    phone: '+91 97012 33490',
    district: 'Ranga Reddy',
    mandal: 'Ibrahimpatnam',
    village: 'Turkayamjal',
    category: 'WATER_POLLUTION',
    categoryLabel: 'Stone Crusher Effluent Slurry Drainage',
    description: 'Stone crusher discharging mineral slurry washing into natural storm run-off lake buffer zone without sedimentation tank filtration.',
    lat: 17.1895,
    lon: 78.6210,
    dateSubmitted: '2026-10-03 11:20',
    status: 'RESOLVED',
    assignedOfficer: 'Assistant Geologist (Ranga Reddy Regulatory Cell)',
    assignedOfficerRole: 'Ranga Reddy Regulatory Cell',
    evidenceFilesCount: 5,
    priority: 'MEDIUM',
  },
  {
    id: 'CMP-2026-0819',
    complainantName: 'Anonymous Citizen (Via 1800-425-MINE)',
    phone: 'Toll-Free Helpline',
    district: 'Peddapalli',
    mandal: 'Ramagundam',
    village: 'Godavarikhani Sector-4',
    category: 'ROYALTY_EVASION',
    categoryLabel: 'Unregistered Coal Dispatch Depot',
    description: 'Unauthorised mineral screening stockpile operating outside authorized concession boundary with bypassed weighbridge calibration.',
    lat: 18.7612,
    lon: 79.5123,
    dateSubmitted: '2026-10-01 16:40',
    status: 'RESOLVED',
    assignedOfficer: 'Joint Director (Enforcement & Vigilance)',
    assignedOfficerRole: 'Kaleshwaram Flying Squad',
    evidenceFilesCount: 1,
    priority: 'CRITICAL',
  },
]

export default function ComplaintsView({ onNavigateToMap }: { onNavigateToMap?: () => void }) {
  const { user } = useAuthStore()
  const { setMapFlyToTarget } = useMapStore()
  const [complaints, setComplaints] = useState<MiningComplaint[]>(INITIAL_COMPLAINTS)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDistrict, setFilterDistrict] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [selectedComplaint, setSelectedComplaint] = useState<MiningComplaint | null>(null)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)

  // New Complaint Form State
  const [newComplainant, setNewComplainant] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newDistrict, setNewDistrict] = useState('Bhadradri Kothagudem')
  const [newCategory, setNewCategory] = useState<MiningComplaint['category']>('ILLEGAL_MINING')
  const [newDesc, setNewDesc] = useState('')

  const filtered = complaints.filter((c) => {
    const matchSearch =
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.complainantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.categoryLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchDistrict = filterDistrict === 'ALL' || c.district === filterDistrict
    const matchStatus = filterStatus === 'ALL' || c.status === filterStatus
    return matchSearch && matchDistrict && matchStatus
  })

  const handleEscalateToHRO = (c: MiningComplaint) => {
    setComplaints((prev) =>
      prev.map((item) =>
        item.id === c.id
          ? {
              ...item,
              status: 'ESCALATED_TO_HRO',
              assignedOfficer: 'Zonal Joint Director (Enforcement & Vigilance)',
              assignedOfficerRole: 'Directorate of Mines & Geology HRO Cell',
            }
          : item
      )
    )
    toast.success(`Complaint ${c.id} escalated to HRO & Zonal Flying Squad for immediate raid!`, {
      icon: '🚨',
      duration: 5000,
      style: { background: '#0F172A', color: '#F8FAFC', border: '1px solid #DC2626' },
    })
  }

  const handleResolve = (c: MiningComplaint) => {
    setComplaints((prev) =>
      prev.map((item) => (item.id === c.id ? { ...item, status: 'RESOLVED' } : item))
    )
    toast.success(`Grievance ${c.id} marked as RESOLVED. Statutory report logged.`, { icon: '✅' })
  }

  const handleDelete = (id: string) => {
    setComplaints((prev) => prev.filter((item) => item.id !== id))
    toast.success(`Complaint record ${id} removed.`, { icon: '🗑️' })
  }

  const handleLocateOnMap = (c: MiningComplaint) => {
    setMapFlyToTarget({ lon: c.lon, lat: c.lat, zoom: 14, ping: true })
    if (onNavigateToMap) onNavigateToMap()
    toast.success(`Map centered on grievance location: ${c.lat.toFixed(4)}°N, ${c.lon.toFixed(4)}°E`, { icon: '📍' })
  }

  const handleCreateComplaint = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComplainant || !newDesc) {
      toast.error('Please fill in required fields')
      return
    }

    const distObj = TELANGANA_DISTRICTS[newDistrict]
    const lat = distObj ? distObj.center[1] : 17.6
    const lon = distObj ? distObj.center[0] : 78.9

    const created: MiningComplaint = {
      id: `CMP-2026-0${Math.floor(850 + Math.random() * 100)}`,
      complainantName: newComplainant,
      phone: newPhone || 'Not provided',
      district: newDistrict,
      mandal: `${newDistrict} Central`,
      village: 'Site Location',
      category: newCategory,
      categoryLabel:
        newCategory === 'ILLEGAL_MINING'
          ? 'Illegal Riverbed Extraction'
          : newCategory === 'OVERLOADING'
          ? 'Overloaded Transport'
          : newCategory === 'UNAUTHORIZED_BLASTING'
          ? 'Unauthorized Explosives Blasting'
          : newCategory === 'WATER_POLLUTION'
          ? 'Environmental Lake Buffer Encroachment'
          : 'Royalty Evasion',
      description: newDesc,
      lat,
      lon,
      dateSubmitted: 'Just now',
      status: 'PENDING',
      assignedOfficer: 'District Mineral Officer (DMO)',
      assignedOfficerRole: `${newDistrict} Regulatory Cell`,
      evidenceFilesCount: 1,
      priority: 'HIGH',
    }

    setComplaints([created, ...complaints])
    setIsNewModalOpen(false)
    setNewComplainant('')
    setNewPhone('')
    setNewDesc('')
    toast.success(`Complaint ${created.id} registered successfully! Dispatched to Zonal Officer.`, {
      icon: '📝',
      duration: 5000,
    })
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
      {/* ── Official Header ── */}
      <div className="bg-white border-b border-slate-300 px-6 py-4 flex-shrink-0 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-300 text-red-600 flex items-center justify-center shadow-xs">
            <MessageSquareWarning size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Public Complaints &amp; Illegal Mining Grievances
              </h1>
              <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full border border-red-300">
                PGRS Helpline 1800-425-MINE
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Statutory Citizen Grievance Redressal &bull; Department of Mines &amp; Geology, Govt. of Telangana
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus size={16} />
          <span>Lodge Public Complaint</span>
        </button>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0 bg-white border-b border-slate-200">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Complaints</span>
          <span className="text-xl font-extrabold text-slate-900 font-mono">{complaints.length}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Logged across 33 Districts</span>
        </div>
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3">
          <span className="text-[10px] uppercase font-bold text-amber-700 block">Under Investigation</span>
          <span className="text-xl font-extrabold text-amber-900 font-mono">
            {complaints.filter((c) => c.status === 'UNDER_INVESTIGATION' || c.status === 'PENDING').length}
          </span>
          <span className="text-[10px] text-amber-700 block mt-0.5">Field inspection assigned</span>
        </div>
        <div className="bg-red-50/80 border border-red-200 rounded-xl p-3">
          <span className="text-[10px] uppercase font-bold text-red-700 block">Escalated to HRO / Squad</span>
          <span className="text-xl font-extrabold text-red-900 font-mono">
            {complaints.filter((c) => c.status === 'ESCALATED_TO_HRO').length}
          </span>
          <span className="text-[10px] text-red-700 block mt-0.5">Zonal flying squad action</span>
        </div>
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block">Resolved &amp; Closed</span>
          <span className="text-xl font-extrabold text-emerald-900 font-mono">
            {complaints.filter((c) => c.status === 'RESOLVED').length}
          </span>
          <span className="text-[10px] text-emerald-700 block mt-0.5">Seizures &amp; penalties levied</span>
        </div>
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-white border border-slate-300 rounded-lg px-3 py-1.5 shadow-2xs">
          <Search size={15} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search complaint ID, citizen name, village, or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* District Filter */}
          <select
            value={filterDistrict}
            onChange={(e) => setFilterDistrict(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:border-gov-500 cursor-pointer"
          >
            <option value="ALL">All Districts ({complaints.length})</option>
            {Object.keys(TELANGANA_DISTRICTS).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:border-gov-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="UNDER_INVESTIGATION">Under Investigation</option>
            <option value="ESCALATED_TO_HRO">Escalated to HRO</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* ── Complaints Data Table ── */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="bg-white border border-slate-300 rounded-xl shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Complaint ID &amp; Date</th>
                <th className="py-3 px-4">Complainant</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Violation Category</th>
                <th className="py-3 px-4">Assigned Officer / Squad</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-gov-800">{c.id}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{c.dateSubmitted}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{c.complainantName}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone size={10} className="text-slate-400" />
                      <span>{c.phone}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{c.village}, {c.mandal}</div>
                    <div className="text-[11px] text-emerald-700 font-medium">{c.district} Dist</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800 block">{c.categoryLabel}</span>
                    <span className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">{c.description}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800">{c.assignedOfficer}</div>
                    <div className="text-[10px] text-slate-500">{c.assignedOfficerRole}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={clsx(
                        'text-[10px] font-bold px-2.5 py-1 rounded-full border inline-block whitespace-nowrap',
                        c.status === 'ESCALATED_TO_HRO' && 'bg-red-100 text-red-800 border-red-300',
                        c.status === 'UNDER_INVESTIGATION' && 'bg-amber-100 text-amber-800 border-amber-300',
                        c.status === 'PENDING' && 'bg-blue-100 text-blue-800 border-blue-300',
                        c.status === 'RESOLVED' && 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      )}
                    >
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Locate on Map */}
                      <button
                        onClick={() => handleLocateOnMap(c)}
                        className="p-1.5 rounded hover:bg-slate-100 text-gov-600 transition-colors cursor-pointer"
                        title="Locate Violation on GIS Map"
                      >
                        <MapPin size={15} />
                      </button>

                      {/* Escalate to HRO */}
                      {c.status !== 'RESOLVED' && c.status !== 'ESCALATED_TO_HRO' && (
                        <button
                          onClick={() => handleEscalateToHRO(c)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Escalate directly to HRO & Zonal Flying Squad"
                        >
                          <ShieldAlert size={12} />
                          <span>Escalate</span>
                        </button>
                      )}

                      {/* Mark Resolved */}
                      {c.status !== 'RESOLVED' && (
                        <button
                          onClick={() => handleResolve(c)}
                          className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 transition-colors cursor-pointer"
                          title="Mark Resolved"
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Lodge Complaint Modal ── */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-lg w-full overflow-hidden animate-scale-up">
            <div className="px-5 py-4 bg-gov-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquareWarning size={18} className="text-gov-700" />
                <h3 className="font-bold text-sm text-slate-900">Lodge Official Public Grievance</h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Complainant Citizen Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Citizen / Representative name"
                  value={newComplainant}
                  onChange={(e) => setNewComplainant(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:border-gov-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98490 xxxxx"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:border-gov-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target District *</label>
                  <select
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:border-gov-500 focus:outline-hidden cursor-pointer"
                  >
                    {Object.keys(TELANGANA_DISTRICTS).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Violation Category *</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:border-gov-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="ILLEGAL_MINING">Illegal Riverbed Sand / Mineral Extraction</option>
                  <option value="OVERLOADING">Overloaded Tipper Hauling (Safety Risk)</option>
                  <option value="UNAUTHORIZED_BLASTING">Unauthorized Deep Hole Explosives Blasting</option>
                  <option value="WATER_POLLUTION">Environmental Effluent / Water Body Buffer Encroachment</option>
                  <option value="ROYALTY_EVASION">Transit Pass / Royalty Evasion Depot</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Incident Details &amp; Observations *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide precise location, landmark, vehicle numbers, or time of illegal activity..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:border-gov-500 focus:outline-hidden resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Submit Grievance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
