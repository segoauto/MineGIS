import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Overlay from 'ol/Overlay'
import { fromLonLat } from 'ol/proj'
import type { Map as OlMap } from 'ol'
import { useMapStore } from '../../store'
import type { Vehicle, VehicleAlert } from '../../types'

// ─── Data freshness ───────────────────────────────────────────────────────────
function dataAge(tsStr?: string | null): 'fresh' | 'recent' | 'stale' | 'offline' {
  if (!tsStr) return 'offline'
  const ts = new Date(tsStr).getTime()
  if (isNaN(ts)) return 'offline'
  const mins = (Date.now() - ts) / 60000
  if (mins < 10) return 'fresh'
  if (mins < 60) return 'recent'
  if (mins < 240) return 'stale'
  return 'offline'
}

// ─── Marker Component (Portal Child) ──────────────────────────────────────────
function VehicleMarker({
  vehicle,
  isSelected,
  hasBreach,
  onClick,
}: {
  vehicle: Vehicle
  isSelected: boolean
  hasBreach: boolean
  onClick: () => void
}) {
  const age = dataAge(vehicle.last_seen)
  const isMoving = vehicle.is_online && (vehicle.current_speed_kmh ?? 0) > 0
  const speed = Math.round(vehicle.current_speed_kmh ?? 0)
  const rot = vehicle.current_heading ?? 0

  let mainColor = '#10b981'
  let ringColor = 'rgba(16, 185, 129, 0.35)'
  let glowColor = 'rgba(16, 185, 129, 0.65)'

  if (hasBreach) {
    mainColor = '#ef4444' // Emergency Crimson
    ringColor = 'rgba(239, 68, 68, 0.5)'
    glowColor = 'rgba(239, 68, 68, 0.8)'
  } else if (isSelected) {
    mainColor = '#38bdf8' // Electric Sky Blue
    ringColor = 'rgba(56, 189, 248, 0.45)'
    glowColor = 'rgba(56, 189, 248, 0.8)'
  } else if (isMoving) {
    mainColor = '#10b981' // Vivid Emerald Green (Active Moving)
    ringColor = 'rgba(16, 185, 129, 0.35)'
    glowColor = 'rgba(16, 185, 129, 0.65)'
  } else if (vehicle.is_online && vehicle.engine_on) {
    mainColor = '#f59e0b' // High-vis Amber Gold (Engine On / Idling)
    ringColor = 'rgba(245, 158, 11, 0.35)'
    glowColor = 'rgba(245, 158, 11, 0.6)'
  } else {
    mainColor = '#64748b' // Slate (Engine Off / Parked)
    ringColor = 'rgba(100, 116, 139, 0.2)'
    glowColor = 'rgba(100, 116, 139, 0.3)'
  }

  // Size: 50px base, 56px if selected or breach for immediate human eye recognition
  const size = hasBreach || isSelected ? 56 : 48

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 50 50">
      <defs>
        <filter id="v-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.6"/>
        </filter>
      </defs>

      <!-- Outer Radar Wave Rings -->
      <circle cx="25" cy="25" r="23" fill="${ringColor}" style="animation:v-radar-pulse 2.2s ease-out infinite; transform-origin:center;"/>
      <circle cx="25" cy="25" r="16" fill="${ringColor}" style="animation:v-radar-pulse 2.2s ease-out infinite 0.7s; transform-origin:center;"/>

      <!-- Vehicle Body Group with Drop Shadow -->
      <g filter="url(#v-shadow)">
        <!-- Heading Direction Chevron Arrow -->
        <polygon points="25,2 31,10 19,10" fill="${mainColor}" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>

        <!-- Chassis Base -->
        <rect x="15" y="10" width="20" height="28" rx="4" fill="${mainColor}" stroke="#ffffff" stroke-width="2"/>

        <!-- Wheels -->
        <rect x="11" y="13" width="4" height="7" rx="1.5" fill="#0f172a" stroke="#ffffff" stroke-width="1"/>
        <rect x="35" y="13" width="4" height="7" rx="1.5" fill="#0f172a" stroke="#ffffff" stroke-width="1"/>
        <rect x="11" y="27" width="4" height="8" rx="1.5" fill="#0f172a" stroke="#ffffff" stroke-width="1"/>
        <rect x="35" y="27" width="4" height="8" rx="1.5" fill="#0f172a" stroke="#ffffff" stroke-width="1"/>

        <!-- Windshield -->
        <rect x="18" y="12" width="14" height="6" rx="1.5" fill="#ffffff" opacity="0.85"/>

        <!-- Cab / Bed Separator -->
        <line x1="16" y1="21" x2="34" y2="21" stroke="#ffffff" stroke-width="1.5"/>

        <!-- Cargo Bed Texture -->
        <rect x="18" y="23" width="14" height="12" rx="2" fill="rgba(0,0,0,0.25)"/>

        <!-- Center Beacon Dot -->
        <circle cx="25" cy="29" r="3.5" fill="#ffffff" stroke="${mainColor}" stroke-width="1"/>
        ${hasBreach ? `<circle cx="25" cy="29" r="6" fill="none" stroke="#ef4444" stroke-width="2" style="animation:v-breach-strobe 0.8s infinite;"/>` : ''}
      </g>
    </svg>
  `

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="relative flex items-center justify-center cursor-pointer select-none"
      style={{
        width: size,
        height: size,
      }}
    >
      {/* ── Always-Visible High-Contrast Tactical Information Pill Badge ── */}
      <div
        className={`absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[10px] font-black shadow-2xl border pointer-events-none whitespace-nowrap z-40 transition-all ${
          hasBreach
            ? 'bg-red-950 text-red-100 border-red-500 animate-pulse ring-2 ring-red-500/60'
            : isSelected
            ? 'bg-sky-950 text-sky-100 border-sky-400 ring-2 ring-sky-400/40'
            : 'bg-slate-950/95 text-slate-100 border-slate-700/90'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            hasBreach
              ? 'bg-red-500 animate-ping'
              : isMoving
              ? 'bg-emerald-400 animate-pulse'
              : 'bg-amber-400'
          }`}
        />
        <span className="tracking-wide font-extrabold">{vehicle.vehicle_number}</span>
        <span
          className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
            hasBreach
              ? 'bg-red-600 text-white shadow'
              : isMoving
              ? 'bg-emerald-900/90 text-emerald-300 border border-emerald-500/30'
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          {hasBreach ? '⚠️ BREACH' : `${speed} km/h`}
        </span>
      </div>

      {/* ── Rotating Vehicle Graphic ── */}
      <div
        style={{
          transform: `rotate(${rot}deg)`,
          transformOrigin: 'center',
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  )
}

// ─── Main Overlays Component ──────────────────────────────────────────────────
export default function VehicleOverlays({ map }: { map: OlMap }) {
  const { vehicles, vehiclesVisible, selectedVehicleId, selectVehicle, vehicleAlerts } = useMapStore()
  const overlaysRef = useRef<Map<number, { element: HTMLDivElement; overlay: Overlay }>>(new Map())
  const [, setForceRender] = useState(0)

  useEffect(() => {
    if (!map) return

    // Ensure style container for tactical radar animations exists
    if (!document.getElementById('vehicle-animations')) {
      const style = document.createElement('style')
      style.id = 'vehicle-animations'
      style.innerHTML = `
        @keyframes v-radar-pulse {
          0% { transform: scale(0.6); opacity: 0.95; }
          70% { transform: scale(1.6); opacity: 0.15; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes v-breach-strobe {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(1.6); }
        }
      `
      document.head.appendChild(style)
    }

    const currentIds = new Set(vehicles.map((v) => v.id))
    let changed = false

    // Remove obsolete overlays
    overlaysRef.current.forEach((entry, id) => {
      if (!currentIds.has(id)) {
        map.removeOverlay(entry.overlay)
        overlaysRef.current.delete(id)
        changed = true
      }
    })

    // Create / Update existing overlays
    vehicles.forEach((v) => {
      let entry = overlaysRef.current.get(v.id)
      if (!entry) {
        const element = document.createElement('div')
        element.className = 'ol-vehicle-overlay'
        element.style.pointerEvents = 'auto'

        const overlay = new Overlay({
          element,
          positioning: 'center-center',
          stopEvent: false,
        })
        map.addOverlay(overlay)

        entry = { element, overlay }
        overlaysRef.current.set(v.id, entry)
        changed = true
      }

      // Update position continuously
      if (v.last_lon && v.last_lat) {
        entry.overlay.setPosition(fromLonLat([v.last_lon, v.last_lat]))
      } else {
        entry.overlay.setPosition(undefined)
      }
    })

    if (changed) {
      setForceRender((prev) => prev + 1)
    }
  }, [vehicles, map])

  if (!map || !vehiclesVisible) return null

  // Render Portals into the created DOM elements
  return (
    <>
      {vehicles.map((v) => {
        const entry = overlaysRef.current.get(v.id)
        if (!entry) return null

        const hasBreach = vehicleAlerts.some(
          (a) => a.vehicle_number === v.vehicle_number && !a.is_resolved && a.severity === 'HIGH' && a.alert_type.includes('GEOFENCE')
        )

        return createPortal(
          <VehicleMarker
            vehicle={v}
            isSelected={selectedVehicleId === v.id}
            hasBreach={hasBreach}
            onClick={() => selectVehicle(v.id)}
          />,
          entry.element
        )
      })}
    </>
  )
}
