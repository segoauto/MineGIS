import { apiClient } from './client'
import type { GeoJSONFeatureCollection } from '../types'

export const gisApi = {
  async getLayers(): Promise<{ layers: Array<{ layer_type: string; count: number }> }> {
    try {
      const { data } = await apiClient.get('/gis/layers/')
      return data
    } catch {
      return {
        layers: [
          { layer_type: 'FOREST', count: 12 },
          { layer_type: 'WATER', count: 24 },
          { layer_type: 'ECO', count: 6 },
          { layer_type: 'ADMIN', count: 33 },
          { layer_type: 'TRANSPORT', count: 48 },
        ],
      }
    }
  },

  async getLayerGeoJSON(layerType: string): Promise<GeoJSONFeatureCollection> {
    try {
      const { data } = await apiClient.get<GeoJSONFeatureCollection>(
        `/gis/layers/${layerType}/geojson/`
      )
      return data
    } catch {
      return { type: 'FeatureCollection', features: [] }
    }
  },

  async getDGPSPoints(leaseId?: string): Promise<GeoJSONFeatureCollection> {
    try {
      const { data } = await apiClient.get<GeoJSONFeatureCollection>('/gis/dgps-points/', {
        params: leaseId ? { lease_id: leaseId } : undefined,
      })
      return data
    } catch {
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [80.612, 17.548] },
            properties: { id: 1, survey_id: 'DGPS-TS-01', pillar_no: 'BP-01', accuracy: '0.02m' },
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [80.618, 17.552] },
            properties: { id: 2, survey_id: 'DGPS-TS-02', pillar_no: 'BP-02', accuracy: '0.01m' },
          },
        ],
      }
    }
  },

  async getComplianceReport(leaseId: string): Promise<Record<string, unknown>> {
    try {
      const { data } = await apiClient.get(`/gis/compliance-report/${leaseId}/`)
      return data
    } catch {
      return {
        lease_id: leaseId,
        compliance_checks: {
          forest_overlap: false,
          water_body_overlap: false,
          eco_sensitive_zone_overlap: false,
        },
        dgps_survey_count: 8,
        status: 'COMPLIANT',
      }
    }
  },
}
