import { useState } from 'react'
import {
  Truck, Radio, Wifi, WifiOff, MapPin, Gauge,
  ShieldAlert, Navigation, Search, CheckCircle2,
  AlertTriangle, Eye, Video, Fuel
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore, useMapStore } from '../../store'
import { vehiclesApi } from '../../api/vehicles'
import { getUserJurisdiction } from '../../utils/districts'
import { useQuery } from '@tanstack/react-query'
import NetradyneVideoModal from './NetradyneVideoModal'
import type { Vehicle } from '../../types'

interface FleetSurveillanceViewProps {
  onTrackVehicleOnMap: (vehicle: Vehicle) => void
  onOpenGeofenceSetup: (vehicle?: Vehicle) => void
}

export default function FleetSurveillanceView({
  onTrackVehicleOnMap,
  onOpenGeofenceSetup,
}: FleetSurveillanceViewProps) {
  const { user } = useAuthStore()
  const { selectVehicle } = useMapStore()
  const jurisdiction = getUserJurisdiction(user?.profile?.district)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'ONLINE' | 'TRANSPORT' | 'PATROL'>('ALL')
  const [videoVehicle, setVideoVehicle] = useState<Vehicle | null>(null)

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles-surveillance', user?.profile?.district],
    queryFn: () => vehiclesApi.list(),
    refetchInterval: 30_000,
  })

  const vehicles = vehiclesData || []

  const filteredVehicles = vehicles.filter((v) => {
    if (filter === 'ONLINE' && !v.is_online) return false
    if (filter === 'TRANSPORT' && v.vehicle_type !== 'TRANSPORT') return false
    if (filter === 'PATROL' && v.vehicle_type !== 'ENFORCEMENT' && (v.vehicle_type as any) !== 'PATROL') return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        v.vehicle_number.toLowerCase().includes(q) ||
        v.driver_name.toLowerCase().includes(q) ||
        (v.current_lease_name && v.current_lease_name.toLowerCase().includes(q))
      )
    }
    return true
  })

  const handleTrack = (veh: Vehicle) => {
    selectVehicle(veh.id)
    onTrackVehicleOnMap(veh)
  }

  return (
    <div className="flex-1 bg-slate-100 p-4 sm:p-6 overflow-y-auto custom-scrollbar font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Title Banner ── */}
        <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full border-2 border-gov-600 bg-blue-50/50 flex items-center justify-center p-1 shadow-xs flex-shrink-0">
              <Truck size={24} className="text-gov-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-gov-700 tracking-tight">
                  Vehicle &amp; Fleet Tracking
                </h1>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300 uppercase">
                  Live GPS &amp; Camera
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Real-time tracking of DMG IoT mining haulers, corridor transit, and patrol units across Telangana.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenGeofenceSetup()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <ShieldAlert size={15} />
              <span>Manage Boundaries</span>
            </button>
          </div>
        </div>

        {/* ── Status Metrics ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-600 font-bold mb-1">
              <span>Tracked Vehicles</span>
              <Truck size={16} className="text-gov-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{vehicles.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Active Fleet Registry</div>
          </div>

          <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-600 font-bold mb-1">
              <span>Live Online</span>
              <Radio size={16} className="text-emerald-700" />
            </div>
            <div className="text-2xl font-black text-emerald-800">
              {vehicles.filter(v => v.is_online).length}
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-1">Connected &amp; Online</div>
          </div>

          <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-600 font-bold mb-1">
              <span>Flying Squad Patrols</span>
              <Navigation size={16} className="text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {vehicles.filter(v => v.vehicle_type === 'ENFORCEMENT' || (v.vehicle_type as any) === 'PATROL').length}
            </div>
            <div className="text-[11px] text-amber-800 font-semibold mt-1">Surveillance Units</div>
          </div>

          <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-600 font-bold mb-1">
              <span>AI Vision Monitoring</span>
              <Video size={16} className="text-gov-600" />
            </div>
            <div className="text-base font-black text-gov-800">Telematics Active</div>
            <div className="text-[11px] text-slate-500 mt-1">DMS / ADAS Video Active</div>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-white border border-slate-300 rounded-lg p-3.5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Vehicle No, Driver, Assigned Mine..."
              className="w-full bg-white border border-slate-300 rounded pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-gov-600 font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'ALL', label: 'All Fleet' },
              { id: 'ONLINE', label: 'Online Only' },
              { id: 'TRANSPORT', label: 'Mineral Tippers' },
              { id: 'PATROL', label: 'Flying Squad Units' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id as any)}
                className={clsx(
                  'px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer',
                  filter === t.id
                    ? 'bg-gov-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Vehicle Fleet Cards Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((veh) => (
            <div
              key={veh.id}
              className="bg-white border border-slate-300 rounded-lg p-4 shadow-xs flex flex-col justify-between hover:border-gov-400 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-gov-700 font-bold text-sm">{veh.vehicle_number}</span>
                    {veh.is_online ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                        <Wifi size={10} /> Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded">
                        <WifiOff size={10} /> Offline
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 rounded border border-slate-200">
                    {veh.netradyne_device_id}
                  </span>
                </div>

                <div className="font-bold text-slate-900 text-xs">{veh.vehicle_type_display}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Driver: <strong className="text-slate-700">{veh.driver_name}</strong>
                  {veh.driver_license && ` (${veh.driver_license})`}
                </div>

                <div className="mt-3 p-2 bg-slate-50 rounded border border-slate-200 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-[11px]">Current Speed:</span>
                    <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                      <Gauge size={12} className="text-gov-600" /> {veh.current_speed_kmh} km/h
                    </span>
                  </div>
                  {veh.netradyne_device_id && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-[11px]">Device ID:</span>
                      <span className="font-mono font-bold text-emerald-700 text-[11px]">
                        {veh.netradyne_device_id}
                      </span>
                    </div>
                  )}
                  {veh.odometer !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-[11px]">Odometer:</span>
                      <span className="font-mono font-bold text-slate-800 text-[11px]">
                        {veh.odometer.toLocaleString('en-IN')} km
                      </span>
                    </div>
                  )}
                  {veh.chassis_number && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-[11px]">Chassis Number:</span>
                      <span className="font-mono text-slate-700 text-[11px]">
                        {veh.chassis_number}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-[11px]">Assigned Mine:</span>
                    <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[170px]">
                      {veh.current_lease_name || 'Statewide Transit'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-[11px]">District:</span>
                    <span className="font-medium text-slate-700 text-[11px]">{veh.assigned_district}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-1 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleTrack(veh)}
                    className="px-2.5 py-1.5 bg-gov-600 hover:bg-gov-700 text-white rounded text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <MapPin size={12} />
                    <span>Track</span>
                  </button>
                  <button
                    onClick={() => setVideoVehicle(veh)}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <Video size={12} className="text-emerald-700" />
                    <span>Live Camera</span>
                  </button>
                </div>
                <button
                  onClick={() => {
                    selectVehicle(veh.id)
                    onOpenGeofenceSetup(veh)
                  }}
                  className="text-xs font-bold text-gov-600 hover:text-gov-800 flex items-center gap-1 cursor-pointer"
                >
                  <ShieldAlert size={12} />
                  <span>Geofence</span>
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Netradyne Video Streaming Modal */}
      <NetradyneVideoModal
        vehicle={videoVehicle}
        isOpen={Boolean(videoVehicle)}
        onClose={() => setVideoVehicle(null)}
      />
    </div>
  )
}
