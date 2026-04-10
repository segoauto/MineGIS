import { apiClient } from './client'
import type {
  MiningLease, PaginatedResponse,
  GeoJSONFeatureCollection, ConflictResult, BufferResult,
} from '../types'

export interface LeaseFilters {
  status?: string
  district?: string
  mineral_type?: string
  search?: string
  ordering?: string
  page?: number
  page_size?: number
}

export interface LeasePayload {
  mine_name: string
  mineral_type: string
  leaseholder_name: string
  leaseholder_contact?: string
  leaseholder_email?: string
  district: string
  mandal?: string
  village?: string
  survey_number?: string
  area_hectares: number
  grant_date: string
  commencement_date: string
  valid_from: string
  valid_till: string
  status: string
  boundary_geojson?: object | null
  royalty_due?: number
}

export const leasesApi = {
  async list(filters: LeaseFilters = {}): Promise<PaginatedResponse<MiningLease>> {
    const { data } = await apiClient.get<PaginatedResponse<MiningLease>>('/leases/', {
      params: filters,
    })
    return data
  },

  async get(id: number | string): Promise<MiningLease> {
    const { data } = await apiClient.get<MiningLease>(`/leases/${id}/`)
    return data
  },

  async create(payload: LeasePayload): Promise<MiningLease> {
    const { data } = await apiClient.post<MiningLease>('/leases/', payload)
    return data
  },

  async update(id: number | string, payload: Partial<LeasePayload>): Promise<MiningLease> {
    const { data } = await apiClient.patch<MiningLease>(`/leases/${id}/`, payload)
    return data
  },

  async delete(id: number | string): Promise<void> {
    await apiClient.delete(`/leases/${id}/`)
  },

  async getGeoJSON(id: number | string): Promise<GeoJSONFeatureCollection> {
    const { data } = await apiClient.get<GeoJSONFeatureCollection>(`/leases/${id}/geojson/`)
    return data
  },

  async getAllGeoJSON(filters: LeaseFilters = {}): Promise<GeoJSONFeatureCollection> {
    const { data } = await apiClient.get<GeoJSONFeatureCollection>('/leases/geojson/all/', {
      params: filters,
    })
    return data
  },

  async search(q: string, limit = 10): Promise<{ results: MiningLease[]; count: number }> {
    const { data } = await apiClient.get<{ results: MiningLease[]; count: number }>(
      '/leases/search/',
      { params: { q, limit } }
    )
    return data
  },

  async getConflicts(id: number | string): Promise<ConflictResult> {
    const { data } = await apiClient.get<ConflictResult>(`/leases/${id}/conflicts/`)
    return data
  },

  async getBuffer(id: number | string, radiusM: number): Promise<BufferResult> {
    const { data } = await apiClient.get<BufferResult>(`/leases/${id}/buffer/`, {
      params: { radius: radiusM },
    })
    return data
  },
}

