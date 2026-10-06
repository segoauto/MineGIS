import { useEffect, useRef, useState } from 'react'
import OlMap from 'ol/Map'
import View from 'ol/View'
import { fromLonLat, toLonLat } from 'ol/proj'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import OSM from 'ol/source/OSM'
import XYZ from 'ol/source/XYZ'
import GeoJSON from 'ol/format/GeoJSON'
import Feature from 'ol/Feature'
import Polygon from 'ol/geom/Polygon'
import Point from 'ol/geom/Point'
import { Circle, Fill, Stroke, Style, Text } from 'ol/style'
import { ScaleLine, FullScreen } from 'ol/control'
import {
  MapPin,
  Layers,
  Leaf,
  Droplets,
  Truck,
  RotateCcw,
  Maximize2,
  ShieldCheck,
  Eye,
} from 'lucide-react'
import { useAuthStore, useMapStore } from '../../store'
import { getUserJurisdiction, getJurisdiction3857Extent } from '../../utils/districts'
import { NDVI_SPECTRAL_GEOJSON, WI_SPECTRAL_GEOJSON } from '../../utils/spatialLayersData'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function DistrictCadastralMap({
  onNavigateToFullMap,
}: {
  onNavigateToFullMap?: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<OlMap | null>(null)
  const { user } = useAuthStore()
  const { vehicles } = useMapStore()

  const jurisdiction = getUserJurisdiction(user?.profile?.district)
  const extent3857 = getJurisdiction3857Extent(jurisdiction)

  const [baseMapType, setBaseMapType] = useState<'osm' | 'satellite'>('osm')
  const [showNdvi, setShowNdvi] = useState(true)
  const [showWi, setShowWi] = useState(true)
  const [showVehicles, setShowVehicles] = useState(true)
  const [activeMandalHover, setActiveMandalHover] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const geojsonFormat = new GeoJSON()

    // 1. Base Layer (OSM)
    const osmLayer = new TileLayer({
      source: new OSM(),
      properties: { id: 'osm' },
      visible: true,
    })

    // Satellite Imagery Layer
    const satLayer = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
      }),
      properties: { id: 'satellite' },
      visible: false,
    })

    // 2. Inverted Mask Layer (Shades out all area outside officer's district)
    const worldRing = [
      [-20037508, -20037508],
      [20037508, -20037508],
      [20037508, 20037508],
      [-20037508, 20037508],
      [-20037508, -20037508],
    ]
    const [minLon, minLat, maxLon, maxLat] = jurisdiction.extent
    const p1 = fromLonLat([minLon, minLat])
    const p2 = fromLonLat([minLon, maxLat])
    const p3 = fromLonLat([maxLon, maxLat])
    const p4 = fromLonLat([maxLon, minLat])
    const districtHole = [p1, p2, p3, p4, p1]

    const maskFeature = new Feature({
      geometry: new Polygon([worldRing, districtHole]),
    })

    const maskLayer = new VectorLayer({
      source: new VectorSource({ features: [maskFeature] }),
      style: new Style({
        fill: new Fill({ color: 'rgba(15, 23, 42, 0.90)' }),
      }),
      zIndex: 100,
    })

    // 3. District Boundary Layer
    const districtVector = new VectorLayer({
      source: new VectorSource({
        url: '/data/gis/districts.geojson',
        format: geojsonFormat,
      }),
      style: (feature) => {
        const featDist = (feature.get('District') as string) || ''
        const cFeat = featDist.toLowerCase().replace(/[^a-z0-9]/g, '')
        const cJur = jurisdiction.name.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (!cFeat.includes(cJur) && !cJur.includes(cFeat)) return []

        return [
          new Style({
            stroke: new Stroke({ color: '#ffffff', width: 4.5 }),
          }),
          new Style({
            fill: new Fill({ color: 'rgba(16, 185, 129, 0.05)' }),
            stroke: new Stroke({ color: '#10B981', width: 3.5 }),
            text: new Text({
              text: `${jurisdiction.name} (${jurisdiction.teluguName})`,
              font: 'bold 15px sans-serif',
              fill: new Fill({ color: '#0f172a' }),
              stroke: new Stroke({ color: '#ffffff', width: 4 }),
              overflow: true,
            }),
          }),
        ]
      },
      zIndex: 110,
    })

    // 4. Mandals Boundary Layer
    const mandalsVector = new VectorLayer({
      source: new VectorSource({
        url: '/data/gis/mandals.geojson',
        format: geojsonFormat,
      }),
      style: (feature) => {
        const featDist = (feature.get('District') as string) || ''
        const cFeat = featDist.toLowerCase().replace(/[^a-z0-9]/g, '')
        const cJur = jurisdiction.name.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (featDist && !cFeat.includes(cJur) && !cJur.includes(cFeat)) return []

        return new Style({
          fill: new Fill({ color: 'rgba(59, 130, 246, 0.04)' }),
          stroke: new Stroke({ color: '#3b82f6', width: 1.5, lineDash: [5, 4] }),
          text: new Text({
            text: (feature.get('Mandal') as string) || '',
            font: '10px sans-serif',
            fill: new Fill({ color: '#1e293b' }),
            stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
          }),
        })
      },
      zIndex: 115,
    })

    // 5. Mining Leases Vector
    const leasesVector = new VectorLayer({
      source: new VectorSource({
        url: '/data/gis/mines_polygons.geojson',
        format: geojsonFormat,
      }),
      style: (feature) => {
        const featDist = (feature.get('District') as string) || (feature.get('district') as string) || ''
        if (featDist) {
          const cFeat = featDist.toLowerCase().replace(/[^a-z0-9]/g, '')
          const cJur = jurisdiction.name.toLowerCase().replace(/[^a-z0-9]/g, '')
          if (!cFeat.includes(cJur) && !cJur.includes(cFeat)) return []
        }
        const mineral = (feature.get('Mineral') as string) || ''
        const isGranite = mineral.toLowerCase().includes('granite')
        const color = isGranite ? '#ea580c' : '#0284c7'

        return [
          new Style({
            fill: new Fill({ color: `${color}88` }),
            stroke: new Stroke({ color: '#ffffff', width: 3 }),
          }),
          new Style({
            stroke: new Stroke({ color: color, width: 2 }),
          }),
        ]
      },
      zIndex: 120,
    })

    // 6. Spectral NDVI Layer
    const ndviVector = new VectorLayer({
      source: new VectorSource({
        features: geojsonFormat.readFeatures(NDVI_SPECTRAL_GEOJSON, {
          featureProjection: 'EPSG:3857',
        }),
      }),
      style: (feature) => {
        const featDist = (feature.get('district') as string) || ''
        if (featDist) {
          const c1 = featDist.toLowerCase().replace(/[^a-z0-9]/g, '')
          const c2 = jurisdiction.name.toLowerCase().replace(/[^a-z0-9]/g, '')
          if (!c1.includes(c2) && !c2.includes(c1)) return []
        }
        const val = Number(feature.get('ndvi') ?? 0.3)
        const color = (feature.get('color') as string) || (val < 0.2 ? '#dc2626' : val < 0.4 ? '#eab308' : '#15803d')
        return new Style({
          fill: new Fill({ color: `${color}88` }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
          text: new Text({
            text: `🌱 NDVI ${val.toFixed(2)}`,
            font: 'bold 10px sans-serif',
            fill: new Fill({ color: '#ffffff' }),
            stroke: new Stroke({ color: '#0f172a', width: 3 }),
          }),
        })
      },
      properties: { id: 'ndvi' },
      visible: true,
      zIndex: 125,
    })

    // 7. Spectral Water Index Layer
    const wiVector = new VectorLayer({
      source: new VectorSource({
        features: geojsonFormat.readFeatures(WI_SPECTRAL_GEOJSON, {
          featureProjection: 'EPSG:3857',
        }),
      }),
      style: (feature) => {
        const featDist = (feature.get('district') as string) || ''
        if (featDist) {
          const c1 = featDist.toLowerCase().replace(/[^a-z0-9]/g, '')
          const c2 = jurisdiction.name.toLowerCase().replace(/[^a-z0-9]/g, '')
          if (!c1.includes(c2) && !c2.includes(c1)) return []
        }
        const val = Number(feature.get('ndwi') ?? 0.0)
        const color = (feature.get('color') as string) || (val > 0.3 ? '#0284c7' : '#38bdf8')
        return new Style({
          fill: new Fill({ color: `${color}88` }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
          text: new Text({
            text: `💧 NDWI ${val > 0 ? '+' : ''}${val.toFixed(2)}`,
            font: 'bold 10px sans-serif',
            fill: new Fill({ color: '#ffffff' }),
            stroke: new Stroke({ color: '#0f172a', width: 3 }),
          }),
        })
      },
      properties: { id: 'wi' },
      visible: true,
      zIndex: 126,
    })

    // 8. Vehicle Vector Layer
    const vehicleSource = new VectorSource()
    const districtVehicles = vehicles.filter(
      (v) =>
        v.last_lon &&
        v.last_lat &&
        v.assigned_district.toLowerCase().includes(jurisdiction.name.toLowerCase())
    )
    districtVehicles.forEach((v) => {
      const feat = new Feature({
        geometry: new Point(fromLonLat([v.last_lon!, v.last_lat!])),
        name: v.vehicle_number,
      })
      vehicleSource.addFeature(feat)
    })

    const vehicleVector = new VectorLayer({
      source: vehicleSource,
      style: new Style({
        image: new Circle({
          radius: 8,
          fill: new Fill({ color: '#10b981' }),
          stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
        }),
        text: new Text({
          text: '🚛 Mineral Transport',
          font: 'bold 10px sans-serif',
          offsetY: -14,
          fill: new Fill({ color: '#0f172a' }),
          stroke: new Stroke({ color: '#ffffff', width: 3 }),
        }),
      }),
      properties: { id: 'vehicles' },
      visible: true,
      zIndex: 130,
    })

    // Construct OpenLayers Map with STRICT Extent Constraint
    const map = new OlMap({
      target: containerRef.current,
      layers: [
        osmLayer,
        satLayer,
        districtVector,
        mandalsVector,
        leasesVector,
        ndviVector,
        wiVector,
        vehicleVector,
        maskLayer,
      ],
      view: new View({
        center: fromLonLat(jurisdiction.center),
        zoom: jurisdiction.defaultZoom,
        minZoom: jurisdiction.minZoom,
        maxZoom: jurisdiction.maxZoom,
        extent: extent3857,
        constrainOnlyCenter: false,
        smoothExtentConstraint: false,
      }),
      controls: [new ScaleLine({ units: 'metric' })],
    })

    map.on('pointermove', (evt) => {
      const hit = map.forEachFeatureAtPixel(evt.pixel, (feat) => feat)
      if (hit) {
        const mandalName = hit.get('Mandal')
        if (mandalName) setActiveMandalHover(mandalName)
      } else {
        setActiveMandalHover(null)
      }
    })

    mapRef.current = map

    return () => {
      map.setTarget(undefined)
      mapRef.current = null
    }
  }, [jurisdiction, extent3857, vehicles])

  // Update base layer visibility
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.getLayers().forEach((l) => {
      const id = l.get('id')
      if (id === 'osm') l.setVisible(baseMapType === 'osm')
      if (id === 'satellite') l.setVisible(baseMapType === 'satellite')
    })
  }, [baseMapType])

  // Update layer toggles
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.getLayers().forEach((l) => {
      const id = l.get('id')
      if (id === 'ndvi') l.setVisible(showNdvi)
      if (id === 'wi') l.setVisible(showWi)
      if (id === 'vehicles') l.setVisible(showVehicles)
    })
  }, [showNdvi, showWi, showVehicles])

  const handleResetBounds = () => {
    if (!mapRef.current) return
    mapRef.current.getView().animate({
      center: fromLonLat(jurisdiction.center),
      zoom: jurisdiction.defaultZoom,
      duration: 600,
    })
  }

  return (
    <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xs">
      {/* Widget Header */}
      <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-slate-100">
                {jurisdiction.name} District Cadastral Spatial Jurisdiction Map
              </span>
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">
                🔒 Strict District Isolation
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Telugu: <span className="text-emerald-400 font-semibold">{jurisdiction.teluguName}</span> • Out-of-district panning disabled
              {activeMandalHover && (
                <span className="ml-2 font-bold text-blue-400 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800">
                  📍 Hovering: Mandal {activeMandalHover}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Quick Map Action Toggles */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setBaseMapType('osm')}
              className={clsx(
                'px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer',
                baseMapType === 'osm' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
              )}
            >
              Street
            </button>
            <button
              onClick={() => setBaseMapType('satellite')}
              className={clsx(
                'px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer',
                baseMapType === 'satellite' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
              )}
            >
              Satellite
            </button>
          </div>

          <button
            onClick={() => setShowNdvi(!showNdvi)}
            className={clsx(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer',
              showNdvi ? 'bg-emerald-950 text-emerald-300 border-emerald-600' : 'bg-slate-800 text-slate-400 border-slate-700'
            )}
            title="Toggle NDVI Vegetation Health Layer"
          >
            <Leaf size={12} />
            <span>NDVI</span>
          </button>

          <button
            onClick={() => setShowWi(!showWi)}
            className={clsx(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer',
              showWi ? 'bg-cyan-950 text-cyan-300 border-cyan-600' : 'bg-slate-800 text-slate-400 border-slate-700'
            )}
            title="Toggle Water Index Layer"
          >
            <Droplets size={12} />
            <span>WI</span>
          </button>

          <button
            onClick={() => setShowVehicles(!showVehicles)}
            className={clsx(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer',
              showVehicles ? 'bg-blue-950 text-blue-300 border-blue-600' : 'bg-slate-800 text-slate-400 border-slate-700'
            )}
            title="Toggle Active District Vehicles"
          >
            <Truck size={12} />
            <span>Vehicles</span>
          </button>

          <button
            onClick={handleResetBounds}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Reset to Official District Center"
          >
            <RotateCcw size={14} />
          </button>

          {onNavigateToFullMap && (
            <button
              onClick={onNavigateToFullMap}
              className="flex items-center gap-1 px-2.5 py-1 bg-gov-600 hover:bg-gov-500 text-white rounded-lg font-bold text-[11px] transition-colors shadow-xs cursor-pointer ml-1"
            >
              <Maximize2 size={12} />
              <span>Full GIS Console</span>
            </button>
          )}
        </div>
      </div>

      {/* OpenLayers Map Canvas Container */}
      <div className="relative w-full h-[380px] bg-slate-950">
        <div ref={containerRef} className="w-full h-full" />

        {/* Tactical Status Corner Watermark */}
        <div className="absolute bottom-2 left-2 bg-slate-900/90 backdrop-blur-xs border border-slate-700 text-slate-300 text-[10px] font-mono px-2 py-1 rounded shadow-md pointer-events-none flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Restricted Extent: {jurisdiction.name} Officer Boundary</span>
        </div>
      </div>
    </div>
  )
}
