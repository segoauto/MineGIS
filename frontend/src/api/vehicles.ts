import { apiClient } from './client'
import { useAuthStore } from '../store'
import { getUserJurisdiction } from '../utils/districts'
import type { Vehicle, VehicleAlert, VehicleLocationPoint, GeoJSONFeatureCollection } from '../types'

import { REAL_NETRADYNE_VEHICLES } from '../data/realVehicles'
export { REAL_NETRADYNE_VEHICLES, REAL_NETRADYNE_VEHICLES as MOCK_VEHICLES }

export const MOCK_ALERTS: VehicleAlert[] = [
  {
    id: 501,
    vehicle_number: 'TG05U2349',
    driver_name: 'Transit Driver (TG-05B)',
    alert_type: 'ROUTE_DEVIATION',
    alert_type_display: 'Corridor Transit Deviation [TG05U2349] (>2.5km off approved Mineral e-Challan route)',
    severity: 'HIGH',
    alert_lon: 80.618,
    alert_lat: 17.552,
    lease_id: 'TS-KGM-COAL-001',
    mine_name: 'Singareni Collieries OCP-IV',
    timestamp: new Date().toISOString(),
    description: 'Vehicle TG05U2349 diverted from NH-365 onto unauthorized village road without valid transit pass.',
    is_resolved: false,
    resolved_by_name: null,
    resolved_at: null,
  },
  {
    id: 502,
    vehicle_number: 'TG05T8099',
    driver_name: 'Transit Driver (TG-05A)',
    alert_type: 'GEOFENCE_ENTRY',
    alert_type_display: 'Geofence Entry [TG05T8099]: River Sand Reach Buffer',
    severity: 'MEDIUM',
    alert_lon: 77.892,
    alert_lat: 18.784,
    lease_id: 'TS-NZB-SAND-022',
    mine_name: 'Godavari River Sand Reach Reach-7',
    timestamp: new Date().toISOString(),
    description: 'Flying squad vehicle TG05T8099 entered Godavari River Sand Reach boundary for random check.',
    is_resolved: true,
    resolved_by_name: 'District Mineral Officer (Nizamabad)',
    resolved_at: new Date().toISOString(),
  },
  {
    id: 503,
    vehicle_number: 'TG07U1889',
    driver_name: 'Transit Driver (TG-07)',
    alert_type: 'GEOFENCE_ENTRY',
    alert_type_display: 'Geofence Entry [TG07U1889]: Ibrahimpatnam Concession Perimeter',
    severity: 'MEDIUM',
    alert_lon: 78.612,
    alert_lat: 17.185,
    lease_id: 'TS-RR-GRN-002',
    mine_name: 'Ibrahimpatnam Multi-Color Granite Concession',
    timestamp: new Date().toISOString(),
    description: 'Flying squad vehicle TG07U1889 checked in at Ibrahimpatnam granite weighbridge.',
    is_resolved: false,
    resolved_by_name: null,
    resolved_at: null,
  },
  {
    id: 504,
    vehicle_number: 'TS12UD9828',
    driver_name: 'Transit Driver (TS-12)',
    alert_type: 'OVERSPEEDING',
    alert_type_display: 'Overspeeding [TS12UD9828]: Mine Loading Area (Speed: 52 km/h, Limit: 30 km/h)',
    severity: 'HIGH',
    alert_lon: 80.598,
    alert_lat: 17.532,
    lease_id: 'TS-KGM-COAL-001',
    mine_name: 'Singareni Collieries OCP-IV',
    timestamp: new Date().toISOString(),
    description: 'Vehicle TS12UD9828 (Coal tipper) exceeded 30 km/h mine pit speed restriction on haul ramp.',
    is_resolved: false,
    resolved_by_name: null,
    resolved_at: null,
  },
]

function getAllRealVehicles(): Vehicle[] {
  return REAL_NETRADYNE_VEHICLES
}

