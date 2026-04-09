import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Overlay from 'ol/Overlay'
import { fromLonLat } from 'ol/proj'
import type { Map as OlMap } from 'ol'
import { useMapStore } from '../../store'
import type { Vehicle } from '../../types'

// ─── Data freshness ───────────────────────────────────────────────────────────
function dataAge(tsStr?: string | null): 'fresh' | 'recent' | 'stale' | 'offline' {
  if (!tsStr) return 'offline'
  // Sego used a timestamp, but minegis vehicle model provides `last_ping` ISO string.
  const ts = new Date(tsStr).getTime()
  if (isNaN(ts)) return 'offline'
  
  const mins = (Date.now() - ts) / 60000
  if (mins < 5) return 'fresh'
  if (mins < 30) return 'recent'
  if (mins < 120) return 'stale'
  return 'offline'
}

function ageColor(age: 'fresh' | 'recent' | 'stale' | 'offline') {
  switch (age) {
    case 'fresh': return { dot: '#22c55e', ring: 'rgba(34,197,94,0.22)', glow: 'rgba(34,197,94,0.5)' }
    case 'recent': return { dot: '#38bdf8', ring: 'rgba(56,189,248,0.22)', glow: 'rgba(56,189,248,0.45)' }
    case 'stale': return { dot: '#f97316', ring: 'rgba(249,115,22,0.2)', glow: 'rgba(249,115,22,0.4)' }
    case 'offline': return { dot: '#94a3b8', ring: 'rgba(148,163,184,0.15)', glow: 'rgba(148,163,184,0.2)' }
  }
}

// ─── Marker Component (Portal Child) ──────────────────────────────────────────
function VehicleMarker({
  vehicle,
  isSelected,
  onClick,
}: {
  vehicle: Vehicle
  isSelected: boolean
  onClick: () => void
}) {
  const age = dataAge(vehicle.last_seen)
  const { dot, ring, glow } = ageColor(age)
  const engineOn = vehicle.is_online && (vehicle.current_speed_kmh ?? 0) > 0 // Mock engine status based on speed if unavailable
  const color = isSelected ? '#38bdf8' : (age === 'fresh' && engineOn) ? '#22c55e' : dot
  const glowColor = isSelected ? 'rgba(56,189,248,0.45)' : glow
  const ringColor = isSelected ? 'rgba(56,189,248,0.18)' : ring
  const border = 'rgba(255,255,255,0.9)'
  const size = isSelected ? 38 : 30
  // use 0 as default bearing
  const rot = 0 // Netradyne mock data may not always have bearing

  const ignDot = engineOn
    ? `<circle cx="28" cy="28" r="4" fill="#22c55e" stroke="#fff" stroke-width="1.2"/>`
    : `<circle cx="28" cy="28" r="4" fill="#f97316" stroke="#fff" stroke-width="1.2"/>`

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="19" fill="${ringColor}" style="animation:nd-pulse 2.8s ease-out infinite"/>
        <ellipse cx="20" cy="30" rx="7" ry="3" fill="rgba(0,0,0,0.22)"/>
        <rect x="13" y="10" width="14" height="20" rx="3" fill="${color}" stroke="${border}" stroke-width="1.5"/>
        <rect x="15" y="7" width="10" height="7" rx="2" fill="${color}" stroke="${border}" stroke-width="1.5"/>
        <rect x="16.5" y="8" width="7" height="4" rx="1" fill="rgba(255,255,255,0.35)"/>
        <polygon points="20,2 24,8 16,8" fill="${color}" stroke="${border}" stroke-width="1.2"/>
        <rect x="10" y="24" width="4" height="6" rx="1.5" fill="rgba(0,0,0,0.55)"/>
        <rect x="26" y="24" width="4" height="6" rx="1.5" fill="rgba(0,0,0,0.55)"/>
        <rect x="11" y="12" width="3" height="5" rx="1" fill="rgba(0,0,0,0.45)"/>
        <rect x="26" y="12" width="3" height="5" rx="1" fill="rgba(0,0,0,0.45)"/>
        <circle cx="20" cy="20" r="13" fill="none" stroke="${glowColor}" stroke-width="3" opacity="0.6"/>
        ${ignDot}
    </svg>
    <style>@keyframes nd-pulse{0%{transform:scale(.5);opacity:.9}70%{transform:scale(1.6);opacity:.07}100%{transform:scale(1.8);opacity:0}}</style>
  `

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="relative flex items-center justify-center cursor-pointer group"
      style={{
        width: size,
        height: size,
        transform: `rotate(${rot}deg)`,
        transformOrigin: 'center',
      }}
    >
      <div dangerouslySetInnerHTML={{ __html: svg }} />

      {/* Tooltip on hover */}
      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-map-panel border border-gov-500/30 text-map-text text-[11px] font-bold tracking-wider px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {vehicle.vehicle_number}
      </div>
    </div>
  )
}

// ─── Main Overlays Component ──────────────────────────────────────────────────
export default function VehicleOverlays({ map }: { map: OlMap }) {
  const { vehicles, vehiclesVisible, selectedVehicleId, selectVehicle } = useMapStore()
  const overlaysRef = useRef<Map<number, { element: HTMLDivElement; overlay: Overlay }>>(new Map())
  const [, setForceRender] = useState(0)

  useEffect(() => {
    if (!map) return

    // Ensure style container for animations exists
    if (!document.getElementById('vehicle-animations')) {
      const style = document.createElement('style')
      style.id = 'vehicle-animations'
      style.innerHTML = `@keyframes nd-pulse{0%{transform:scale(.5);opacity:.9}70%{transform:scale(1.6);opacity:.07}100%{transform:scale(1.8);opacity:0}}`
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
        // Important: allow pointer events through the overlay so we can hover/click
        element.style.pointerEvents = 'auto'
        element.style.position = 'absolute'
        element.style.transform = 'translate(-50%, -50%)'

        const overlay = new Overlay({
          element,
          positioning: 'center-center',
          stopEvent: false, // let openlayers handle map clicks if we miss
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
      // Force render so portals attach to the newly created elements
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

        return createPortal(
          <VehicleMarker
            vehicle={v}
            isSelected={selectedVehicleId === v.id}
            onClick={() => selectVehicle(v.id)}
          />,
          entry.element
        )
      })}
    </>
  )
}
