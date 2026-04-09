import { apiClient } from './client'
import type { GeoJSONFeatureCollection } from '../types'

export const gisApi = {
  async getLayers(): Promise<{ layers: Array<{ layer_type: string; count: number }> }> {
    const { data } = await apiClient.get('/gis/layers/')
    return data
  },

  async getLayerGeoJSON(layerType: string): Promise<GeoJSONFeatureCollection> {
    const { data } = await apiClient.get<GeoJSONFeatureCollection>(
      `/gis/layers/${layerType}/geojson/`
    )
    return data
  },

  async getDGPSPoints(leaseId?: string): Promise<GeoJSONFeatureCollection> {
    const { data } = await apiClient.get<GeoJSONFeatureCollection>('/gis/dgps-points/', {
      params: leaseId ? { lease_id: leaseId } : undefined,
    })
    return data
  },

  async getComplianceReport(leaseId: string): Promise<Record<string, unknown>> {
    const { data } = await apiClient.get(`/gis/compliance-report/${leaseId}/`)
    return data
  },
}
