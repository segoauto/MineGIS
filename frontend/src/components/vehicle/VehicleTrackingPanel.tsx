import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Truck, AlertCircle, ChevronDown, ChevronUp,
  MapPin, Navigation, Clock, Wifi, WifiOff,
  CheckCircle, Eye,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { useMapStore } from '../../store'
import { vehiclesApi } from '../../api/vehicles'
import clsx from 'clsx'
import type { Vehicle, VehicleAlert } from '../../types'

type VehicleTab = 'vehicles' | 'alerts'
type VehicleFilter = 'all' | 'online' | 'alerts'

export default function VehicleTrackingPanel() {
  const {
    vehicleTrackingPanelOpen, setVehicleTrackingPanelOpen,
    selectedVehicleId, selectVehicle,
    vehicleAlerts, unreadAlertCount, markAlertsRead,
  } = useMapStore()

  const [activeTab, setActiveTab] = useState<VehicleTab>('vehicles')
  const [filter, setFilter] = useState<VehicleFilter>('all')
  const [panelHeight, setPanelHeight] = useState(280)
  const isResizing = useRef(false)

  // ─── Live vehicle list ────────────────────────────────────────────────────
  const { data: vehiclesData, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesApi.list,
    refetchInterval: 30_000,
    staleTime: 15_000,
  })

  const vehicles = vehiclesData || []

  const setVehicles = useMapStore((state) => state.setVehicles)

  useEffect(() => {
    if (vehiclesData) {
      setVehicles(vehiclesData)
    }
  }, [vehiclesData, setVehicles])

  const filteredVehicles = vehicles.filter((v) => {
    if (filter === 'online') return v.is_online
    if (filter === 'alerts') return vehicleAlerts.some((a) => a.vehicle_number === v.vehicle_number && !a.is_resolved)
    return true
  })

  const onlineCount = vehicles.filter((v) => v.is_online).length
  const alertCount = vehicleAlerts.filter((a) => !a.is_resolved).length

  // ─── Resize handle ────────────────────────────────────────────────────────
  const handleResizeStart = (e: React.MouseEvent) => {
    isResizing.current = true
    const startY = e.clientY
    const startH = panelHeight

    const onMove = (me: MouseEvent) => {
      if (!isResizing.current) return
      const delta = startY - me.clientY
      setPanelHeight(Math.min(500, Math.max(180, startH + delta)))
    }
    const onUp = () => { isResizing.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  if (!vehicleTrackingPanelOpen) {
    return (
      <button
        onClick={() => setVehicleTrackingPanelOpen(true)}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-map-panel border border-map-border rounded-full px-4 py-2 text-map-text text-sm hover:bg-map-border transition-colors shadow-xl"
      >
        <Truck size={14} />
        Vehicle Tracking
        {unreadAlertCount > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{unreadAlertCount}</span>
        )}
      </button>
    )
  }

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20 bg-map-panel/98 backdrop-blur-md border-t border-map-border shadow-2xl"
      style={{ height: `${panelHeight}px` }}
    >
      {/* Resize handle */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-gov-600/40 transition-colors"
        onMouseDown={handleResizeStart}
      >
        <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-map-border rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-map-border">
        <div className="flex items-center gap-3">
          <Truck size={16} className="text-gov-300" />
          <span className="text-map-text font-semibold text-sm">Vehicle Tracking — Live</span>
          <LiveBadge />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-map-muted text-xs">
            {onlineCount}/{vehicles.length} online
          </span>
          <button
            onClick={() => setVehicleTrackingPanelOpen(false)}
            className="text-map-muted hover:text-map-text p-1 rounded hover:bg-map-border transition-colors"
          >
            <ChevronDown size={15} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-map-border">
        <TabBtn label="Vehicles" active={activeTab === 'vehicles'} onClick={() => setActiveTab('vehicles')} />
        <TabBtn
          label={`Alerts${alertCount > 0 ? ` (${alertCount})` : ''}`}
          active={activeTab === 'alerts'}
          onClick={() => { setActiveTab('alerts'); markAlertsRead() }}
          highlight={unreadAlertCount > 0}
        />
      </div>

      {/* Body */}
      <div className="flex h-[calc(100%-88px)]">
        {activeTab === 'vehicles' && (
          <>
            {/* Vehicle list */}
            <div className="w-72 border-r border-map-border flex flex-col flex-shrink-0">
              {/* Filter pills */}
              <div className="flex gap-1 p-2 border-b border-map-border">
                {([
                  { v: 'all',    label: `All (${vehicles.length})` },
                  { v: 'online', label: `Online (${onlineCount})` },
                  { v: 'alerts', label: `Alerts (${alertCount})` },
                ] as const).map(({ v, label }) => (
                  <button
                    key={v}
                    onClick={() => setFilter(v)}
                    className={clsx(
                      'px-2 py-1 rounded text-xs font-medium transition-colors',
                      filter === v
                        ? 'bg-gov-600 text-white'
                        : 'text-map-muted hover:text-map-text hover:bg-map-border'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                  <div className="p-3 space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-14 bg-map-border/50 animate-pulse rounded" />
                    ))}
                  </div>
                ) : (
                  filteredVehicles.map((v) => (
                    <VehicleRow
                      key={v.id}
                      vehicle={v}
                      isSelected={selectedVehicleId === v.id}
                      hasAlert={vehicleAlerts.some((a) => a.vehicle_number === v.vehicle_number && !a.is_resolved)}
                      onClick={() => selectVehicle(selectedVehicleId === v.id ? null : v.id)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Vehicle detail */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {selectedVehicleId ? (
                <VehicleDetail
                  vehicleId={selectedVehicleId}
                  vehicles={vehicles}
                  recentAlerts={vehicleAlerts.filter(
                    (a) => a.vehicle_number === vehicles.find((v) => v.id === selectedVehicleId)?.vehicle_number
                  ).slice(0, 5)}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-map-muted text-xs">
                  <div className="text-center">
                    <Truck size={24} className="mx-auto mb-2 opacity-30" />
                    Select a vehicle to view details
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'alerts' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <AlertsFeed alerts={vehicleAlerts} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LiveBadge() {
  return (
    <div className="flex items-center gap-1.5 bg-green-900/30 border border-green-700/40 rounded-full px-2 py-0.5">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      <span className="text-green-400 text-xs font-medium">LIVE</span>
    </div>
  )
}

function TabBtn({ label, active, onClick, highlight }: {
  label: string; active: boolean; onClick: () => void; highlight?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex-1 py-2 text-xs font-medium transition-colors relative',
        active ? 'text-gov-400 border-b-2 border-gov-400' : 'text-map-muted hover:text-map-text'
      )}
    >
      {label}
      {highlight && !active && (
        <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      )}
    </button>
  )
}

function VehicleRow({ vehicle, isSelected, hasAlert, onClick }: {
  vehicle: Vehicle; isSelected: boolean; hasAlert: boolean; onClick: () => void
}) {
  const dotColor = hasAlert
    ? 'bg-red-500'
    : !vehicle.is_online
    ? 'bg-gray-500'
    : vehicle.current_speed_kmh > 0
    ? 'bg-green-500'
    : 'bg-blue-500'

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left px-3 py-2.5 border-b border-map-border/50 transition-colors hover:bg-map-border/30',
        isSelected && 'bg-gov-600/20 border-l-2 border-l-gov-400'
      )}
    >
      <div className="flex items-start gap-2">
        <span className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', dotColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-map-text text-xs font-semibold">
              {vehicle.vehicle_number}
            </span>
            {vehicle.is_online && (
              <span className="text-green-400 text-xs font-mono">
                {Math.round(vehicle.current_speed_kmh)} km/h
              </span>
            )}
          </div>
          <div className="text-map-muted text-xs truncate">{vehicle.driver_name}</div>
          <div className="text-map-muted text-xs">{vehicle.vehicle_type_display} · {vehicle.assigned_district}</div>
          {vehicle.current_lease_name && (
            <div className="text-gov-300 text-xs truncate mt-0.5">📍 {vehicle.current_lease_name}</div>
          )}
          {vehicle.last_seen && (
            <div className="text-map-muted text-xs mt-0.5">
              {formatDistanceToNow(new Date(vehicle.last_seen), { addSuffix: true })}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

function VehicleDetail({ vehicleId, vehicles, recentAlerts }: {
  vehicleId: number; vehicles: Vehicle[]; recentAlerts: VehicleAlert[]
}) {
  const vehicle = vehicles.find((v) => v.id === vehicleId)
  if (!vehicle) return null

  return (
    <div className="p-4 space-y-3">
      {/* Status header */}
      <div className="flex items-center gap-2">
        {vehicle.is_online
          ? <Wifi size={14} className="text-green-400" />
          : <WifiOff size={14} className="text-gray-400" />}
        <span className={clsx('text-xs font-semibold', vehicle.is_online ? 'text-green-400' : 'text-gray-400')}>
          {vehicle.is_online ? 'Online' : 'Offline'}
        </span>
        <span className="text-map-muted text-xs">· {vehicle.vehicle_type_display}</span>
      </div>

      {/* Current status */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={Navigation} label="Speed" value={`${Math.round(vehicle.current_speed_kmh)} km/h`} />
        <StatCard icon={Navigation} label="Heading" value={`${Math.round(vehicle.current_heading)}°`} />
        {vehicle.last_lat && vehicle.last_lon && (
          <>
            <StatCard icon={MapPin} label="Latitude" value={vehicle.last_lat.toFixed(5)} mono />
            <StatCard icon={MapPin} label="Longitude" value={vehicle.last_lon.toFixed(5)} mono />
          </>
        )}
      </div>

      {/* Driver info */}
      <div className="bg-map-bg/50 rounded-lg p-3 space-y-1.5">
        <p className="text-map-muted text-xs font-semibold uppercase tracking-wider mb-2">Driver</p>
        <InfoRow label="Name" value={vehicle.driver_name} />
        <InfoRow label="License" value={vehicle.driver_license ?? '—'} />
        <InfoRow label="District" value={vehicle.assigned_district} />
        {vehicle.assigned_officer_name && (
          <InfoRow label="Officer" value={vehicle.assigned_officer_name} />
        )}
      </div>

      {/* Current assignment */}
      {vehicle.current_lease_name && (
        <div className="bg-gov-600/10 border border-gov-600/30 rounded-lg p-3">
          <p className="text-gov-300 text-xs font-semibold mb-1">Current Assignment</p>
          <p className="text-map-text text-xs">{vehicle.current_lease_name}</p>
          <p className="text-map-muted text-xs font-mono">{vehicle.current_lease_id}</p>
        </div>
      )}

      {/* Recent alerts */}
      {recentAlerts.length > 0 && (
        <div>
          <p className="text-map-muted text-xs font-semibold uppercase tracking-wider mb-2">Recent Alerts</p>
          <div className="space-y-1.5">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className={clsx(
                'flex items-start gap-2 text-xs rounded p-2',
                alert.severity === 'HIGH'   ? 'bg-red-900/20 border border-red-700/30' :
                alert.severity === 'MEDIUM' ? 'bg-yellow-900/20 border border-yellow-700/30' :
                                              'bg-map-bg/50'
              )}>
                <span>{alert.severity === 'HIGH' ? '🔴' : alert.severity === 'MEDIUM' ? '🟡' : '🟢'}</span>
                <div>
                  <div className="text-map-text font-medium">{alert.alert_type_display}</div>
                  <div className="text-map-muted">{formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AlertsFeed({ alerts }: { alerts: VehicleAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-map-muted text-xs">
        <div className="text-center">
          <CheckCircle size={24} className="mx-auto mb-2 text-green-500 opacity-50" />
          No recent alerts
        </div>
      </div>
    )
  }

  return (
    <div className="divide-y divide-map-border/50">
      {alerts.map((alert) => (
        <div key={alert.id} className={clsx(
          'p-3 flex gap-3',
          alert.severity === 'HIGH' && !alert.is_resolved ? 'bg-red-900/10' : ''
        )}>
          <div className="flex-shrink-0 text-base">
            {alert.severity === 'HIGH' ? '🔴' : alert.severity === 'MEDIUM' ? '🟡' : '🟢'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <span className="text-map-text text-xs font-semibold">{alert.vehicle_number}</span>
              <span className="text-map-muted text-xs flex-shrink-0">
                {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
              </span>
            </div>
            <div className={clsx(
              'text-xs font-bold mt-0.5',
              alert.severity === 'HIGH' ? 'text-red-400' :
              alert.severity === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400'
            )}>
              {alert.alert_type_display}
            </div>
            <div className="text-map-muted text-xs mt-0.5 leading-relaxed">{alert.description}</div>
            {alert.mine_name && (
              <div className="text-gov-300 text-xs mt-0.5 font-mono">{alert.lease_id} — {alert.mine_name}</div>
            )}
            {alert.is_resolved && (
              <div className="text-green-500 text-xs mt-1">✓ Resolved by {alert.resolved_by_name}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, mono }: {
  icon: React.ElementType; label: string; value: string; mono?: boolean
}) {
  return (
    <div className="bg-map-bg/50 rounded p-2">
      <div className="text-map-muted text-xs mb-0.5">{label}</div>
      <div className={clsx('text-map-text text-xs font-semibold', mono && 'font-mono')}>{value}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-map-muted text-xs">{label}</span>
      <span className="text-map-text text-xs">{value}</span>
    </div>
  )
}
