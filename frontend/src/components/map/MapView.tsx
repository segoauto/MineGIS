import { useEffect, useRef, useState } from 'react'
import { useMap } from '../../hooks/useMap'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useMapStore } from '../../store'
import VehicleOverlays from './VehicleOverlays'
import { vehiclesApi } from '../../api/vehicles'
import Draw from 'ol/interaction/Draw'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import { Style, Fill, Stroke } from 'ol/style'
import { toLonLat } from 'ol/proj'
import toast from 'react-hot-toast'

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { initMap, mapRef, updateTripLayer, clearTripLayer, flyTo } = useMap(containerRef)
  const [mapReady, setMapReady] = useState(false)
  const drawRef = useRef<Draw | null>(null)
  const drawSourceRef = useRef<VectorSource>(new VectorSource())
  const drawLayerRef = useRef<VectorLayer<VectorSource>>(new VectorLayer({
    source: drawSourceRef.current,
    style: new Style({
      fill: new Fill({ color: 'rgba(16, 185, 129, 0.15)' }),
      stroke: new Stroke({ color: '#10B981', width: 2.5, lineDash: [6, 3] }),
    }),
    zIndex: 200,
  }))

  // Initialize WebSocket (lives at map level to survive tab switches)
  useWebSocket()

  const {
    cursorCoords, selectedVehicleId, vehicles, selectedLeaseData,
    drawBoundaryMode, setDrawBoundaryMode, openLeaseCreateForm,
    setDrawnPointCoords,
  } = useMapStore()

  useEffect(() => {
    const cleanup = initMap()
    if (mapRef.current) {
      mapRef.current.addLayer(drawLayerRef.current)
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
        cleanup()
        mapViewport.removeEventListener('contextmenu', handleContextMenu)
      }
    }
    return cleanup
  }, [initMap, mapRef])

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
        
        if (drawBoundaryMode === 'point' && geometry.getType() === 'Point') {
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

  // Track history line drawing
  useEffect(() => {
    if (!mapReady || !selectedVehicleId) {
      clearTripLayer()
      return
    }

    const fetchHistory = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const data = await vehiclesApi.getHistory(selectedVehicleId, today, today)
        if (data.trip_geojson?.geometry) {
           // updateTripLayer expects a FeatureCollection, we can wrap the LineString in a FeatureCollection
           const featureCollection = {
             type: 'FeatureCollection',
             features: [data.trip_geojson]
           }
           updateTripLayer(featureCollection as any)
        } else {
           clearTripLayer()
        }
      } catch (err) {
        clearTripLayer()
      }
    }
    fetchHistory()

    // Fly to selected vehicle
    const vehicle = vehicles.find(v => v.id === selectedVehicleId)
    if (vehicle && vehicle.last_lon && vehicle.last_lat) {
      flyTo(vehicle.last_lon, vehicle.last_lat, 15)
    }

  }, [selectedVehicleId, mapReady, clearTripLayer, updateTripLayer, flyTo, vehicles])
  // Fly to selected lease
  useEffect(() => {
    if (mapReady && selectedLeaseData?.centroid_lon && selectedLeaseData?.centroid_lat) {
      flyTo(selectedLeaseData.centroid_lon, selectedLeaseData.centroid_lat, 14)
    }
  }, [selectedLeaseData, mapReady, flyTo])

  return (
    <div className="relative w-full h-full">
      {/* OpenLayers map container */}
      <div
        ref={containerRef}
        id="ol-map"
        className="w-full h-full"
        style={{ background: '#0F172A', cursor: drawBoundaryMode ? 'crosshair' : undefined }}
      />
      
      {mapReady && mapRef.current && (
        <VehicleOverlays map={mapRef.current} />
      )}

      {/* Coordinate display overlay */}
      {cursorCoords && (
        <div className="absolute bottom-8 right-4 bg-map-panel/90 backdrop-blur-sm border border-map-border rounded px-3 py-1 text-map-muted font-mono text-xs z-10 pointer-events-none">
          {cursorCoords[1].toFixed(5)}°N &nbsp; {cursorCoords[0].toFixed(5)}°E
        </div>
      )}
    </div>
  )
}