export const vehiclesApi = {
  async list(): Promise<Vehicle[]> {
    const fallbackVehicles = getAllRealVehicles()
    try {
      const { data } = await apiClient.get<{ results: Vehicle[] }>('/vehicles/')
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        const validVehicles = data.results.filter(
          (v) => v.vehicle_number && !v.vehicle_number.includes(' ') && (v.vehicle_number.startsWith('TG') || v.vehicle_number.startsWith('TS'))
        )
        if (validVehicles.length > 0) {
          return validVehicles.map((v) => {
            const enriched = fallbackVehicles.find((ev) => ev.vehicle_number === v.vehicle_number)
            const last_lon = (typeof v.last_lon === 'number' && v.last_lon !== 0) ? v.last_lon : (enriched?.last_lon ?? null)
            const last_lat = (typeof v.last_lat === 'number' && v.last_lat !== 0) ? v.last_lat : (enriched?.last_lat ?? null)
            return {
              ...(enriched || {}),
              ...v,
              last_lon,
              last_lat,
            }
          })
        }
      }
      return fallbackVehicles
    } catch {
      return fallbackVehicles
    }
  },

  async get(id: number): Promise<Vehicle> {
    const fallbackVehicles = getAllRealVehicles()
    try {
      const { data } = await apiClient.get<Vehicle>(`/vehicles/${id}/`)
      return data
    } catch {
      const found = fallbackVehicles.find((v) => v.id === id)
      return found || fallbackVehicles[0] || REAL_NETRADYNE_VEHICLES[0]
    }
  },

  async getLive(): Promise<GeoJSONFeatureCollection> {
    const fallbackVehicles = getAllRealVehicles()
    try {
      const { data } = await apiClient.get<GeoJSONFeatureCollection>('/vehicles/live/')
      return data
    } catch {
      return {
        type: 'FeatureCollection',
        features: fallbackVehicles.map((v) => ({
          type: 'Feature',
          id: v.id,
          geometry: {
            type: 'Point',
            coordinates: [v.last_lon || 78.48, v.last_lat || 17.25],
          },
          properties: { ...v },
        })),
      }
    }
  },

  async getTrails(points = 240): Promise<Record<string, { vehicle_number: string; coordinates: [number, number][] }>> {
    try {
      const { data } = await apiClient.get('/vehicles/trails/', { params: { points } })
      return data || {}
    } catch {
      return {}
    }
  },

  async getHistory(id: number, from: string, to: string): Promise<{
    vehicle_number: string
    points: VehicleLocationPoint[]
    trip_geojson: { type: string; geometry: unknown; properties: Record<string, unknown> }
  }> {
    try {
      const { data } = await apiClient.get(`/vehicles/${id}/history/`, {
        params: { from, to },
      })
      return data
    } catch {
      const v = REAL_NETRADYNE_VEHICLES.find((veh: Vehicle) => veh.id === id) || REAL_NETRADYNE_VEHICLES[0]
      const lon = v.last_lon || 80.615
      const lat = v.last_lat || 17.550
      return {
        vehicle_number: v.vehicle_number,
        points: [
          { id: 1, lon: lon, lat: lat, timestamp: new Date().toISOString(), speed_kmh: v.current_speed_kmh, heading: v.current_heading, altitude: 210, accuracy: 3, engine_on: v.engine_on, harsh_braking: false, harsh_acceleration: false, overspeeding: false },
        ],
        trip_geojson: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [lon, lat],
            ],
          },
          properties: { vehicle_number: v.vehicle_number },
        },
      }
    }
  },

  async getAlerts(id: number): Promise<{ results: VehicleAlert[]; count: number }> {
    try {
      const { data } = await apiClient.get<{ results: VehicleAlert[]; count: number }>(
        `/vehicles/${id}/alerts/`
      )
      return data
    } catch {
      const v = REAL_NETRADYNE_VEHICLES.find((veh: Vehicle) => veh.id === id)
      const alerts = MOCK_ALERTS.filter((a) => a.vehicle_number === v?.vehicle_number)
      return { results: alerts, count: alerts.length }
    }
  },

  async getAllAlerts(params?: {
    severity?: string
    resolved?: boolean
    alert_type?: string
  }): Promise<{ results: VehicleAlert[]; count: number }> {
    try {
      const { data } = await apiClient.get<{ results: VehicleAlert[]; count: number }>(
        '/vehicles/alerts/',
        { params }
      )
      if (data && Array.isArray(data.results)) {
        const cleanResults = data.results.filter(
          (a) => a.vehicle_number && !a.vehicle_number.includes(' ') && (a.vehicle_number.startsWith('TG') || a.vehicle_number.startsWith('TS'))
        )
        return { results: cleanResults, count: cleanResults.length }
      }
      return data
    } catch {
      const scopedVehicles = getAllRealVehicles()
      const allowedNumbers = new Set(scopedVehicles.map((v: Vehicle) => v.vehicle_number))
      let filtered = [...MOCK_ALERTS]
      if (params?.severity) filtered = filtered.filter((a) => a.severity === params.severity)
      if (params?.resolved !== undefined) filtered = filtered.filter((a) => a.is_resolved === params.resolved)
      if (params?.alert_type) filtered = filtered.filter((a) => a.alert_type === params.alert_type)
      return { results: filtered, count: filtered.length }
    }
  },

  async resolveAlert(alertId: number): Promise<{ resolved: boolean }> {
    try {
      const { data } = await apiClient.post<{ resolved: boolean }>(
        `/vehicles/alerts/${alertId}/resolve/`
      )
      return data
    } catch {
      const found = MOCK_ALERTS.find((a) => a.id === alertId)
      if (found) {
        found.is_resolved = true
        found.resolved_at = new Date().toISOString()
        found.resolved_by_name = 'Director of Mines & Geology'
      }
      return { resolved: true }
    }
  },
}
