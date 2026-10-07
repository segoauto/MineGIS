import { useState, useEffect, useRef } from 'react'
import { X, Search, Crosshair, ZoomIn } from 'lucide-react'
import { toLonLat } from 'ol/proj'
import type { Map } from 'ol'

interface MapMagnifierProps {
  map: Map | null
  onClose: () => void
}

export default function MapMagnifier({ map, onClose }: MapMagnifierProps) {
  const [lensPos, setLensPos] = useState<{ x: number; y: number }>({ x: 300, y: 300 })
  const [coords, setCoords] = useState<{ lat: string; lon: string }>({ lat: '17.3850', lon: '78.4867' })
  const lensRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!map) return

    const handlePointerMove = (e: any) => {
      const pixel = e.pixel
      if (pixel && pixel.length >= 2) {
        setLensPos({ x: pixel[0], y: pixel[1] })
        const lonLat = toLonLat(e.coordinate)
        if (lonLat) {
          setCoords({
            lat: lonLat[1].toFixed(5),
            lon: lonLat[0].toFixed(5),
          })
        }
      }
    }

    map.on('pointermove', handlePointerMove)
    return () => {
      map.un('pointermove', handlePointerMove)
    }
  }, [map])

  return (
    <>
      {/* Floating HUD instructions */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-25 flex items-center gap-2.5 bg-slate-900/95 text-white px-4 py-2 rounded-full shadow-2xl border border-emerald-400 backdrop-blur-md animate-fade-in text-xs font-semibold">
        <Search size={14} className="text-emerald-400" />
        <span>Spyglass Magnifier Active (Move mouse across mining leases)</span>
        <span className="font-mono text-emerald-300 text-[11px] bg-slate-800 px-2 py-0.5 rounded">
          {coords.lat}°N, {coords.lon}°E
        </span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors ml-2"
          title="Exit Magnifier"
        >
          <X size={14} />
        </button>
      </div>

      {/* Floating Circular Magnifier Lens */}
      <div
        ref={lensRef}
        className="absolute pointer-events-none z-20 w-48 h-48 -ml-24 -mt-24 rounded-full border-4 border-emerald-500 bg-slate-900/30 backdrop-blur-xs shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center justify-center overflow-hidden transition-all duration-75"
        style={{ left: lensPos.x, top: lensPos.y }}
      >
        {/* Precision Crosshair */}
        <div className="absolute inset-0 flex items-center justify-center opacity-70">
          <div className="w-full h-px bg-emerald-400/80" />
          <div className="h-full w-px bg-emerald-400/80 absolute" />
          <div className="w-12 h-12 rounded-full border border-emerald-400/80 absolute" />
        </div>

        {/* Lens HUD Stamp */}
        <div className="absolute bottom-2 bg-slate-950/90 text-[9px] font-mono font-bold text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/50">
          2.5x Lens • Telematics
        </div>
      </div>
    </>
  )
}
