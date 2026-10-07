import { useState, useEffect, useRef } from 'react'
import { X, Search, Crosshair, ZoomIn, Layers, Sparkles } from 'lucide-react'
import { toLonLat } from 'ol/proj'
import type { Map as OlMapType } from 'ol'
import OlMap from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import { Style, Fill, Stroke, Text } from 'ol/style'
import { NDVI_SPECTRAL_GEOJSON, WI_SPECTRAL_GEOJSON } from '../../utils/spatialLayersData'

interface MapMagnifierProps {
  mainMap: OlMapType | null
  onClose: () => void
}

type MagnifierBasemapType = 'ndvi' | 'wi' | 'cir' | 'satellite' | 'topo' | 'osm'

export default function MapMagnifier({ mainMap, onClose }: MapMagnifierProps) {
  const [lensPos, setLensPos] = useState<{ x: number; y: number }>({ x: 350, y: 350 })
  const [coords, setCoords] = useState<{ lat: string; lon: string }>({ lat: '17.3850', lon: '78.4867' })
  const [comparisonBasemap, setComparisonBasemap] = useState<MagnifierBasemapType>('ndvi')

  const lensContainerRef = useRef<HTMLDivElement>(null)
  const magnifierMapRef = useRef<OlMap | null>(null)

  // Initialize comparison map inside the lens
  useEffect(() => {
    if (!mainMap || !lensContainerRef.current) return

    let baseSource: any
    let tileClassName = ''

    if (comparisonBasemap === 'topo') {
      baseSource = new XYZ({
        url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
        maxZoom: 17,
      })
    } else if (comparisonBasemap === 'osm') {
      baseSource = new XYZ({
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        maxZoom: 19,
      })
    } else {
      // High-res satellite
      baseSource = new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
      })

      if (comparisonBasemap === 'ndvi') {
        tileClassName = 'mag-ndvi-tiles'
      } else if (comparisonBasemap === 'wi') {
        tileClassName = 'mag-wi-tiles'
      } else if (comparisonBasemap === 'cir') {
        tileClassName = 'mag-cir-tiles'
      }
    }

    const baseTile = new TileLayer({
      source: baseSource,
      className: tileClassName,
      zIndex: 1,
    })

    const referenceLabels = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
      }),
      opacity: 0.85,
      zIndex: 10,
    })

    // Spectral Vector Overlays (NDVI / WI classification badges)
    const geojsonFormat = new GeoJSON()
    const spectralVectorLayer = new VectorLayer({
      source: new VectorSource({
        features: geojsonFormat.readFeatures(
          comparisonBasemap === 'wi' ? WI_SPECTRAL_GEOJSON : NDVI_SPECTRAL_GEOJSON,
          { featureProjection: 'EPSG:3857' }
        ),
      }),
      visible: comparisonBasemap === 'ndvi' || comparisonBasemap === 'wi',
      style: (feature) => {
        if (comparisonBasemap === 'wi') {
          const val = Number(feature.get('ndwi') ?? 0.0)
          const color = (feature.get('color') as string) || (val > 0.3 ? '#0284c7' : '#38bdf8')
          return new Style({
            fill: new Fill({ color: `${color}99` }),
            stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
            text: new Text({
              text: `💧 NDWI ${val > 0 ? '+' : ''}${val.toFixed(2)}`,
              font: 'bold 10px sans-serif',
              fill: new Fill({ color: '#ffffff' }),
              stroke: new Stroke({ color: '#0f172a', width: 2.5 }),
              backgroundFill: new Fill({ color: 'rgba(15, 23, 42, 0.9)' }),
              padding: [1, 4, 1, 4],
            }),
          })
        }
        const val = Number(feature.get('ndvi') ?? 0.0)
        const color = (feature.get('color') as string) || (val < 0.2 ? '#dc2626' : val < 0.4 ? '#f59e0b' : '#16a34a')
        return new Style({
          fill: new Fill({ color: `${color}88` }),
          stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
          text: new Text({
            text: `🌱 NDVI ${val.toFixed(2)}`,
            font: 'bold 10px sans-serif',
            fill: new Fill({ color: '#ffffff' }),
            stroke: new Stroke({ color: '#0f172a', width: 2.5 }),
            backgroundFill: new Fill({ color: 'rgba(15, 23, 42, 0.9)' }),
            padding: [1, 4, 1, 4],
          }),
        })
      },
      zIndex: 25,
    })

    // High-contrast outline for mining leases inside the spyglass
    const minesOverlay = new VectorLayer({
      source: new VectorSource({
        url: '/data/gis/mines_polygons.geojson',
        format: new GeoJSON(),
      }),
      style: new Style({
        fill: new Fill({ color: 'rgba(239, 68, 68, 0.15)' }),
        stroke: new Stroke({
          color: comparisonBasemap === 'ndvi' ? '#facc15' : '#ef4444',
          width: 2.5,
        }),
      }),
      zIndex: 20,
    })

    const currentCenter = mainMap.getView().getCenter() || [0, 0]
    const currentZoom = (mainMap.getView().getZoom() ?? 8) + 1.8

    const magMap = new OlMap({
      target: lensContainerRef.current,
      layers: [baseTile, referenceLabels, spectralVectorLayer, minesOverlay],
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
      {/* ── SVG Filters for Magnifier Spectral Modes ── */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <filter id="mag-ndvi-filter" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="
                0.2126 0.7152 0.0722 0 0
                0.2126 0.7152 0.0722 0 0
                0.2126 0.7152 0.0722 0 0
                0      0      0      1 0
              "
            />
            <feComponentTransfer>
              <feFuncR type="table" tableValues="0.08 0.20 0.95 0.98 0.90 0.50 0.10 0.05" />
              <feFuncG type="table" tableValues="0.12 0.25 0.15 0.40 0.85 0.95 0.75 0.48" />
              <feFuncB type="table" tableValues="0.30 0.45 0.08 0.05 0.08 0.15 0.18 0.10" />
            </feComponentTransfer>
          </filter>

          <filter id="mag-wi-filter" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="
                0.2126 0.7152 0.0722 0 0
                0.2126 0.7152 0.0722 0 0
                0.2126 0.7152 0.0722 0 0
                0      0      0      1 0
              "
            />
            <feComponentTransfer>
              <feFuncR type="table" tableValues="0.60 0.75 0.70 0.45 0.18 0.05 0.02 0.00" />
              <feFuncG type="table" tableValues="0.35 0.50 0.55 0.65 0.80 0.90 0.75 0.55" />
              <feFuncB type="table" tableValues="0.12 0.18 0.32 0.70 0.95 1.00 0.98 0.90" />
            </feComponentTransfer>
          </filter>

          <filter id="mag-cir-filter" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="
                0.15 1.90 0.10 0 0
                0.75 0.15 0.10 0 0
                0.10 0.10 1.25 0 0
                0    0    0    1 0
              "
            />
          </filter>
        </defs>
      </svg>

      <style>{`
        .mag-ndvi-tiles {
          filter: url(#mag-ndvi-filter) saturate(1.8) contrast(1.2);
        }
        .mag-wi-tiles {
          filter: url(#mag-wi-filter) saturate(1.9) contrast(1.25);
        }
        .mag-cir-tiles {
          filter: url(#mag-cir-filter) saturate(1.8) contrast(1.15);
        }
      `}</style>

      {/* ── Top HUD Control Panel Matching Mining 2 ── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-25 flex items-center gap-2.5 bg-slate-900/95 text-white px-3.5 py-1.5 rounded-full shadow-2xl border border-emerald-400 backdrop-blur-md animate-fade-in text-xs font-semibold">
        <Search size={14} className="text-emerald-400" />
        <span className="flex items-center gap-1">
          <Sparkles size={12} className="text-yellow-400" />
          <span>Lens View:</span>
        </span>
        <select
          value={comparisonBasemap}
          onChange={(e) => setComparisonBasemap(e.target.value as any)}
          className="bg-slate-800 border border-slate-700 text-emerald-300 font-bold px-2 py-0.5 rounded text-[11px] outline-none cursor-pointer"
        >
          <option value="ndvi">🌱 Sentinel-2 NDVI Spectral (Vegetation & Pit Loss)</option>
          <option value="wi">💧 Sentinel-2 NDWI (Water & Sump Index)</option>
          <option value="cir">🔥 Color Infrared (B8-B4-B3 CIR)</option>
          <option value="satellite">🛰️ High-Res Satellite</option>
          <option value="topo">🗺️ Topographic Contour</option>
          <option value="osm">🏙️ OpenStreetMap</option>
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
        className="absolute pointer-events-none z-30 w-56 h-56 -ml-28 -mt-28 rounded-full border-4 border-white shadow-[0_8px_36px_rgba(0,0,0,0.7)] overflow-hidden bg-slate-950 flex items-center justify-center"
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
          {comparisonBasemap === 'ndvi' && '🌱 NDVI Spectral Lens · +1.8x'}
          {comparisonBasemap === 'wi' && '💧 NDWI Water Lens · +1.8x'}
          {comparisonBasemap === 'cir' && '🔥 CIR Infrared Lens · +1.8x'}
          {comparisonBasemap === 'satellite' && '🛰️ Satellite Lens · +1.8x'}
          {comparisonBasemap === 'topo' && '🗺️ Topo Lens · +1.8x'}
          {comparisonBasemap === 'osm' && '🏙️ Street Lens · +1.8x'}
        </div>
      </div>
    </>
  )
}
