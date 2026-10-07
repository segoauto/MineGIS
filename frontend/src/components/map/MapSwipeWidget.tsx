import { useState, useRef, useEffect } from 'react'
import { X, Split, ArrowLeftRight, Layers } from 'lucide-react'
import { useMapStore } from '../../store'
import type { Map as OlMapType } from 'ol'
import OlMap from 'ol/Map'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import { Style, Fill, Stroke } from 'ol/style'

interface MapSwipeWidgetProps {
  mainMap: OlMapType | null
  onClose: () => void
}

export default function MapSwipeWidget({ mainMap, onClose }: MapSwipeWidgetProps) {
  const { swipePosition, setSwipePosition } = useMapStore()
  const [comparisonLayerType, setComparisonLayerType] = useState<'satellite' | 'ndvi' | 'topo'>('satellite')
  const isDraggingRef = useRef(false)
  const swipeMapContainerRef = useRef<HTMLDivElement>(null)
  const swipeMapRef = useRef<OlMap | null>(null)

  // Initialize secondary synchronized comparison map
  useEffect(() => {
    if (!mainMap || !swipeMapContainerRef.current) return

    // Base comparison layer source
    const getComparisonSource = () => {
      if (comparisonLayerType === 'topo') {
        return new XYZ({
          url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
          maxZoom: 17,
        })
      }
      return new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
      })
    }

    const baseTile = new TileLayer({
      source: getComparisonSource(),
    })

    const referenceLabels = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
      }),
      opacity: 0.9,
    })

    // Mining leases boundary overlay on comparison map
    const minesOverlay = new VectorLayer({
      source: new VectorSource({
        url: '/data/gis/mines_polygons.geojson',
        format: new GeoJSON(),
      }),
      style: new Style({
        fill: new Fill({ color: 'rgba(239, 68, 68, 0.25)' }),
        stroke: new Stroke({ color: '#EF4444', width: 2 }),
      }),
      zIndex: 20,
    })

    // Create synchronized map sharing the exact same View instance!
    const swipeMap = new OlMap({
      target: swipeMapContainerRef.current,
      layers: [baseTile, referenceLabels, minesOverlay],
      view: mainMap.getView(), // Synchronizes pan, zoom, rotation at 60fps
      controls: [],
      interactions: [],
    })

    swipeMapRef.current = swipeMap

    return () => {
      swipeMap.setTarget(undefined)
      swipeMapRef.current = null
    }
  }, [mainMap, comparisonLayerType])

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    const rect = document.getElementById('ol-map')?.getBoundingClientRect()
    if (!rect) return
    const clientX = e.clientX
    const relativeX = clientX - rect.left
    const pct = Math.max(5, Math.min(95, (relativeX / rect.width) * 100))
    setSwipePosition(Math.round(pct))
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  return (
    <>
      {/* ── Real Synchronized Comparison Map Layer (Clipped to Swipe Position) ── */}
      <div
        className="absolute inset-0 pointer-events-none z-10 overflow-hidden"
        style={{
          clipPath: `inset(0 calc(100% - ${swipePosition}%) 0 0)`,
        }}
      >
        <div ref={swipeMapContainerRef} className="w-full h-full" />
      </div>

      {/* Floating HUD Controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-25 flex items-center gap-2.5 bg-slate-900/95 text-white px-3.5 py-1.5 rounded-full shadow-2xl border border-sky-400/80 backdrop-blur-md animate-fade-in text-xs font-semibold">
        <Split size={14} className="text-sky-400" />
        <span>Swipe Comparison:</span>
        <select
          value={comparisonLayerType}
          onChange={(e) => setComparisonLayerType(e.target.value as any)}
          className="bg-slate-800 border border-slate-700 text-sky-300 font-bold px-2 py-0.5 rounded text-[11px] outline-none cursor-pointer"
        >
          <option value="satellite">Satellite Imagery (High-Res)</option>
          <option value="topo">Topographic Terrain</option>
        </select>
        <span className="font-mono text-sky-300 font-bold bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
          {swipePosition}%
        </span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
          title="Exit Swipe Mode"
        >
          <X size={14} />
        </button>
      </div>

      {/* Comparison Labels */}
      <div className="absolute top-16 left-6 z-20 bg-slate-900/90 text-white px-2.5 py-1 rounded text-[11px] font-bold border border-slate-700 shadow-lg pointer-events-none flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-sky-400" />
        <span>◄ Left: {comparisonLayerType === 'satellite' ? 'Esri Satellite + Leases' : 'OpenTopoMap'}</span>
      </div>
      <div className="absolute top-16 right-6 z-20 bg-slate-900/90 text-white px-2.5 py-1 rounded text-[11px] font-bold border border-slate-700 shadow-lg pointer-events-none flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span>Right: Base Map ►</span>
      </div>

      {/* Vertical Swipe Divider Line */}
      <div
        className="absolute top-0 bottom-0 z-20 pointer-events-none flex items-center justify-center"
        style={{ left: `${swipePosition}%` }}
      >
        <div className="w-0.5 h-full bg-white shadow-[0_0_12px_rgba(0,0,0,0.8)] border-x border-sky-400" />

        {/* Draggable Handle */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="absolute w-10 h-10 -ml-5 rounded-full bg-slate-900 border-2 border-sky-400 text-sky-400 flex items-center justify-center shadow-2xl pointer-events-auto cursor-ew-resize hover:scale-110 active:scale-95 transition-transform"
          title="Drag left or right to swipe compare"
        >
          <ArrowLeftRight size={18} />
        </div>
      </div>
    </>
  )
}
