import { apiClient } from './client'
import type { Vehicle, VehicleAlert, VehicleLocationPoint, GeoJSONFeatureCollection } from '../types'

export const vehiclesApi = {
  async list(): Promise<Vehicle[]> {
    const { data } = await apiClient.get<{ results: Vehicle[] }>('/vehicles/')
    return data.results
  },

  async get(id: number): Promise<Vehicle> {
    const { data } = await apiClient.get<Vehicle>(`/vehicles/${id}/`)
    return data
  },

  async getLive(): Promise<GeoJSONFeatureCollection> {
    const { data } = await apiClient.get<GeoJSONFeatureCollection>('/vehicles/live/')
    return data
  },

  async getHistory(id: number, from: string, to: string): Promise<{
    vehicle_number: string
    points: VehicleLocationPoint[]
    trip_geojson: { type: string; geometry: unknown; properties: Record<string, unknown> }
  }> {
    const { data } = await apiClient.get(`/vehicles/${id}/history/`, {
      params: { from, to },
    })
    return data
  },

  async getAlerts(id: number): Promise<{ results: VehicleAlert[]; count: number }> {
    const { data } = await apiClient.get<{ results: VehicleAlert[]; count: number }>(
      `/vehicles/${id}/alerts/`
    )
    return data
  },

  async getAllAlerts(params?: {
    severity?: string
    resolved?: boolean
    alert_type?: string
  }): Promise<{ results: VehicleAlert[]; count: number }> {
    const { data } = await apiClient.get<{ results: VehicleAlert[]; count: number }>(
      '/vehicles/alerts/',
      { params }
    )
    return data
  },

  async resolveAlert(alertId: number): Promise<{ resolved: boolean }> {
    const { data } = await apiClient.post<{ resolved: boolean }>(
      `/vehicles/alerts/${alertId}/resolve/`
    )
    return data
  },
}
