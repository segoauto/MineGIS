import { useEffect, useRef, useState } from 'react'
import { useMap } from '../../hooks/useMap'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useMapStore } from '../../store'
import VehicleOverlays from './VehicleOverlays'
import { vehiclesApi } from '../../api/vehicles'

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { initMap, mapRef, updateTripLayer, clearTripLayer, flyTo } = useMap(containerRef)
  const [mapReady, setMapReady] = useState(false)

  // Initialize WebSocket (lives at map level to survive tab switches)
  useWebSocket()

  const { cursorCoords, selectedVehicleId, vehicles, selectedLeaseData } = useMapStore()

  useEffect(() => {
    const cleanup = initMap()
    if (mapRef.current) {
      setMapReady(true)
    }
    return cleanup
  }, [initMap, mapRef])

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
        style={{ background: '#0F172A' }}
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
