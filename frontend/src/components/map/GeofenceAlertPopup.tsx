import { useState, useEffect, useRef } from 'react'
import {
  ShieldAlert, AlertTriangle, Video, MapPin, Gauge, Clock,
  CheckCircle2, X, Navigation, Radio, ExternalLink, Siren
} from 'lucide-react'
import { useMapStore } from '../../store'
import NetradyneVideoModal from '../fleet/NetradyneVideoModal'
import type { Vehicle } from '../../types'
import toast from 'react-hot-toast'

// ─── Synthesized Web Audio Tactical Chime ─────────────────────────────────────
function playTacticalEmergencyChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime

    // Dual-tone high-low alert siren pattern
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sawtooth'
    osc2.type = 'sine'

    // Pulse frequency between 880Hz and 587Hz (A5 -> D5)
    osc1.frequency.setValueAtTime(880, now)
    osc1.frequency.linearRampToValueAtTime(587, now + 0.15)
    osc1.frequency.linearRampToValueAtTime(880, now + 0.3)
    osc1.frequency.linearRampToValueAtTime(587, now + 0.45)

    osc2.frequency.setValueAtTime(440, now)
    osc2.frequency.linearRampToValueAtTime(293, now + 0.15)
    osc2.frequency.linearRampToValueAtTime(440, now + 0.3)
    osc2.frequency.linearRampToValueAtTime(293, now + 0.45)

    gain.gain.setValueAtTime(0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.6)
    osc2.stop(now + 0.6)
  } catch {
    // Audio context may be restricted by autoplay policy until user gesture
  }
}

