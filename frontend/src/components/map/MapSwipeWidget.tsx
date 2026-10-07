import { useState, useRef, useEffect } from 'react'
import { X, Split, ArrowLeftRight, Layers, Eye, Sparkles } from 'lucide-react'
import { useMapStore } from '../../store'
import type { Map as OlMapType } from 'ol'
import OlMap from 'ol/Map'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import TileWMS from 'ol/source/TileWMS'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import { Style, Fill, Stroke, Text } from 'ol/style'
import { NDVI_SPECTRAL_GEOJSON, WI_SPECTRAL_GEOJSON } from '../../utils/spatialLayersData'

interface MapSwipeWidgetProps {
  mainMap: OlMapType | null
  onClose: () => void
}

type ComparisonType = 'ndvi' | 'wi' | 'cir' | 'satellite' | 'topo'

export default function MapSwipeWidget({ mainMap, onClose }: MapSwipeWidgetProps) {
  const { swipePosition, setSwipePosition } = useMapStore()
  const [comparisonLayerType, setComparisonLayerType] = useState<ComparisonType>('ndvi')
  const isDraggingRef = useRef(false)
  const swipeMapContainerRef = useRef<HTMLDivElement>(null)
  const swipeMapRef = useRef<OlMap | null>(null)

  // Initialize secondary synchronized comparison map
  useEffect(() => {
    if (!mainMap || !swipeMapContainerRef.current) return

    // 1. Base Tile Source
    let baseTileSource: any
    let tileClassName = ''

    if (comparisonLayerType === 'topo') {
      baseTileSource = new XYZ({
        url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
        maxZoom: 17,
      })
    } else {
      // High-res satellite imagery as the spectral foundation
      baseTileSource = new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
      })

      if (comparisonLayerType === 'ndvi') {
        tileClassName = 'spectral-ndvi-tiles'
      } else if (comparisonLayerType === 'wi') {
        tileClassName = 'spectral-wi-tiles'
      } else if (comparisonLayerType === 'cir') {
        tileClassName = 'spectral-cir-tiles'
      }
    }

    const baseTile = new TileLayer({
      source: baseTileSource,
      className: tileClassName,
      zIndex: 1,
    })

    // 2. Reference Labels
    const referenceLabels = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
      }),
      opacity: 0.85,
      zIndex: 10,
    })

    // 3. GeoServer NDVI WMS Layer (if configured and running in backend)
    const ndviWMS = new TileLayer({
      source: new TileWMS({
        url: '/geoserver/Mining_WS/wms',
        params: {
          'LAYERS': 'Mining_WS:mining_ndvi_2026',
          'STYLES': 'ndvi_style',
          'TILED': true,
          'FORMAT': 'image/png',
          'TRANSPARENT': true,
        },
        serverType: 'geoserver',
      }),
      visible: comparisonLayerType === 'ndvi',
      opacity: 0.85,
      zIndex: 12,
    })

    // 4. Spectral Vector Overlays (NDVI / WI precise classification polygons)
    const geojsonFormat = new GeoJSON()
    const spectralVectorLayer = new VectorLayer({
      source: new VectorSource({
        features: geojsonFormat.readFeatures(
          comparisonLayerType === 'wi' ? WI_SPECTRAL_GEOJSON : NDVI_SPECTRAL_GEOJSON,
          { featureProjection: 'EPSG:3857' }
        ),
      }),
      visible: comparisonLayerType === 'ndvi' || comparisonLayerType === 'wi',
      style: (feature) => {
        if (comparisonLayerType === 'wi') {
          const val = Number(feature.get('ndwi') ?? 0.0)
          const color = (feature.get('color') as string) || (val > 0.3 ? '#0284c7' : '#38bdf8')
          return new Style({
            fill: new Fill({ color: `${color}99` }),
            stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
            text: new Text({
              text: `💧 NDWI ${val > 0 ? '+' : ''}${val.toFixed(2)} • ${feature.get('classification') || ''}`,
              font: 'bold 11px sans-serif',
              fill: new Fill({ color: '#ffffff' }),
              stroke: new Stroke({ color: '#0f172a', width: 3 }),
              backgroundFill: new Fill({ color: 'rgba(15, 23, 42, 0.9)' }),
              backgroundStroke: new Stroke({ color, width: 1.5 }),
              padding: [2, 6, 2, 6],
            }),
          })
        }

        // NDVI style
        const val = Number(feature.get('ndvi') ?? 0.0)
        const color = (feature.get('color') as string) || (val < 0.2 ? '#dc2626' : val < 0.4 ? '#f59e0b' : '#16a34a')
        return new Style({
          fill: new Fill({ color: `${color}88` }),
          stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
          text: new Text({
            text: `🌱 NDVI ${val.toFixed(2)} • ${feature.get('classification') || ''}`,
            font: 'bold 11px sans-serif',
            fill: new Fill({ color: '#ffffff' }),
            stroke: new Stroke({ color: '#0f172a', width: 3 }),
            backgroundFill: new Fill({ color: 'rgba(15, 23, 42, 0.9)' }),
            backgroundStroke: new Stroke({ color, width: 1.5 }),
            padding: [2, 6, 2, 6],
          }),
        })
      },
      zIndex: 25,
    })

    // 5. Mining Leases Boundary Overlay on comparison map
    const minesOverlay = new VectorLayer({
      source: new VectorSource({
        url: '/data/gis/mines_polygons.geojson',
        format: new GeoJSON(),
      }),
      style: new Style({
        fill: new Fill({ color: 'rgba(255, 255, 255, 0.08)' }),
        stroke: new Stroke({
          color: comparisonLayerType === 'ndvi' ? '#facc15' : '#ef4444',
          width: 2.5,
        }),
      }),
      zIndex: 20,
    })

    // Create synchronized map sharing the exact same View instance!
    const swipeMap = new OlMap({
      target: swipeMapContainerRef.current,
      layers: [baseTile, referenceLabels, ndviWMS, spectralVectorLayer, minesOverlay],
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
      {/* ── SVG Filters for Authentic False-Color Spectral Indices ── */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <defs>
          {/* NDVI Spectral Color Difference Matrix:
              Vegetation (G > R) -> Rich Emerald/Lush Green
              Mine Pits, Quarries, Overburden & Bare Rock (R > G) -> Vivid Crimson Red / Hot Orange
              Water bodies & Reservoirs -> Deep Navy Blue */}
          <filter id="swipe-ndvi-filter" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="
                2.6  -1.5  -0.2  0  0.05
               -1.3   2.8  -0.3  0  0.05
               -0.9  -0.9   2.4  0  0.00
                0     0     0    1  0
              "
            />
            <feComponentTransfer>
              <feFuncR type="linear" slope="1.2" intercept="-0.02" />
              <feFuncG type="linear" slope="1.3" intercept="-0.02" />
              <feFuncB type="linear" slope="1.1" intercept="-0.02" />
            </feComponentTransfer>
          </filter>

          {/* NDWI / Water Index Color Ramp:
              Water, Sump Pits & Canals -> Brilliant Cyan / Electric Blue
              Dry Bedrock & Excavation Pits -> Warm Earth Ochre / Rust */}
          <filter id="swipe-wi-filter" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="
                1.1  -0.3  -0.3  0  0.10
               -0.2   1.3  -0.1  0  0.05
               -1.4  -1.2   3.6  0  0.00
                0     0     0    1  0
              "
            />
            <feComponentTransfer>
              <feFuncR type="linear" slope="1.1" intercept="0" />
              <feFuncG type="linear" slope="1.2" intercept="0" />
              <feFuncB type="linear" slope="1.4" intercept="-0.05" />
            </feComponentTransfer>
          </filter>

          {/* Color Infrared CIR (Bands 8-4-3):
              Photosynthetic Canopy -> Radiant Ruby Red / Crimson
              Mine Pits, Quarries, Sand & Granite -> Crisp Cyan / White
              Water -> Deep Navy / Black */}
          <filter id="swipe-cir-filter" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="
               -0.2   2.3  -0.1  0  0.05
                1.9  -0.2  -0.1  0  0.05
               -0.6  -0.6   2.2  0  0.00
                0     0     0    1  0
              "
            />
          </filter>
        </defs>
      </svg>

      {/* Embedded CSS for Filter Classes */}
      <style>{`
        .spectral-ndvi-tiles {
          filter: url(#swipe-ndvi-filter) saturate(1.4) contrast(1.15);
        }
        .spectral-wi-tiles {
          filter: url(#swipe-wi-filter) saturate(1.5) contrast(1.2);
        }
        .spectral-cir-tiles {
          filter: url(#swipe-cir-filter) saturate(1.5) contrast(1.15);
        }
      `}</style>

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
        <span className="flex items-center gap-1">
          <Sparkles size={12} className="text-yellow-400" />
          <span>Swipe Spectral Mode:</span>
        </span>
        <select
          value={comparisonLayerType}
          onChange={(e) => setComparisonLayerType(e.target.value as any)}
          className="bg-slate-800 border border-slate-700 text-sky-300 font-bold px-2 py-0.5 rounded text-[11px] outline-none cursor-pointer"
        >
          <option value="ndvi">🌱 Sentinel-2 NDVI Spectral (Vegetation & Pit Loss)</option>
          <option value="wi">💧 Sentinel-2 NDWI (Water & Sump Pit Index)</option>
          <option value="cir">🔥 Color Infrared (B8-B4-B3 CIR)</option>
          <option value="satellite">🛰️ High-Resolution True Color Satellite</option>
          <option value="topo">🗺️ Topographic Elevation (OpenTopoMap)</option>
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
      <div className="absolute top-16 left-6 z-20 bg-slate-900/90 text-white px-2.5 py-1.5 rounded text-[11px] font-bold border border-slate-700 shadow-xl pointer-events-none flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>
          ◄ Left:{' '}
          {comparisonLayerType === 'ndvi' && '🌱 NDVI Spectral Overlay (Vegetation & Mine Pits)'}
          {comparisonLayerType === 'wi' && '💧 NDWI Water & Sump Retention Index'}
          {comparisonLayerType === 'cir' && '🔥 Color Infrared (CIR / NIR 8-4-3)'}
          {comparisonLayerType === 'satellite' && '🛰️ High-Res Satellite + Leases'}
          {comparisonLayerType === 'topo' && '🗺️ OpenTopoMap Terrain'}
        </span>
      </div>

      <div className="absolute top-16 right-6 z-20 bg-slate-900/90 text-white px-2.5 py-1.5 rounded text-[11px] font-bold border border-slate-700 shadow-xl pointer-events-none flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
        <span>Right: Standard Map Base ►</span>
      </div>

      {/* On-Screen Color Scale Legend Bar */}
      {(comparisonLayerType === 'ndvi' || comparisonLayerType === 'wi' || comparisonLayerType === 'cir') && (
        <div className="absolute bottom-6 left-6 z-25 bg-slate-900/95 text-white px-3 py-2 rounded-lg border border-slate-700/80 shadow-2xl backdrop-blur-md text-[10px] pointer-events-none flex flex-col gap-1.5 animate-fade-in max-w-sm">
          <div className="font-bold flex items-center justify-between text-slate-300">
            <span>
              {comparisonLayerType === 'ndvi' && '🌱 NDVI Spectral Index Ramp'}
              {comparisonLayerType === 'wi' && '💧 NDWI Water & Sump Index Ramp'}
              {comparisonLayerType === 'cir' && '🔥 False-Color Infrared (CIR)'}
            </span>
            <span className="text-[9px] text-slate-400 font-mono">Sentinel-2 MSI</span>
          </div>

          {comparisonLayerType === 'ndvi' && (
            <>
              <div
                className="h-2.5 w-64 rounded shadow-inner"
                style={{
                  background: 'linear-gradient(to right, #7f1d1d, #dc2626, #ea580c, #facc15, #84cc16, #16a34a, #14532d)',
                }}
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>-0.20 (Core Pit / Barren)</span>
                <span>0.30 (Scrub)</span>
                <span>+0.85 (Canopy)</span>
              </div>
            </>
          )}

          {comparisonLayerType === 'wi' && (
            <>
              <div
                className="h-2.5 w-64 rounded shadow-inner"
                style={{
                  background: 'linear-gradient(to right, #78350f, #d97706, #fde047, #38bdf8, #0284c7, #1e3a8a)',
                }}
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>-0.40 (Dry Bedrock / Benches)</span>
                <span>0.00</span>
                <span>+0.65 (Sump Pools)</span>
              </div>
            </>
          )}

          {comparisonLayerType === 'cir' && (
            <div className="flex items-center gap-3 text-[9px] pt-0.5">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                <span>Vegetation / Canopy</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-300" />
                <span>Quarry Excavations</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-900 border border-white" />
                <span>Water</span>
              </span>
            </div>
          )}
        </div>
      )}

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
