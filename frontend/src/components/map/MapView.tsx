import { useEffect, useRef, useState } from 'react'
import { useMap } from '../../hooks/useMap'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useMapStore } from '../../store'
import VehicleOverlays from './VehicleOverlays'
import GeofenceAlertPopup from './GeofenceAlertPopup'
import { vehiclesApi } from '../../api/vehicles'
import Draw from 'ol/interaction/Draw'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style'
import { toLonLat } from 'ol/proj'
import { getLength, getArea } from 'ol/sphere'
import toast from 'react-hot-toast'

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { initMap, mapRef, updateTripLayer, clearTripLayer, flyTo } = useMap(containerRef)
  const [mapReady, setMapReady] = useState(false)
  const drawRef = useRef<Draw | null>(null)
  const measureRef = useRef<Draw | null>(null)
  const drawSourceRef = useRef<VectorSource>(new VectorSource())
  const drawLayerRef = useRef<VectorLayer<any>>(new VectorLayer({
    source: drawSourceRef.current,
    style: new Style({
      fill: new Fill({ color: 'rgba(16, 185, 129, 0.15)' }),
      stroke: new Stroke({ color: '#10B981', width: 2.5, lineDash: [6, 3] }),
    }),
    zIndex: 200,
  }))

  const measureSourceRef = useRef<VectorSource>(new VectorSource())
  const measureLayerRef = useRef<VectorLayer<any>>(new VectorLayer({
    source: measureSourceRef.current,
    style: new Style({
      fill: new Fill({ color: 'rgba(37, 99, 235, 0.2)' }),
      stroke: new Stroke({ color: '#2563EB', width: 3, lineDash: [6, 4] }),
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: '#2563EB' }),
        stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
      }),
    }),
    zIndex: 210,
  }))

  // Initialize WebSocket (lives at map level to survive tab switches)
  useWebSocket()

  const {
    cursorCoords, selectedVehicleId, vehicles, selectedLeaseData,
    drawBoundaryMode, setDrawBoundaryMode, openLeaseCreateForm,
    setDrawnPointCoords, activeTool, setActiveTool, setMeasurementResult,
    mapFlyToTarget, setMapFlyToTarget, triggerGeofenceBreachDemo,
    setVehicles,
  } = useMapStore()

  // Load and ensure vehicles are showcased immediately on map mount
  useEffect(() => {
    vehiclesApi.list().then((data) => {
      if (data && data.length > 0) {
        setVehicles(data)
      }
    })
  }, [setVehicles])

  useEffect(() => {
    const cleanup = initMap()
    if (mapRef.current) {
      mapRef.current.addLayer(drawLayerRef.current)
      mapRef.current.addLayer(measureLayerRef.current)
      setMapReady(true)

      // GIS-19: Right-click coordinate finder
      const mapViewport = mapRef.current.getViewport()
      
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault() // prevent default browser context menu
        if (!mapRef.current) return
        
        const coords = mapRef.current.getEventCoordinate(e)
        if (coords) {
          const lonLat = toLonLat(coords)
          const lat = lonLat[1].toFixed(6)
          const lon = lonLat[0].toFixed(6)
          
          toast.success(`Coordinates copied: ${lat}°N, ${lon}°E`, {
            icon: '📍',
            duration: 4000,
            style: { background: '#1E293B', color: '#F8FAFC', border: '1px solid #334155' }
          })
          
          // Optionally copy to clipboard
          navigator.clipboard.writeText(`${lat}, ${lon}`).catch(() => {})
        }
      }

      mapViewport.addEventListener('contextmenu', handleContextMenu)

      return () => {
        if (cleanup) cleanup()
        mapViewport.removeEventListener('contextmenu', handleContextMenu)
      }
    }
    return cleanup
  }, [initMap, mapRef])

  // ── Active Map FlyTo Target (Alert / Demo Zoom) ───────────────────────────
  useEffect(() => {
    if (!mapReady || !mapFlyToTarget) return
    flyTo(mapFlyToTarget.lon, mapFlyToTarget.lat, mapFlyToTarget.zoom ?? 15)
    if (mapFlyToTarget.ping) {
      toast.success(`Map centered on alert target: ${mapFlyToTarget.lat.toFixed(4)}°N, ${mapFlyToTarget.lon.toFixed(4)}°E`, {
        icon: '🎯',
        style: { background: '#0F172A', color: '#38BDF8', border: '1px solid #0284C7' }
      })
    }
    setMapFlyToTarget(null)
  }, [mapFlyToTarget, mapReady, flyTo, setMapFlyToTarget])

  // ── Interactive Distance & Area Measurement Interaction ──────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return
    const map = mapRef.current

    if (activeTool === 'measure_distance' || activeTool === 'measure_area') {
      measureSourceRef.current.clear()
      const draw = new Draw({
        source: measureSourceRef.current,
        type: activeTool === 'measure_distance' ? 'LineString' : 'Polygon',
        style: new Style({
          fill: new Fill({ color: 'rgba(37, 99, 235, 0.25)' }),
          stroke: new Stroke({ color: '#2563EB', width: 3, lineDash: [6, 4] }),
          image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: '#2563EB' }),
            stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
          }),
        }),
      })

      draw.on('drawstart', (evt) => {
        measureSourceRef.current.clear()
        const geom = evt.feature.getGeometry()!
        geom.on('change', () => {
          if (activeTool === 'measure_distance') {
            const length = getLength(geom)
            const unit = length >= 1000 ? 'km' : 'm'
            const formatted = length >= 1000 ? `${(length / 1000).toFixed(2)} km` : `${Math.round(length)} m`
            setMeasurementResult({ type: 'distance', value: length, unit, formatted })
          } else if (activeTool === 'measure_area') {
            const area = getArea(geom)
            const ha = (area / 10000).toFixed(2)
            const sqkm = (area / 1000000).toFixed(3)
            const formatted = `${ha} Ha (${sqkm} km²)`
            setMeasurementResult({ type: 'area', value: area / 10000, unit: 'Ha', formatted })
          }
        })
      })

      draw.on('drawend', (evt) => {
        const geom = evt.feature.getGeometry()!
        if (activeTool === 'measure_distance') {
          const length = getLength(geom)
          const formatted = length >= 1000 ? `${(length / 1000).toFixed(2)} km` : `${Math.round(length)} m`
          toast.success(`Distance measured: ${formatted}`, {
            icon: '📏',
            style: { background: '#1E293B', color: '#93C5FD' },
          })
        } else if (activeTool === 'measure_area') {
          const area = getArea(geom)
          const ha = (area / 10000).toFixed(2)
          const sqkm = (area / 1000000).toFixed(3)
          toast.success(`Area calculated: ${ha} Hectares (${sqkm} km²)`, {
            icon: '📐',
            style: { background: '#1E293B', color: '#93C5FD' },
          })
        }
      })

      map.addInteraction(draw)
      measureRef.current = draw

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setActiveTool(null)
          measureSourceRef.current.clear()
        }
      }
      window.addEventListener('keydown', onKeyDown)

      return () => {
        map.removeInteraction(draw)
        measureRef.current = null
        window.removeEventListener('keydown', onKeyDown)
      }
    } else {
      measureSourceRef.current.clear()
    }
  }, [activeTool, mapReady, mapRef, setActiveTool, setMeasurementResult])

  // ── Draw Boundary Interaction ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return
    const map = mapRef.current

    if (drawBoundaryMode) {
      drawSourceRef.current.clear()
      const draw = new Draw({
        source: drawSourceRef.current,
        type: drawBoundaryMode === 'point' ? 'Point' : 'Polygon',
        freehandCondition: () => false,
        style: new Style({
          fill: new Fill({ color: 'rgba(16, 185, 129, 0.15)' }),
          stroke: new Stroke({ color: '#10B981', width: 2.5, lineDash: [4, 4] }),
        }),
      })

      draw.on('drawend', (evt) => {
        const format = new GeoJSON()
        const geometry = evt.feature.getGeometry()!
        const drawTarget = useMapStore.getState().drawTarget
        
        if (drawTarget === 'geofence') {
          const geojson = format.writeGeometryObject(geometry, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
          })
          useMapStore.getState().setDrawnGeofenceGeoJSON(geojson as object)
          useMapStore.getState().setDrawBoundaryMode(false)
          toast.success('Geofence polygon captured! Ready to configure in Geofence Console.', {
            icon: '🛡️',
            duration: 4000,
          })
        } else if (drawBoundaryMode === 'point' && geometry.getType() === 'Point') {
          // Transform point back to EPSG:4326 for the form inputs
          const coords = (geometry as import('ol/geom/Point').default).clone().transform('EPSG:3857', 'EPSG:4326').getCoordinates()
          setDrawnPointCoords([coords[0], coords[1]])
          setDrawBoundaryMode(false)
        } else {
          const geojson = format.writeGeometryObject(geometry, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
          })
          // Open lease form with drawn boundary (polygon logic)
          openLeaseCreateForm(geojson as object)
        }
      })

      map.addInteraction(draw)
      drawRef.current = draw

      // Esc to cancel
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setDrawBoundaryMode(false)
        }
      }
      window.addEventListener('keydown', onKeyDown)

      return () => {
        map.removeInteraction(draw)
        drawRef.current = null
        drawSourceRef.current.clear()
        window.removeEventListener('keydown', onKeyDown)
      }
    } else {
      drawSourceRef.current.clear()
    }
  }, [drawBoundaryMode, mapReady, mapRef, openLeaseCreateForm, setDrawBoundaryMode, setDrawnPointCoords])

  const prevSelectedVehicleRef = useRef<number | null>(null)

  // Vehicle selection handling: focus on selected vehicle only when selection changes
  useEffect(() => {
    if (!mapReady || !selectedVehicleId) {
      clearTripLayer()
      prevSelectedVehicleRef.current = null
      return
    }

    if (prevSelectedVehicleRef.current !== selectedVehicleId) {
      prevSelectedVehicleRef.current = selectedVehicleId
      clearTripLayer()

      // Fly to selected vehicle
      const vehicle = vehicles.find((v) => v.id === selectedVehicleId)
      if (vehicle && vehicle.last_lon && vehicle.last_lat) {
        flyTo(vehicle.last_lon, vehicle.last_lat, 15)
      }
    }
  }, [selectedVehicleId, mapReady, clearTripLayer, flyTo, vehicles])
  // Fly to selected lease
  useEffect(() => {
    if (mapReady && selectedLeaseData?.centroid_lon && selectedLeaseData?.centroid_lat) {
      flyTo(selectedLeaseData.centroid_lon, selectedLeaseData.centroid_lat, 14)
    }
  }, [selectedLeaseData, mapReady, flyTo])

  // Explicit flyTo target (e.g. from Fleet table or Lease directory)
  useEffect(() => {
    if (mapReady && mapFlyToTarget) {
      flyTo(mapFlyToTarget.lon, mapFlyToTarget.lat, mapFlyToTarget.zoom ?? 15)
      setMapFlyToTarget(null)
    }
  }, [mapFlyToTarget, mapReady, flyTo, setMapFlyToTarget])

  return (
    <div className="relative w-full h-full">
      {/* OpenLayers map container */}
      <div
        ref={containerRef}
        id="ol-map"
        className="w-full h-full"
        style={{ background: '#F1F5F9', cursor: drawBoundaryMode ? 'crosshair' : undefined }}
      />
      
      {/* Map Zoom In (+) / Zoom Out (-) Controls */}
      <div className="absolute top-4 left-4 z-20 flex flex-col rounded-lg bg-white/95 backdrop-blur-xs border border-slate-300 shadow-md overflow-hidden">
        <button
          onClick={() => {
            if (mapRef.current) {
              const view = mapRef.current.getView()
              view.animate({ zoom: (view.getZoom() ?? 8) + 1, duration: 200 })
            }
          }}
          className="w-8 h-8 flex items-center justify-center text-slate-800 hover:bg-slate-100 hover:text-gov-700 font-extrabold text-lg transition-colors border-b border-slate-200 select-none cursor-pointer"
          title="Zoom In (+)"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => {
            if (mapRef.current) {
              const view = mapRef.current.getView()
              view.animate({ zoom: (view.getZoom() ?? 8) - 1, duration: 200 })
            }
          }}
          className="w-8 h-8 flex items-center justify-center text-slate-800 hover:bg-slate-100 hover:text-gov-700 font-extrabold text-lg transition-colors select-none cursor-pointer"
          title="Zoom Out (−)"
          aria-label="Zoom out"
        >
          −
        </button>
      </div>

      {mapReady && mapRef.current && (
        <VehicleOverlays map={mapRef.current} />
      )}

      {/* Geofence Alert Popup directly on Map */}
      <GeofenceAlertPopup />

      {/* Coordinate display overlay */}
      {cursorCoords && (
        <div className="absolute bottom-8 right-4 bg-map-panel/90 backdrop-blur-sm border border-map-border rounded px-3 py-1 text-map-muted font-mono text-xs z-10 pointer-events-none">
          {cursorCoords[1].toFixed(5)}°N &nbsp; {cursorCoords[0].toFixed(5)}°E
        </div>
      )}
    </div>
  )
}