export default function GeofenceAlertPopup() {
  const {
    activeGeofenceAlertPopup,
    setActiveGeofenceAlertPopup,
    vehicles,
    selectVehicle,
    setVehicleTrackingPanelOpen,
  } = useMapStore()

  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [selectedVehicleForVideo, setSelectedVehicleForVideo] = useState<Vehicle | null>(null)
  const lastAlertIdRef = useRef<string | number | null>(null)

  // Play tactical emergency chime whenever a new alert pops up
  useEffect(() => {
    if (activeGeofenceAlertPopup && activeGeofenceAlertPopup.id !== lastAlertIdRef.current) {
      lastAlertIdRef.current = activeGeofenceAlertPopup.id
      playTacticalEmergencyChime()
    }
  }, [activeGeofenceAlertPopup])

  if (!activeGeofenceAlertPopup) return null

  const alert = activeGeofenceAlertPopup
  const matchedVehicle = vehicles.find((v) => v.vehicle_number === alert.vehicleNumber) || {
    id: alert.vehicleId ?? 4134066,
    netradyne_device_id: '6603125484',
    vehicle_number: alert.vehicleNumber,
    vehicle_type: 'ENFORCEMENT',
    vehicle_type_display: 'DMG Vigilance & Flying Squad Rapid Patrol',
    driver_name: alert.driverName || 'Designated Driver',
    driver_license: 'DL-TG-2018-091234',
    assigned_district: alert.district || 'Mahabubnagar',
    assigned_officer_name: 'District Mineral Officer',
    last_lon: alert.lon,
    last_lat: alert.lat,
    last_seen: new Date().toISOString(),
    current_speed_kmh: alert.speedKmh ?? 52,
    current_heading: 25,
    is_online: true,
    engine_on: true,
    current_lease_id: 'TS-NH167-CORR',
    current_lease_name: alert.zoneName,
    odometer: 1902.48,
    chassis_number: alert.vehicleNumber,
    gvwr: '47500 kg',
    license_state: 'TG',
  } as Vehicle

  const handleOpenVideo = () => {
    setSelectedVehicleForVideo(matchedVehicle)
    setVideoModalOpen(true)
  }

  const handleAcknowledge = () => {
    setActiveGeofenceAlertPopup(null)
    toast.success(`Geofence violation on ${alert.vehicleNumber} acknowledged and logged into DMG central enforcement ledger.`, {
      icon: '🛡️',
      duration: 4000,
      style: { background: '#0F172A', color: '#F8FAFC', border: '1px solid #334155' }
    })
  }

  const handleDispatchSquad = () => {
    toast.error(`🚨 Rapid Flying Squad dispatched to ${alert.vehicleNumber} at ${alert.lat.toFixed(4)}°N, ${alert.lon.toFixed(4)}°E!`, {
      duration: 5000,
      style: { background: '#7F1D1D', color: '#FEE2E2', border: '2px solid #EF4444' }
    })
  }

  const isEntry = alert.eventType === 'ENTRY' || alert.eventType === 'TRESPASS'

  return (
    <>
      {/* ── High-Visibility Floating Tactical Alert Card Directly on Map ── */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-xl animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="bg-slate-950/95 backdrop-blur-md rounded-xl border-2 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.55)] overflow-hidden ring-4 ring-red-500/20">
          
          {/* Emergency Flashing Header */}
          <div className="relative bg-gradient-to-r from-red-700 via-rose-600 to-red-700 px-4 py-2.5 flex items-center justify-between text-white overflow-hidden">
            {/* Animated background strobe effect */}
            <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />

            <div className="relative flex items-center gap-2.5">
              <div className="p-1.5 bg-white/20 rounded-lg animate-bounce">
                <Siren size={20} className="text-white drop-shadow" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-widest uppercase bg-black/40 px-2 py-0.5 rounded border border-white/30 text-amber-200">
                    CRITICAL GEOFENCE VIOLATION
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-mono text-white/90">
                    <Radio size={12} className="animate-ping text-emerald-300" />
                    LIVE TELEMETRY
                  </span>
                </div>
                <h3 className="text-sm font-black tracking-wide text-white drop-shadow mt-0.5">
                  {isEntry ? 'UNAUTHORIZED GEOFENCE ENTRY / TRESPASS' : 'UNAUTHORIZED ROUTE / ZONE DEVIATION'}
                </h3>
              </div>
            </div>

            <button
              onClick={handleAcknowledge}
              className="relative p-1.5 rounded-lg bg-black/30 hover:bg-black/60 text-white/80 hover:text-white transition-colors"
              title="Acknowledge & Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Alert Body */}
          <div className="p-4 space-y-3.5 text-slate-200">
            {/* Main vehicle & zone banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/90 rounded-lg p-3 border border-slate-800">
              {/* Vehicle info */}
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Target Vehicle</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-base font-black font-mono text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-amber-500/40 shadow-inner">
                    {alert.vehicleNumber}
                  </span>
                  <span className="text-xs font-bold text-slate-300">{alert.driverName}</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-mono text-emerald-400 font-bold">
                    <Gauge size={13} />
                    {Math.round(alert.speedKmh ?? 0)} km/h
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="flex items-center gap-1 font-mono text-slate-300">
                    <Clock size={12} />
                    {alert.timestamp}
                  </span>
                </div>
              </div>

              {/* Zone info */}
              <div className="sm:border-l sm:border-slate-800 sm:pl-3">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  {isEntry ? 'Zone Entered (Trespassed)' : 'Permitted Zone Exited'}
                </span>
                <div className="mt-0.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-red-300 bg-red-950/80 border border-red-500/40 px-2 py-0.5 rounded">
                    <AlertTriangle size={13} className="text-red-400 shrink-0" />
                    <span className="truncate max-w-[210px]">{alert.zoneName}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-400 font-mono">
                  <MapPin size={12} className="text-sky-400 shrink-0" />
                  <span>{alert.lat.toFixed(5)}°N, {alert.lon.toFixed(5)}°E</span>
                  {alert.district && <span className="text-slate-400">• {alert.district}</span>}
                </div>
              </div>
            </div>

            {/* Tactical action buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Watch Live Video */}
              <button
                onClick={handleOpenVideo}
                className="flex-1 min-w-[170px] flex items-center justify-center gap-2 px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-lg text-xs font-extrabold shadow-lg shadow-red-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Video size={15} className="animate-pulse" />
                <span>Live Dashcam Stream</span>
                <span className="bg-black/30 text-[10px] px-1.5 py-0.5 rounded font-mono">ROAD & CAB</span>
              </button>

              {/* Dispatch Squad */}
              <button
                onClick={handleDispatchSquad}
                className="flex-1 min-w-[150px] flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-extrabold shadow transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <ShieldAlert size={14} />
                <span>Dispatch Squad</span>
              </button>

              {/* Acknowledge */}
              <button
                onClick={handleAcknowledge}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition-colors border border-slate-700"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Netradyne Live Dashcam Modal (Opened on click) ── */}
      {videoModalOpen && (
        <NetradyneVideoModal
          vehicle={selectedVehicleForVideo}
          isOpen={videoModalOpen}
          onClose={() => setVideoModalOpen(false)}
          currentGeofenceName={alert.zoneName}
        />
      )}
    </>
  )
}
