import { useState, useEffect, useRef } from 'react'
import { X, Search, Crosshair, ZoomIn, Layers } from 'lucide-react'
import { toLonLat } from 'ol/proj'
import type { Map as OlMapType } from 'ol'
import OlMap from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import { Style, Fill, Stroke } from 'ol/style'

interface MapMagnifierProps {
  mainMap: OlMapType | null
  onClose: () => void
}

export default function MapMagnifier({ mainMap, onClose }: MapMagnifierProps) {
  const [lensPos, setLensPos] = useState<{ x: number; y: number }>({ x: 350, y: 350 })
  const [coords, setCoords] = useState<{ lat: string; lon: string }>({ lat: '17.3850', lon: '78.4867' })
  const [comparisonBasemap, setComparisonBasemap] = useState<'satellite' | 'topo' | 'osm'>('satellite')

  const lensContainerRef = useRef<HTMLDivElement>(null)
  const magnifierMapRef = useRef<OlMap | null>(null)

  // Initialize comparison map inside the lens
  useEffect(() => {
    if (!mainMap || !lensContainerRef.current) return

    const getSource = () => {
      if (comparisonBasemap === 'topo') {
        return new XYZ({
          url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
          maxZoom: 17,
        })
      }
      if (comparisonBasemap === 'osm') {
        return new XYZ({
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          maxZoom: 19,
        })
      }
      return new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
      })
    }

    const baseTile = new TileLayer({
      source: getSource(),
    })

    const referenceLabels = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
      }),
      opacity: 0.85,
    })

    // High-contrast red outline for mining leases inside the spyglass
    const minesOverlay = new VectorLayer({
      source: new VectorSource({
        url: '/data/gis/mines_polygons.geojson',
        format: new GeoJSON(),
      }),
      style: new Style({
        fill: new Fill({ color: 'rgba(239, 68, 68, 0.2)' }),
        stroke: new Stroke({ color: '#EF4444', width: 2.5 }),
      }),
      zIndex: 20,
    })

    const currentCenter = mainMap.getView().getCenter() || [0, 0]
    const currentZoom = (mainMap.getView().getZoom() ?? 8) + 1.8

    const magMap = new OlMap({
      target: lensContainerRef.current,
      layers: [baseTile, referenceLabels, minesOverlay],
      view: new View({
        center: currentCenter,
        zoom: currentZoom,
        maxZoom: 21,
      }),
      controls: [],
      interactions: [],
    })

    magnifierMapRef.current = magMap

    return () => {
      magMap.setTarget(undefined)
      magnifierMapRef.current = null
    }
  }, [mainMap, comparisonBasemap])

  // Track mouse pointer on main map and update lens location and camera
  useEffect(() => {
    if (!mainMap) return

    const handlePointerMove = (e: any) => {
      const pixel = e.pixel
      if (!pixel || pixel.length < 2) return

      setLensPos({ x: pixel[0], y: pixel[1] })

      const lonLat = toLonLat(e.coordinate)
      if (lonLat) {
        setCoords({
          lat: lonLat[1].toFixed(5),
          lon: lonLat[0].toFixed(5),
        })
      }

      if (magnifierMapRef.current) {
        const magView = magnifierMapRef.current.getView()
        const mainZoom = mainMap.getView().getZoom() ?? 8
        magView.setCenter(e.coordinate)
        magView.setZoom(mainZoom + 1.8)
      }
    }

    mainMap.on('pointermove', handlePointerMove)
    return () => {
      mainMap.un('pointermove', handlePointerMove)
    }
  }, [mainMap])

  return (
    <>
      {/* ── Top HUD Control Panel Matching Mining 2 ── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-25 flex items-center gap-2.5 bg-slate-900/95 text-white px-3.5 py-1.5 rounded-full shadow-2xl border border-emerald-400 backdrop-blur-md animate-fade-in text-xs font-semibold">
        <Search size={14} className="text-emerald-400" />
        <span>Lens View:</span>
        <select
          value={comparisonBasemap}
          onChange={(e) => setComparisonBasemap(e.target.value as any)}
          className="bg-slate-800 border border-slate-700 text-emerald-300 font-bold px-2 py-0.5 rounded text-[11px] outline-none cursor-pointer"
        >
          <option value="satellite">High-Res Satellite</option>
          <option value="topo">Topographic Contour</option>
          <option value="osm">OpenStreetMap</option>
        </select>
        <span className="font-mono text-emerald-300 text-[11px] bg-slate-800 px-1.5 py-0.5 rounded">
          {coords.lat}°N, {coords.lon}°E (+1.8x)
        </span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
          title="Exit Magnifier"
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Floating Circular Spyglass Lens with Live Synchronized Map ── */}
      <div
        className="absolute pointer-events-none z-30 w-52 h-52 -ml-26 -mt-26 rounded-full border-4 border-white shadow-[0_8px_32px_rgba(0,0,0,0.65)] overflow-hidden bg-slate-950 flex items-center justify-center"
        style={{ left: lensPos.x, top: lensPos.y }}
      >
        {/* Real OpenLayers Map Mounted Inside Lens */}
        <div ref={lensContainerRef} className="w-full h-full" />

        {/* Center Crosshair Target */}
        <div className="absolute inset-0 flex items-center justify-center opacity-80 pointer-events-none">
          <div className="w-full h-px bg-white/70 shadow-xs" />
          <div className="h-full w-px bg-white/70 shadow-xs absolute" />
          <div className="w-10 h-10 rounded-full border border-white/80 absolute shadow-xs" />
        </div>

        {/* Lens Bottom HUD Pill */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-950/90 text-[9px] font-mono font-bold text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/60 shadow-lg pointer-events-none whitespace-nowrap">
          {comparisonBasemap === 'satellite' ? 'Satellite' : comparisonBasemap === 'topo' ? 'Topo' : 'Street'} Lens · +1.8x
        </div>
      </div>
    </>
  )
}
