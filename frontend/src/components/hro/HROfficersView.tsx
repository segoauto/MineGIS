import React, { useState } from 'react'
import {
  Users, ShieldCheck, Phone, Mail, MapPin, Search, Filter,
  Building2, BadgeCheck, Car, Radio, Send, CheckCircle2,
  ExternalLink, UserCheck, AlertCircle
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { useMapStore } from '../../store'
import { TELANGANA_DISTRICTS } from '../../utils/districts'

export interface ZonalOfficer {
  id: string
  name: string
  designation: string
  zone: string
  headquarters: string
  districtsCovered: string[]
  phone: string
  email: string
  employeeId: string
  squadVehicleNumber: string
  dutyStatus: 'ON_FIELD_RAID' | 'AT_ZONAL_HQ' | 'CONDUCTING_AUDIT' | 'STANDBY'
  activeInspectionsCount: number
  resolvedGrievancesCount: number
}

const TELANGANA_ZONAL_OFFICERS: ZonalOfficer[] = [
  {
    id: 'HRO-Z01',
    name: 'Dr. K. Srinivas Rao, PhD (Geology)',
    designation: 'Joint Director of Mines & Geology',
    zone: 'Bhadradri Zone',
    headquarters: 'Kothagudem',
    districtsCovered: ['Bhadradri Kothagudem', 'Khammam'],
    phone: '+91 94401 22801',
    email: 'jdmines.bhadradri@telangana.gov.in',
    employeeId: 'TS-DMG-00214',
    squadVehicleNumber: 'TG07U1889',
    dutyStatus: 'ON_FIELD_RAID',
    activeInspectionsCount: 8,
    resolvedGrievancesCount: 42,
  },
  {
    id: 'HRO-Z02',
    name: 'Smt. P. Sandhya Rani',
    designation: 'Deputy Director (Enforcement & Vigilance)',
    zone: 'Kaleshwaram Zone',
    headquarters: 'Ramagundam / Peddapalli',
    districtsCovered: ['Peddapalli', 'Mancherial', 'Kumuram Bheem Asifabad'],
    phone: '+91 94401 33412',
    email: 'ddmines.kaleshwaram@telangana.gov.in',
    employeeId: 'TS-DMG-00389',
    squadVehicleNumber: 'TS12UD9828',
    dutyStatus: 'AT_ZONAL_HQ',
    activeInspectionsCount: 5,
    resolvedGrievancesCount: 36,
  },
  {
    id: 'HRO-Z03',
    name: 'Sri M. Venu Gopal',
    designation: 'Assistant Director (Granite & Mineral Admin)',
    zone: 'Rajanna Zone',
    headquarters: 'Karimnagar',
    districtsCovered: ['Karimnagar', 'Rajanna Sircilla', 'Jagtial'],
    phone: '+91 94401 44521',
    email: 'admine.karimnagar@telangana.gov.in',
    employeeId: 'TS-DMG-00512',
    squadVehicleNumber: 'TS05UE3699',
    dutyStatus: 'CONDUCTING_AUDIT',
    activeInspectionsCount: 6,
    resolvedGrievancesCount: 29,
  },
  {
    id: 'HRO-Z04',
    name: 'Sri S. Ravinder Kumar',
    designation: 'Deputy Director (Sand Regulatory Management)',
    zone: 'Yadadri Zone',
    headquarters: 'Nalgonda',
    districtsCovered: ['Nalgonda', 'Suryapet', 'Yadadri Bhuvanagiri'],
    phone: '+91 94401 55634',
    email: 'ddmines.yadadri@telangana.gov.in',
    employeeId: 'TS-DMG-00441',
    squadVehicleNumber: 'TS05UE0999',
    dutyStatus: 'ON_FIELD_RAID',
    activeInspectionsCount: 9,
    resolvedGrievancesCount: 51,
  },
  {
    id: 'HRO-Z05',
    name: 'Smt. S. Rajeshwari, M.Tech',
    designation: 'Senior Geologist & Flying Squad Commander',
    zone: 'Jogulamba Zone',
    headquarters: 'Mahabubnagar',
    districtsCovered: ['Mahabubnagar', 'Vikarabad', 'Wanaparthy', 'Jogulamba Gadwal'],
    phone: '+91 94401 66745',
    email: 'geologist.jogulamba@telangana.gov.in',
    employeeId: 'TS-DMG-00628',
    squadVehicleNumber: 'TS07UD1122',
    dutyStatus: 'AT_ZONAL_HQ',
    activeInspectionsCount: 4,
    resolvedGrievancesCount: 24,
  },
  {
    id: 'HRO-Z06',
    name: 'Sri K. Venkat Reddy',
    designation: 'Assistant Director of Mines & Geology',
    zone: 'Charminar Zone',
    headquarters: 'Hyderabad (Directorate)',
    districtsCovered: ['Hyderabad', 'Ranga Reddy', 'Medchal-Malkajgiri'],
    phone: '+91 94401 77856',
    email: 'admine.charminar@telangana.gov.in',
    employeeId: 'TS-DMG-00719',
    squadVehicleNumber: 'TS09UB4433',
    dutyStatus: 'STANDBY',
    activeInspectionsCount: 3,
    resolvedGrievancesCount: 19,
  },
  {
    id: 'HRO-Z07',
    name: 'Dr. G. Prabhakar',
    designation: 'Joint Director (IT & Geo-spatial Governance)',
    zone: 'Kakatiya Zone',
    headquarters: 'Warangal',
    districtsCovered: ['Warangal', 'Hanamkonda', 'Jangaon', 'Mahabubabad', 'Jayashankar Bhupalpally'],
    phone: '+91 94401 88967',
    email: 'jdmines.kakatiya@telangana.gov.in',
    employeeId: 'TS-DMG-00192',
    squadVehicleNumber: 'TS03UE7788',
    dutyStatus: 'AT_ZONAL_HQ',
    activeInspectionsCount: 7,
    resolvedGrievancesCount: 45,
  },
]

export default function HROfficersView({ onNavigateToMap }: { onNavigateToMap?: () => void }) {
  const { setMapFlyToTarget } = useMapStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterZone, setFilterZone] = useState('ALL')
  const [officers, setOfficers] = useState<ZonalOfficer[]>(TELANGANA_ZONAL_OFFICERS)

  const filtered = officers.filter((off) => {
    const matchSearch =
      off.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      off.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      off.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      off.headquarters.toLowerCase().includes(searchTerm.toLowerCase()) ||
      off.districtsCovered.some((d) => d.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchZone = filterZone === 'ALL' || off.zone === filterZone
    return matchSearch && matchZone
  })

  const handleDispatchSquad = (off: ZonalOfficer) => {
    toast.success(`Enforcement Flying Squad (${off.squadVehicleNumber}) alerted for Zonal Officer ${off.name}!`, {
      icon: '🚨',
      duration: 5000,
      style: { background: '#0F172A', color: '#38BDF8', border: '1px solid #0284C7' }
    })
  }

  const handleViewZoneOnMap = (off: ZonalOfficer) => {
    const firstDist = off.districtsCovered[0]
    const distData = TELANGANA_DISTRICTS[firstDist]
    if (distData) {
      setMapFlyToTarget({ lon: distData.center[0], lat: distData.center[1], zoom: 11, ping: true })
      if (onNavigateToMap) onNavigateToMap()
      toast.success(`Zooming to ${off.zone} (${off.headquarters}) on GIS Map`, { icon: '📍' })
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
      {/* ── Official Header ── */}
      <div className="bg-white border-b border-slate-300 px-6 py-4 flex-shrink-0 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gov-50 border border-gov-300 text-gov-700 flex items-center justify-center shadow-xs">
            <Users size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Human Resources &amp; Regulatory Officers (HRO) Directory
              </h1>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                7 Zonal Jurisdictions Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Directorate of Mines &amp; Geology &bull; Zonal Joint Directors &amp; Enforcement Flying Squads
            </p>
          </div>
        </div>

        {/* Total Officer Count Badge */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-300 text-xs font-bold text-slate-700">
            <span className="text-emerald-600 font-extrabold">{officers.length}</span> Zonal Officers Deployed
          </div>
        </div>
      </div>

      {/* ── Search and Filter Toolbar ── */}
      <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-white border border-slate-300 rounded-lg px-3 py-1.5 shadow-2xs">
          <Search size={15} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search officer name, designation, zone, or district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-medium focus:border-gov-500 cursor-pointer"
          >
            <option value="ALL">All 7 Zones ({officers.length})</option>
            {Array.from(new Set(officers.map((o) => o.zone))).map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Officers Grid ── */}
      <div className="flex-1 overflow-auto px-6 py-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((off) => (
            <div
              key={off.id}
              className="bg-white border border-slate-300 rounded-xl p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">{off.name}</h3>
                    <div className="text-xs font-semibold text-gov-700 mt-0.5">{off.designation}</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">Emp ID: {off.employeeId}</div>
                  </div>
                  <span
                    className={clsx(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap',
                      off.dutyStatus === 'ON_FIELD_RAID' && 'bg-red-100 text-red-800 border-red-300 animate-pulse',
                      off.dutyStatus === 'AT_ZONAL_HQ' && 'bg-emerald-100 text-emerald-800 border-emerald-300',
                      off.dutyStatus === 'CONDUCTING_AUDIT' && 'bg-amber-100 text-amber-800 border-amber-300',
                      off.dutyStatus === 'STANDBY' && 'bg-slate-100 text-slate-700 border-slate-300'
                    )}
                  >
                    {off.dutyStatus.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Zone & Jurisdiction Info */}
                <div className="py-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Building2 size={13} className="text-slate-400" />
                    <span><strong>Zone:</strong> {off.zone} (HQ: {off.headquarters})</span>
                  </div>

                  <div className="flex items-start gap-1.5 text-slate-600">
                    <MapPin size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Districts:</strong> {off.districtsCovered.join(', ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                    <Car size={13} className="text-slate-400" />
                    <span>Squad Vehicle: <strong className="text-gov-800">{off.squadVehicleNumber}</strong></span>
                  </div>
                </div>

                {/* Contact info */}
                <div className="bg-slate-50 rounded-lg p-2.5 space-y-1 text-xs border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone size={12} className="text-emerald-600" />
                    <a href={`tel:${off.phone}`} className="font-mono hover:underline">{off.phone}</a>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail size={12} className="text-gov-600" />
                    <a href={`mailto:${off.email}`} className="truncate hover:underline text-[11px]">{off.email}</a>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-3">
                <button
                  onClick={() => handleViewZoneOnMap(off)}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MapPin size={13} className="text-gov-600" />
                  <span>Map Zone</span>
                </button>
                <button
                  onClick={() => handleDispatchSquad(off)}
                  className="flex-1 py-1.5 px-2 bg-gov-600 hover:bg-gov-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <Radio size={13} />
                  <span>Alert Squad</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
