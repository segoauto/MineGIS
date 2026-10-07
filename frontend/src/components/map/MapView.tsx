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
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import CircleGeom from 'ol/geom/Circle'
import { fromCircle } from 'ol/geom/Polygon'
import { Style, Fill, Stroke, Circle as CircleStyle, Text } from 'ol/style'
import { toLonLat, fromLonLat } from 'ol/proj'
import { getLength, getArea } from 'ol/sphere'
import { X, MapPin } from 'lucide-react'
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

  // High-visibility mine/lease target highlight layer
  const highlightSourceRef = useRef<VectorSource>(new VectorSource())
  const highlightLayerRef = useRef<VectorLayer<any>>(new VectorLayer({
    source: highlightSourceRef.current,
    zIndex: 250,
  }))

  // Initialize WebSocket (lives at map level to survive tab switches)
  useWebSocket()

  const {
    cursorCoords, selectedVehicleId, vehicles, selectedLeaseData,
    drawBoundaryMode, setDrawBoundaryMode, openLeaseCreateForm,
    setDrawnPointCoords, activeTool, setActiveTool, setMeasurementResult,
    mapFlyToTarget, setMapFlyToTarget, triggerGeofenceBreachDemo,
    setVehicles, selectLease,
  } = useMapStore()

  // Load and ensure vehicles are showcased immediately on map mount with periodic sync
  useEffect(() => {
    let mounted = true
    const fetchVehicles = () => {
      vehiclesApi.list().then((data) => {
        if (mounted && data && data.length > 0) {
          setVehicles(data)
        }
      })
    }
    fetchVehicles()
    const timer = setInterval(fetchVehicles, 15000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [setVehicles])

  useEffect(() => {
    const cleanup = initMap()
    if (mapRef.current) {
      mapRef.current.addLayer(drawLayerRef.current)
      mapRef.current.addLayer(measureLayerRef.current)
      mapRef.current.addLayer(highlightLayerRef.current)
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
      const alertMsg = mapFlyToTarget.message || (
        mapFlyToTarget.vehicleNumber
          ? `🚨 Vehicle ${mapFlyToTarget.vehicleNumber} Alert at ${mapFlyToTarget.lat.toFixed(4)}°N, ${mapFlyToTarget.lon.toFixed(4)}°E`
          : `Map centered on target: ${mapFlyToTarget.lat.toFixed(4)}°N, ${mapFlyToTarget.lon.toFixed(4)}°E`
      )
      toast.success(alertMsg, {
        icon: '🚨',
        style: { background: '#0F172A', color: '#38BDF8', border: '1px solid #0284C7' },
        duration: 5000,
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
          const rawCoords = (geojson as any)?.coordinates?.[0]
          const allVehicles = useMapStore.getState().vehicles || []
          let detectedVeh: any = null

          if (Array.isArray(rawCoords) && rawCoords.length >= 3) {
            const polygonPts = rawCoords.map((c: [number, number]) => ({ lat: c[1], lng: c[0] }))
            // Check containment
            detectedVeh = allVehicles.find((v) => {
              if (v.last_lat == null || v.last_lon == null) return false
              const x = v.last_lon, y = v.last_lat
              let inside = false
              for (let i = 0, j = polygonPts.length - 1; i < polygonPts.length; j = i++) {
                const xi = polygonPts[i].lng, yi = polygonPts[i].lat
                const xj = polygonPts[j].lng, yj = polygonPts[j].lat
                const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
                if (intersect) inside = !inside
              }
              return inside
            })

            // If not strictly inside, check closest vehicle
            if (!detectedVeh && allVehicles.length > 0) {
              const cLat = polygonPts.reduce((acc, p) => acc + p.lat, 0) / polygonPts.length
              const cLng = polygonPts.reduce((acc, p) => acc + p.lng, 0) / polygonPts.length
              let minD = Infinity
              for (const v of allVehicles) {
                if (v.last_lat != null && v.last_lon != null) {
                  const d = Math.hypot(v.last_lat - cLat, v.last_lon - cLng)
                  if (d < minD) {
                    minD = d
                    detectedVeh = v
                  }
                }
              }
              if (minD > 0.08) {
                detectedVeh = null
              }
            }
          }

          if (detectedVeh) {
            useMapStore.getState().selectVehicle(detectedVeh.id)
            toast.success(`Geofence boundary captured for Vehicle ${detectedVeh.vehicle_number} (${detectedVeh.driver_name})! Ready to configure in Geofence Console.`, {
              icon: '🛡️',
              duration: 5000,
            })
          } else {
            toast.success('Geofence polygon captured! Ready to configure in Geofence Console.', {
              icon: '🛡️',
              duration: 4000,
            })
          }

          useMapStore.getState().setDrawnGeofenceGeoJSON(geojson as object)
          useMapStore.getState().setDrawBoundaryMode(false)
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
  // Highlight and focus selected lease on map
  useEffect(() => {
    if (!mapReady) return
    highlightSourceRef.current.clear()

    if (selectedLeaseData && selectedLeaseData.centroid_lon && selectedLeaseData.centroid_lat) {
      const centerCoord = fromLonLat([selectedLeaseData.centroid_lon, selectedLeaseData.centroid_lat])

      // 1. Boundary polygon (either official GeoJSON boundary or derived footprint)
      if (selectedLeaseData.boundary_geojson) {
        try {
          const geojsonFeatures = new GeoJSON().readFeatures(selectedLeaseData.boundary_geojson, {
            featureProjection: 'EPSG:3857',
            dataProjection: 'EPSG:4326',
          })
          geojsonFeatures.forEach((f) => {
            f.setStyle(
              new Style({
                stroke: new Stroke({ color: '#10B981', width: 3.5, lineDash: [8, 4] }),
                fill: new Fill({ color: 'rgba(16, 185, 129, 0.22)' }),
              })
            )
          })
          highlightSourceRef.current.addFeatures(geojsonFeatures)
        } catch (e) {
          console.warn('Could not parse lease boundary GeoJSON:', e)
        }
      }

      // If no features were added from geojson, create circular perimeter buffer around centroid
      if (highlightSourceRef.current.getFeatures().length === 0) {
        const areaHa = Number(selectedLeaseData.area_hectares) || 25
        const radiusMeters = Math.max(250, Math.min(800, Math.sqrt(areaHa * 10000) / 1.5))
        const circleGeom = fromCircle(new CircleGeom(centerCoord, radiusMeters))
        const boundaryFeature = new Feature({ geometry: circleGeom })
        boundaryFeature.setStyle(
          new Style({
            stroke: new Stroke({ color: '#10B981', width: 3.5, lineDash: [8, 4] }),
            fill: new Fill({ color: 'rgba(16, 185, 129, 0.22)' }),
          })
        )
        highlightSourceRef.current.addFeature(boundaryFeature)
      }

      // 2. High-visibility beacon marker & label at mine center
      const markerFeature = new Feature({ geometry: new Point(centerCoord) })
      markerFeature.setStyle([
        // Outer glowing pulse ring
        new Style({
          image: new CircleStyle({
            radius: 18,
            fill: new Fill({ color: 'rgba(16, 185, 129, 0.35)' }),
            stroke: new Stroke({ color: '#10B981', width: 2.5 }),
          }),
        }),
        // Inner beacon center
        new Style({
          image: new CircleStyle({
            radius: 7,
            fill: new Fill({ color: '#059669' }),
            stroke: new Stroke({ color: '#FFFFFF', width: 2.5 }),
          }),
          text: new Text({
            text: `📍 ${selectedLeaseData.mine_name}\n[${selectedLeaseData.lease_id}] · ${selectedLeaseData.status || 'ACTIVE'}`,
            font: 'bold 12px Inter, sans-serif',
            fill: new Fill({ color: '#FFFFFF' }),
            backgroundFill: new Fill({ color: 'rgba(15, 23, 42, 0.92)' }),
            backgroundStroke: new Stroke({ color: '#10B981', width: 2 }),
            padding: [6, 10, 6, 10],
            offsetY: -38,
          }),
        }),
      ])
      highlightSourceRef.current.addFeature(markerFeature)

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
      {/* Target Mine Highlight Active HUD Banner */}
      {selectedLeaseData && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 bg-slate-900/95 text-white px-4 py-2 rounded-full shadow-2xl border border-emerald-500 backdrop-blur-md animate-fade-in">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-semibold">
            Located Mine: <strong className="text-emerald-300">{selectedLeaseData.mine_name}</strong> ({selectedLeaseData.lease_id})
          </span>
          <button
            onClick={() => selectLease(null as any, null as any)}
            className="ml-2 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            title="Clear Mine Highlight"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* OpenLayers map container */}
      <div
        ref={containerRef}
        id="ol-map"
        className="w-full h-full"
        style={{ background: '#F1F5F9', cursor: drawBoundaryMode ? 'crosshair' : undefined }}
      />
      
      {/* Map Zoom In (+) / Zoom Out (-) Controls in Bottom-Left */}
      <div className="absolute bottom-6 left-4 z-20 flex flex-col rounded-lg bg-white/95 backdrop-blur-xs border border-slate-300 shadow-lg overflow-hidden">
        <button
          onClick={() => {
            if (mapRef.current) {
              const view = mapRef.current.getView()
              view.animate({ zoom: (view.getZoom() ?? 8) + 1, duration: 200 })
            }
          }}
          className="w-9 h-9 flex items-center justify-center text-slate-800 hover:bg-slate-100 hover:text-gov-700 font-extrabold text-xl transition-colors border-b border-slate-200 select-none cursor-pointer"
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
          className="w-9 h-9 flex items-center justify-center text-slate-800 hover:bg-slate-100 hover:text-gov-700 font-extrabold text-xl transition-colors select-none cursor-pointer"
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
