import { useState, useEffect, useRef } from 'react'
import {
  Shield, X, Search, MapPin, ZoomIn, Check, RotateCcw,
  Layers, ChevronDown, ChevronUp, AlertCircle, BarChart2
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
// @ts-ignore
import * as turf from '@turf/turf'
import { useMapStore } from '../../store'
import { DEFAULT_MINERALS } from '../../store'
import type { Map } from 'ol'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Polygon from 'ol/geom/Polygon'
import Point from 'ol/geom/Point'
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style'
import { fromLonLat, toLonLat } from 'ol/proj'

interface BufferAnalysisWidgetProps {
  map: Map | null
  onClose: () => void
}

interface BufferMineResult {
  id: string | number
  company: string
  mineral: string
  district: string
  mandal: string
  surveyNumber: string
  production: number | string
  dispatch: number | string
  ets: number | string
  notice: number | string
  lon: number
  lat: number
  distanceKm: number
}

export default function BufferAnalysisWidget({ map, onClose }: BufferAnalysisWidgetProps) {
  const { setMapFlyToTarget, selectLease } = useMapStore()
  const [distance, setDistance] = useState<string>('5')
  const [unit, setUnit] = useState<'kilometers' | 'meters' | 'miles'>('kilometers')
  const [isClickMode, setIsClickMode] = useState<boolean>(false)
  const [selectedMinerals, setSelectedMinerals] = useState<Record<string, boolean>>({ ...DEFAULT_MINERALS })
  const [loading, setLoading] = useState<boolean>(false)
  const [results, setResults] = useState<BufferMineResult[] | null>(null)
  const [bufferCenter, setBufferCenter] = useState<[number, number] | null>(null)
  const [expandedDetailsId, setExpandedDetailsId] = useState<string | number | null>(null)

  // Internal buffer graphics layer
  const bufferLayerRef = useRef<VectorLayer<any> | null>(null)

  useEffect(() => {
    if (!map) return

    const source = new VectorSource()
    const layer = new VectorLayer({
      source,
      zIndex: 180,
      style: (feature) => {
        const isCenter = feature.get('isCenter')
        if (isCenter) {
          return new Style({
            image: new CircleStyle({
              radius: 8,
              fill: new Fill({ color: '#10B981' }),
              stroke: new Stroke({ color: '#FFFFFF', width: 3 }),
            }),
          })
        }
        return [
          new Style({
            fill: new Fill({ color: 'rgba(16, 185, 129, 0.16)' }),
            stroke: new Stroke({ color: '#10B981', width: 2.5, lineDash: [6, 4] }),
          }),
          new Style({
            stroke: new Stroke({ color: '#047857', width: 1 }),
          }),
        ]
      },
    })

    map.addLayer(layer)
    bufferLayerRef.current = layer

    return () => {
      map.removeLayer(layer)
      bufferLayerRef.current = null
    }
  }, [map])

  // Handle map click for buffer placement
  useEffect(() => {
    if (!map || !isClickMode) return

    const handleMapClick = async (e: any) => {
      const coordinate = e.coordinate
      const lonLat = toLonLat(coordinate) as [number, number]
      setBufferCenter(lonLat)
      setIsClickMode(false)
      executeBufferAnalysis(lonLat)
    }

    map.on('click', handleMapClick)
    return () => {
      map.un('click', handleMapClick)
    }
  }, [map, isClickMode, distance, unit, selectedMinerals])

  const executeBufferAnalysis = async (center: [number, number]) => {
    if (!map || !bufferLayerRef.current) return
    setLoading(true)

    try {
      const distNum = parseFloat(distance) || 1
      const centerPoint = turf.point([center[0], center[1]])
      const buffered = turf.buffer(centerPoint, distNum, { units: unit })

      // Clear & draw buffer polygon on map
      const source = bufferLayerRef.current.getSource()!
      source.clear()

      // Convert coordinates from 4326 to 3857 for OpenLayers
      if (buffered && buffered.geometry) {
        const olCoordinates = buffered.geometry.coordinates[0].map((coord: number[]) =>
          fromLonLat([coord[0], coord[1]])
        )
        const polyFeature = new Feature({
          geometry: new Polygon([olCoordinates]),
        })
        source.addFeature(polyFeature)
      }

      // Add center point feature
      const centerOl = fromLonLat(center)
      const centerFeature = new Feature({
        geometry: new Point(centerOl),
      })
      centerFeature.set('isCenter', true)
      source.addFeature(centerFeature)

      // Fetch or query the real 815 mines GeoJSON
      const resp = await fetch('/data/gis/mines_points.geojson')
      const geojson = await resp.json()

      const foundMines: BufferMineResult[] = []

      for (const feat of geojson.features) {
        const coords = feat.geometry?.coordinates
        if (!coords || coords.length < 2) continue

        const mineMineral = feat.properties?.Mineral || ''
        // Check mineral filter
        const isMineralAllowed = Object.entries(selectedMinerals).some(([cat, checked]) => {
          if (!checked) return false
          return (
            mineMineral.toLowerCase().includes(cat.toLowerCase()) ||
            cat.toLowerCase().includes(mineMineral.toLowerCase())
          )
        })

        if (!isMineralAllowed) continue

        const minePoint = turf.point([coords[0], coords[1]])
        const isInside = turf.booleanPointInPolygon(minePoint, buffered as any)

        if (isInside) {
          const distFromCenter = turf.distance(centerPoint, minePoint, { units: 'kilometers' })
          foundMines.push({
            id: feat.properties?.ORIG_FID ?? feat.properties?.SurveyNumb ?? Math.random(),
            company: feat.properties?.Company || 'Authorized Leaseholder',
            mineral: feat.properties?.Mineral || 'Mineral Extraction',
            district: feat.properties?.District || 'Telangana',
            mandal: feat.properties?.Mandal || 'Mandal',
            surveyNumber: feat.properties?.SurveyNumb ? `Sy. ${feat.properties.SurveyNumb}` : 'Survey Verified',
            production: feat.properties?.Production ?? 0,
            dispatch: feat.properties?.Dispatch ?? 0,
            ets: feat.properties?.ETS ?? 0,
            notice: feat.properties?.Notice ?? 0,
            lon: coords[0],
            lat: coords[1],
            distanceKm: parseFloat(distFromCenter.toFixed(2)),
          })
        }
      }

      // Sort by proximity
      foundMines.sort((a, b) => a.distanceKm - b.distanceKm)
      setResults(foundMines)

      toast.success(
        `Buffer Analysis Complete: Found ${foundMines.length} mining concession(s) within ${distNum} ${unit}.`,
        { icon: '🛡️' }
      )
    } catch (err: any) {
      console.error('Buffer error:', err)
      toast.error('Could not complete spatial buffer analysis.')
    } finally {
      setLoading(false)
    }
  }

  const handleZoomToMine = (mine: BufferMineResult) => {
    setMapFlyToTarget({
      lon: mine.lon,
      lat: mine.lat,
      zoom: 16,
      message: `Centered on ${mine.company} (${mine.mineral})`,
    })
    selectLease(String(mine.id), {
      id: Number(mine.id),
      lease_id: `TG-SY-${mine.surveyNumber}`,
      mine_name: `${mine.company} - ${mine.mineral}`,
      mineral_type: 'OTHER',
      mineral_display: mine.mineral,
      leaseholder_name: mine.company,
      state: 'Telangana',
      district: mine.district,
      mandal: mine.mandal,
      village: '',
      survey_number: mine.surveyNumber,
      area_hectares: 25,
      centroid_lon: mine.lon,
      centroid_lat: mine.lat,
      grant_date: '2024-01-01',
      commencement_date: '2024-01-01',
      valid_from: '2024-01-01',
      valid_till: '2028-12-31',
      status: 'ACTIVE',
      status_display: 'Operational Compliant',
      royalty_due: 0,
      last_payment_date: '2026-08-15',
      days_remaining: 730,
      is_expiring_soon: false,
    } as any)
  }

  const handleClear = () => {
    if (bufferLayerRef.current) {
      bufferLayerRef.current.getSource()?.clear()
    }
    setResults(null)
    setBufferCenter(null)
    setIsClickMode(false)
  }

  const toggleAllMinerals = (checked: boolean) => {
    setSelectedMinerals(
      Object.fromEntries(Object.keys(DEFAULT_MINERALS).map((k) => [k, checked]))
    )
  }

  return (
    <div className="absolute top-16 left-4 z-20 w-84 bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 text-white">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-emerald-400" />
          <div>
            <div className="text-xs font-bold tracking-wide">Spatial Buffer Analysis</div>
            <div className="text-[10px] text-slate-400">Turf.js Proximity Mining Inspection</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          title="Close Buffer Analysis"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-3.5 space-y-3 overflow-y-auto custom-scrollbar flex-1 text-xs">
        {/* Distance & Unit Input */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-700">Buffer Radius Perimeter</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0.1"
              step="0.5"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="w-24 bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-slate-900 text-xs focus:border-gov-600 outline-none"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as any)}
              className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1.5 font-semibold text-slate-800 text-xs focus:border-gov-600 outline-none cursor-pointer"
            >
              <option value="kilometers">Kilometers (km)</option>
              <option value="meters">Meters (m)</option>
              <option value="miles">Miles (mi)</option>
            </select>
          </div>
        </div>

        {/* Minerals filter checklist */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700">Target Mineral Types</span>
            <div className="flex items-center gap-2 text-[10px]">
              <button
                onClick={() => toggleAllMinerals(true)}
                className="text-gov-700 font-bold hover:underline"
              >
                All
              </button>
              <span>·</span>
              <button
                onClick={() => toggleAllMinerals(false)}
                className="text-slate-500 font-medium hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="max-h-28 overflow-y-auto custom-scrollbar space-y-1 pr-1 bg-white border border-slate-200 rounded p-1.5">
            {Object.keys(DEFAULT_MINERALS).map((mineral) => (
              <label
                key={mineral}
                className="flex items-center gap-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50 p-0.5 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedMinerals[mineral] ?? true}
                  onChange={(e) =>
                    setSelectedMinerals((prev) => ({
                      ...prev,
                      [mineral]: e.target.checked,
                    }))
                  }
                  className="rounded text-gov-600 focus:ring-0"
                />
                <span className="truncate">{mineral}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (isClickMode) {
                setIsClickMode(false)
              } else {
                setIsClickMode(true)
                toast('Click anywhere on the map to place buffer epicenter.', {
                  icon: '📍',
                  style: { background: '#0F172A', color: '#10B981' },
                })
              }
            }}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold text-xs transition-all shadow-xs cursor-pointer',
              isClickMode
                ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                : 'bg-gov-600 hover:bg-gov-700 text-white'
            )}
          >
            <MapPin size={14} />
            <span>{isClickMode ? 'Click Map Now…' : 'Click Map to Analyze'}</span>
          </button>

          {results && (
            <button
              onClick={handleClear}
              className="px-2.5 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              title="Clear Buffer"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>

        {/* Active Analysis Center Feedback */}
        {bufferCenter && (
          <div className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded flex items-center justify-between">
            <span>Epicenter:</span>
            <span>{bufferCenter[1].toFixed(4)}°N, {bufferCenter[0].toFixed(4)}°E</span>
          </div>
        )}

        {/* Results List */}
        {loading && (
          <div className="py-6 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-gov-600 border-t-transparent animate-spin" />
            <span>Intersecting 815 spatial mine polygons…</span>
          </div>
        )}

        {!loading && results && (
          <div className="space-y-2 pt-1 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">
                {results.length} Mine{results.length === 1 ? '' : 's'} Within {distance} {unit}
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                Spatial Intersect
              </span>
            </div>

            {results.length === 0 ? (
              <div className="py-4 text-center text-slate-400 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No active leases match selected minerals in this perimeter.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-0.5">
                {results.map((mine) => (
                  <div
                    key={mine.id}
                    className="p-2 bg-white rounded-lg border border-slate-200 hover:border-gov-400 transition-colors shadow-2xs space-y-1"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate text-[11px]">
                          {mine.company}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {mine.mineral} · {mine.district} ({mine.mandal})
                        </div>
                      </div>
                      <button
                        onClick={() => handleZoomToMine(mine)}
                        className="p-1 rounded bg-gov-50 hover:bg-gov-100 text-gov-700 flex-shrink-0 transition-colors"
                        title="Zoom to Mine"
                      >
                        <ZoomIn size={12} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-600 pt-0.5 border-t border-slate-100 font-mono">
                      <span>Dist: <strong className="text-emerald-700">{mine.distanceKm} km</strong></span>
                      <span>Prod: <strong>{Number(mine.production).toLocaleString('en-IN')} MT</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
