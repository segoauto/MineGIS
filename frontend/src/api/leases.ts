import { apiClient } from './client'
import { useAuthStore } from '../store'
import { getUserJurisdiction } from '../utils/districts'
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

import rawMines from '../data/gis/telangana_mines.json'

export const REAL_TELANGANA_MINES: MiningLease[] = rawMines as MiningLease[]

export const MOCK_LEASES: MiningLease[] = [
  ...REAL_TELANGANA_MINES,
  {
    id: 1,
    lease_id: 'TS-KGM-COAL-001',
    mine_name: 'Singareni Collieries OCP-IV',
    mineral_type: 'COAL',
    mineral_display: 'Coal (Grade G-11)',
    leaseholder_name: 'The Singareni Collieries Company Ltd (SCCL)',
    leaseholder_pan: 'AAACT2210K',
    leaseholder_contact: '+91 8744-242301',
    leaseholder_email: 'dgm_mines@scclmines.com',
    state: 'Telangana',
    district: 'Bhadradri Kothagudem',
    mandal: 'Kothagudem',
    village: 'Rudrampur',
    survey_number: 'Sy. No. 412/1 & 415/A',
    area_hectares: 245.5,
    centroid_lon: 80.612,
    centroid_lat: 17.548,
    grant_date: '2016-04-12',
    commencement_date: '2016-08-01',
    valid_from: '2016-08-01',
    valid_till: '2036-07-31',
    status: 'ACTIVE',
    status_display: 'Operational',
    royalty_due: 4250000,
    last_payment_date: '2026-08-15',
    days_remaining: 3589,
    is_expiring_soon: false,
    boundary_geojson: {
      type: 'Polygon',
      coordinates: [[
        [80.605, 17.542],
        [80.619, 17.542],
        [80.619, 17.554],
        [80.605, 17.554],
        [80.605, 17.542],
      ]],
    },
  },
  {
    id: 2,
    lease_id: 'TS-KNR-GRN-014',
    mine_name: 'Karimnagar Tan Brown Granite Quarry',
    mineral_type: 'GRANITE',
    mineral_display: 'Tan Brown Granite',
    leaseholder_name: 'Telangana State Mineral Development Corp (TSMDC)',
    leaseholder_pan: 'AAACT5589L',
    leaseholder_contact: '+91 878-223401',
    leaseholder_email: 'info@tsmdc.telangana.gov.in',
    state: 'Telangana',
    district: 'Karimnagar',
    mandal: 'Manakondur',
    village: 'Kothapalli',
    survey_number: 'Sy. No. 88/2',
    area_hectares: 35.8,
    centroid_lon: 79.128,
    centroid_lat: 18.438,
    grant_date: '2020-02-10',
    commencement_date: '2020-05-15',
    valid_from: '2020-05-15',
    valid_till: '2030-05-14',
    status: 'ACTIVE',
    status_display: 'Operational',
    royalty_due: 780000,
    last_payment_date: '2026-09-01',
    days_remaining: 1320,
    is_expiring_soon: false,
    boundary_geojson: {
      type: 'Polygon',
      coordinates: [[
        [79.122, 18.434],
        [79.134, 18.434],
        [79.134, 18.442],
        [79.122, 18.442],
        [79.122, 18.434],
      ]],
    },
  },
  {
    id: 3,
    lease_id: 'TS-VKB-LST-008',
    mine_name: 'Tandur Cement Grade Limestone Mine',
    mineral_type: 'LIMESTONE',
    mineral_display: 'Industrial Limestone',
    leaseholder_name: 'Deccan Cements Industrial Leases Ltd',
    leaseholder_pan: 'AABBD8819J',
    leaseholder_contact: '+91 8411-272210',
    leaseholder_email: 'operations@tandurcement.in',
    state: 'Telangana',
    district: 'Vikarabad',
    mandal: 'Tandur',
    village: 'Karankote',
    survey_number: 'Sy. No. 204/B',
    area_hectares: 120.0,
    centroid_lon: 77.585,
    centroid_lat: 17.258,
    grant_date: '2018-09-01',
    commencement_date: '2019-01-01',
    valid_from: '2019-01-01',
    valid_till: '2039-12-31',
    status: 'ACTIVE',
    status_display: 'Operational',
    royalty_due: 1450000,
    last_payment_date: '2026-07-28',
    days_remaining: 4837,
    is_expiring_soon: false,
    boundary_geojson: {
      type: 'Polygon',
      coordinates: [[
        [77.578, 17.252],
        [77.592, 17.252],
        [77.592, 17.264],
        [77.578, 17.264],
        [77.578, 17.252],
      ]],
    },
  },
  {
    id: 4,
    lease_id: 'TS-NZB-SAND-022',
    mine_name: 'Godavari River Sand Reach Reach-7',
    mineral_type: 'SAND',
    mineral_display: 'Ordinary River Sand',
    leaseholder_name: 'TSMDC Sand Operations Cell',
    leaseholder_pan: 'AAACT5589L',
    leaseholder_contact: '+91 8462-231190',
    leaseholder_email: 'sandcell@tsmdc.telangana.gov.in',
    state: 'Telangana',
    district: 'Nizamabad',
    mandal: 'Kotgiri',
    village: 'Kalaspet',
    survey_number: 'River Bed Reach-VII',
    area_hectares: 18.2,
    centroid_lon: 77.892,
    centroid_lat: 18.784,
    grant_date: '2024-01-10',
    commencement_date: '2024-02-01',
    valid_from: '2024-02-01',
    valid_till: '2026-11-30',
    status: 'ACTIVE',
    status_display: 'Operational (Seasonal)',
    royalty_due: 210000,
    last_payment_date: '2026-09-10',
    days_remaining: 59,
    is_expiring_soon: true,
    boundary_geojson: {
      type: 'Polygon',
      coordinates: [[
        [77.886, 18.780],
        [77.898, 18.780],
        [77.898, 18.788],
        [77.886, 18.788],
        [77.886, 18.780],
      ]],
    },
  },
  {
    id: 5,
    lease_id: 'TS-RR-ROUG-001',
    mine_name: 'Maheshwaram Road Metal & Rough Stone Quarry',
    mineral_type: 'OTHER',
    mineral_display: 'Road Metal & Stone Aggregates',
    leaseholder_name: 'Sri Venkateshwara Stone Crushers & Infra Ltd',
    leaseholder_pan: 'AABCS4412K',
    leaseholder_contact: '+91 94401 88910',
    leaseholder_email: 'info@svstonecrushers.in',
    state: 'Telangana',
    district: 'Rangareddy',
    mandal: 'Maheshwaram',
    village: 'Mankhal',
    survey_number: 'Sy. No. 342/P & 345',
    area_hectares: 48.5,
    centroid_lon: 78.432,
    centroid_lat: 17.135,
    grant_date: '2019-06-15',
    commencement_date: '2019-09-01',
    valid_from: '2019-09-01',
    valid_till: '2039-08-31',
    status: 'ACTIVE',
    status_display: 'Operational (Permitted)',
    royalty_due: 640000,
    last_payment_date: '2026-08-20',
    days_remaining: 4715,
    is_expiring_soon: false,
    boundary_geojson: {
      type: 'Polygon',
      coordinates: [[
        [78.425, 17.130],
        [78.438, 17.130],
        [78.438, 17.142],
        [78.425, 17.142],
        [78.425, 17.130],
      ]],
    },
  },
  {
    id: 6,
    lease_id: 'TS-RR-GRN-002',
    mine_name: 'Ibrahimpatnam Multi-Color Granite Concession',
    mineral_type: 'GRANITE',
    mineral_display: 'Multi-Color Granite',
    leaseholder_name: 'Telangana State Mineral Development Corp (TSMDC)',
    leaseholder_pan: 'AAACT5589L',
    leaseholder_contact: '+91 8414-223100',
    leaseholder_email: 'tsmdc.rangareddy@telangana.gov.in',
    state: 'Telangana',
    district: 'Rangareddy',
    mandal: 'Ibrahimpatnam',
    village: 'Khanapur',
    survey_number: 'Sy. No. 119/A',
    area_hectares: 62.0,
    centroid_lon: 78.641,
    centroid_lat: 17.192,
    grant_date: '2021-03-10',
    commencement_date: '2021-07-01',
    valid_from: '2021-07-01',
    valid_till: '2031-06-30',
    status: 'ACTIVE',
    status_display: 'Operational',
    royalty_due: 1120000,
    last_payment_date: '2026-09-05',
    days_remaining: 1732,
    is_expiring_soon: false,
    boundary_geojson: {
      type: 'Polygon',
      coordinates: [[
        [78.634, 17.186],
        [78.648, 17.186],
        [78.648, 17.198],
        [78.634, 17.198],
        [78.634, 17.186],
      ]],
    },
  },
  {
    id: 7,
    lease_id: 'TS-RR-QUAR-003',
    mine_name: 'Shadnagar Industrial Quartz & Feldspar Quarry',
    mineral_type: 'OTHER',
    mineral_display: 'Quartz & Feldspar',
    leaseholder_name: 'Sri Krishna Minerals & Ceramics Corp',
    leaseholder_pan: 'AABCK9901M',
    leaseholder_contact: '+91 8548-251230',
    leaseholder_email: 'krishna.minerals@gmail.com',
    state: 'Telangana',
    district: 'Rangareddy',
    mandal: 'Farooqnagar',
    village: 'Elikatta',
    survey_number: 'Sy. No. 89/1',
    area_hectares: 28.4,
    centroid_lon: 78.214,
    centroid_lat: 17.076,
    grant_date: '2022-10-01',
    commencement_date: '2023-01-15',
    valid_from: '2023-01-15',
    valid_till: '2033-01-14',
    status: 'ACTIVE',
    status_display: 'Operational',
    royalty_due: 340000,
    last_payment_date: '2026-07-14',
    days_remaining: 2296,
    is_expiring_soon: false,
    boundary_geojson: {
      type: 'Polygon',
      coordinates: [[
        [78.208, 17.070],
        [78.220, 17.070],
        [78.220, 17.082],
        [78.208, 17.082],
        [78.208, 17.070],
      ]],
    },
  },
  {
    id: 8,
    lease_id: 'TS-WGL-SAND-105',
    mine_name: 'Warangal Sub-Basin Sand Reach-4',
    mineral_type: 'SAND',
    mineral_display: 'River Sand (Reach-IV)',
    leaseholder_name: 'Kakatiya Infrastructure & Mining Consortium',
    leaseholder_pan: 'AAACK4419L',
    leaseholder_contact: '+91 870-244190',
    leaseholder_email: 'compliance@kakatiyainfra.com',
    state: 'Telangana',
    district: 'Warangal',
    mandal: 'Geesugonda',
    village: 'Dharmaram',
    survey_number: 'Sy. No. 402/P',
    area_hectares: 22.5,
    centroid_lon: 79.625,
    centroid_lat: 17.982,
    grant_date: '2026-08-01',
    commencement_date: '2026-10-01',
    valid_from: '2026-10-01',
    valid_till: '2031-09-30',
    status: 'PENDING',
    status_display: 'Pending Approval (Grant Review)',
    royalty_due: 480000,
    last_payment_date: null,
    days_remaining: 1825,
    is_expiring_soon: false,
    boundary_geojson: {
      type: 'Polygon',
      coordinates: [[
        [79.618, 17.976],
        [79.632, 17.976],
        [79.632, 17.988],
        [79.618, 17.988],
        [79.618, 17.976],
      ]],
    },
  },
  {
    id: 9,
    lease_id: 'TS-MBNR-GRN-092',
    mine_name: 'Mahabubnagar Black Galaxy Granite Quarry',
    mineral_type: 'GRANITE',
    mineral_display: 'Black Granite Concession',
    leaseholder_name: 'Palamuru Natural Stones & Granites Pvt Ltd',
    leaseholder_pan: 'AABCP1128M',
    leaseholder_contact: '+91 8542-228901',
    leaseholder_email: 'palamuru.granite@gmail.com',
    state: 'Telangana',
    district: 'Mahabubnagar',
    mandal: 'Jadcherla',
    village: 'Badepalle',
    survey_number: 'Sy. No. 188/3',
    area_hectares: 38.0,
    centroid_lon: 78.145,
    centroid_lat: 16.762,
    grant_date: '2026-09-15',
    commencement_date: '2026-11-01',
    valid_from: '2026-11-01',
    valid_till: '2036-10-31',
    status: 'PENDING',
    status_display: 'Pending Approval (DMO Field Clearance Passed)',
    royalty_due: 750000,
    last_payment_date: null,
    days_remaining: 3652,
    is_expiring_soon: false,
    boundary_geojson: {
      type: 'Polygon',
      coordinates: [[
        [78.138, 16.755],
        [78.152, 16.755],
        [78.152, 16.769],
        [78.138, 16.769],
        [78.138, 16.755],
      ]],
    },
  },
  {
    id: 10,
    lease_id: 'TS-KNR-QUR-011',
    mine_name: 'Huzurabad Road Metal & Ballast Concession',
    mineral_type: 'OTHER',
    mineral_display: 'Road Metal / Stone Ballast',
    leaseholder_name: 'Sri Sai Stone Crushers',
    leaseholder_pan: 'AABCS8801K',
    leaseholder_contact: '+91 878-228910',
    leaseholder_email: 'srisaistone@yahoo.in',
    state: 'Telangana',
    district: 'Karimnagar',
    mandal: 'Huzurabad',
    village: 'Vavilala',
    survey_number: 'Sy. No. 92/1',
    area_hectares: 16.4,
    centroid_lon: 79.388,
    centroid_lat: 18.192,
    grant_date: '2014-04-01',
    commencement_date: '2014-06-01',
    valid_from: '2014-06-01',
    valid_till: '2024-05-31',
    status: 'EXPIRED',
    status_display: 'Expired (Tenure Concluded)',
    royalty_due: 0,
    last_payment_date: '2024-05-20',
    days_remaining: 0,
    is_expiring_soon: false,
    boundary_geojson: {
      type: 'Polygon',
      coordinates: [[
        [79.382, 18.186],
        [79.394, 18.186],
        [79.394, 18.198],
        [79.382, 18.198],
        [79.382, 18.186],
      ]],
    },
  },
]

function getJurisdictionFilteredLeases(): MiningLease[] {
  const user = useAuthStore.getState().user
  const jurisdiction = getUserJurisdiction(user?.profile?.district)
  if (jurisdiction.name === 'Statewide') {
    return MOCK_LEASES
  }

  let existing = MOCK_LEASES.filter(
    (l) => l.district.toLowerCase() === jurisdiction.name.toLowerCase()
  )

  // If no mock leases exist yet for this specific district, generate authentic ones within its boundary
  if (existing.length === 0) {
    const code = jurisdiction.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()
    const [cLon, cLat] = jurisdiction.center

    const generated: MiningLease[] = [
      {
        id: 1000 + Math.floor(Math.random() * 8000),
        lease_id: `TS-${code}-GRN-001`,
        mine_name: `${jurisdiction.name} Granite & Stone Quarry Block-A`,
        mineral_type: 'GRANITE',
        mineral_display: 'Commercial Granite Block',
        leaseholder_name: `Telangana State Mineral Development Corp (${jurisdiction.name})`,
        leaseholder_pan: 'AAACT5589L',
        leaseholder_contact: '+91 800-425-MINE',
        leaseholder_email: `dmo.${jurisdiction.name.toLowerCase()}@mining.telangana.gov.in`,
        state: 'Telangana',
        district: jurisdiction.name,
        mandal: `${jurisdiction.name} Rural`,
        village: 'Kothapalle',
        survey_number: 'Sy. No. 104/A',
        area_hectares: 42.5,
        centroid_lon: cLon,
        centroid_lat: cLat,
        grant_date: '2021-01-10',
        commencement_date: '2021-04-01',
        valid_from: '2021-04-01',
        valid_till: '2031-03-31',
        status: 'ACTIVE',
        status_display: 'Operational',
        royalty_due: 850000,
        last_payment_date: '2026-08-10',
        days_remaining: 1642,
        is_expiring_soon: false,
        boundary_geojson: {
          type: 'Polygon',
          coordinates: [[
            [cLon - 0.015, cLat - 0.010],
            [cLon + 0.015, cLat - 0.010],
            [cLon + 0.015, cLat + 0.010],
            [cLon - 0.015, cLat + 0.010],
            [cLon - 0.015, cLat - 0.010],
          ]],
        },
      },
      {
        id: 1001 + Math.floor(Math.random() * 8000),
        lease_id: `TS-${code}-SND-002`,
        mine_name: `${jurisdiction.name} River Reach Sand De-siltation Zone`,
        mineral_type: 'SAND',
        mineral_display: 'Ordinary River Sand',
        leaseholder_name: 'TSMDC Sand Operations Bureau',
        leaseholder_pan: 'AAACT8821M',
        leaseholder_contact: '+91 800-425-SAND',
        leaseholder_email: `sandops.${jurisdiction.name.toLowerCase()}@telangana.gov.in`,
        state: 'Telangana',
        district: jurisdiction.name,
        mandal: `${jurisdiction.name} North`,
        village: 'Rampur',
        survey_number: 'Sy. No. 210/P',
        area_hectares: 28.0,
        centroid_lon: cLon + 0.02,
        centroid_lat: cLat + 0.015,
        grant_date: '2022-06-15',
        commencement_date: '2022-09-01',
        valid_from: '2022-09-01',
        valid_till: '2028-08-31',
        status: 'ACTIVE',
        status_display: 'Operational',
        royalty_due: 420000,
        last_payment_date: '2026-09-01',
        days_remaining: 700,
        is_expiring_soon: false,
        boundary_geojson: {
          type: 'Polygon',
          coordinates: [[
            [cLon + 0.010, cLat + 0.005],
            [cLon + 0.030, cLat + 0.005],
            [cLon + 0.030, cLat + 0.025],
            [cLon + 0.010, cLat + 0.025],
            [cLon + 0.010, cLat + 0.005],
          ]],
        },
      }
    ]
    MOCK_LEASES.push(...generated)
    existing = generated
  }

  return existing
}

export const leasesApi = {
  async list(filters: LeaseFilters = {}): Promise<PaginatedResponse<MiningLease>> {
    const scopedLeases = getJurisdictionFilteredLeases()
    try {
      const user = useAuthStore.getState().user
      const jurisdiction = getUserJurisdiction(user?.profile?.district)
      const districtParam = jurisdiction.name !== 'Statewide' ? jurisdiction.name : filters.district
      const { data } = await apiClient.get<PaginatedResponse<MiningLease>>('/leases/', {
        params: { ...filters, ...(districtParam ? { district: districtParam } : {}) },
      })
      if (jurisdiction.name !== 'Statewide') {
        const filtered = data.results.filter(
          (l) => l.district.toLowerCase() === jurisdiction.name.toLowerCase()
        )
        return { ...data, count: filtered.length, results: filtered }
      }
      return data
    } catch {
      let filtered = [...scopedLeases]
      if (filters.status) filtered = filtered.filter((l) => l.status === filters.status)
      if (filters.mineral_type) filtered = filtered.filter((l) => l.mineral_type === filters.mineral_type)
      return {
        count: filtered.length,
        next: null,
        previous: null,
        results: filtered,
      }
    }
  },

  async get(id: number | string): Promise<MiningLease> {
    const user = useAuthStore.getState().user
    const jurisdiction = getUserJurisdiction(user?.profile?.district)

    try {
      const { data } = await apiClient.get<MiningLease>(`/leases/${id}/`)
      if (
        jurisdiction.name !== 'Statewide' &&
        data.district.toLowerCase() !== jurisdiction.name.toLowerCase()
      ) {
        throw new Error(`Access Denied: This lease is outside ${jurisdiction.name} district jurisdiction.`)
      }
      return data
    } catch (err: any) {
      if (err?.message?.includes('Access Denied')) throw err

      const scopedLeases = getJurisdictionFilteredLeases()
      const found = scopedLeases.find((l) => String(l.id) === String(id) || l.lease_id === String(id))
      if (found) return found

      // If user requested an out-of-district lease, throw statutory violation
      const anyMatch = MOCK_LEASES.find((l) => String(l.id) === String(id) || l.lease_id === String(id))
      if (anyMatch && jurisdiction.name !== 'Statewide' && anyMatch.district.toLowerCase() !== jurisdiction.name.toLowerCase()) {
        throw new Error(`Access Denied: Lease ${anyMatch.lease_id} (${anyMatch.mine_name}) belongs to ${anyMatch.district} District. Your jurisdiction is restricted to ${jurisdiction.name} District only.`)
      }

      return scopedLeases[0] || MOCK_LEASES[0]
    }
  },

  async create(payload: LeasePayload): Promise<MiningLease> {
    try {
      const { data } = await apiClient.post<MiningLease>('/leases/', payload)
      return data
    } catch {
      const newLease: MiningLease = {
        id: Date.now(),
        lease_id: 'TS-' + (payload.district?.slice(0, 3).toUpperCase() || 'DMG') + '-' + Date.now().toString().slice(-4),
        mine_name: payload.mine_name,
        mineral_type: payload.mineral_type as any,
        leaseholder_name: payload.leaseholder_name,
        leaseholder_contact: payload.leaseholder_contact,
        leaseholder_email: payload.leaseholder_email,
        state: 'Telangana',
        district: payload.district,
        mandal: payload.mandal || 'Mandal HQ',
        village: payload.village || 'Revenue Village',
        survey_number: payload.survey_number || 'Sy. No. New',
        area_hectares: Number(payload.area_hectares) || 10,
        centroid_lon: 79.5,
        centroid_lat: 17.8,
        grant_date: payload.grant_date,
        commencement_date: payload.commencement_date,
        valid_from: payload.valid_from,
        valid_till: payload.valid_till,
        status: (payload.status as any) || 'ACTIVE',
        royalty_due: Number(payload.royalty_due) || 0,
        days_remaining: 365,
        is_expiring_soon: false,
        boundary_geojson: (payload.boundary_geojson as any) || null,
      }
      MOCK_LEASES.unshift(newLease)
      return newLease
    }
  },

  async update(id: number | string, payload: Partial<LeasePayload>): Promise<MiningLease> {
    try {
      const { data } = await apiClient.patch<MiningLease>(`/leases/${id}/`, payload)
      return data
    } catch {
      const found = MOCK_LEASES.find((l) => String(l.id) === String(id) || l.lease_id === String(id))
      if (found) {
        Object.assign(found, payload)
        return found
      }
      return MOCK_LEASES[0]
    }
  },

  async delete(id: number | string): Promise<void> {
    try {
      await apiClient.delete(`/leases/${id}/`)
    } catch {
      const idx = MOCK_LEASES.findIndex((l) => String(l.id) === String(id))
      if (idx !== -1) MOCK_LEASES.splice(idx, 1)
    }
  },

  async approveLease(id: number | string, approvalData?: any): Promise<MiningLease> {
    try {
      const { data } = await apiClient.post<any>(`/leases/${id}/approve/`, approvalData || {})
      const found = MOCK_LEASES.find((l) => String(l.id) === String(id) || l.lease_id === String(id))
      if (found) {
        found.status = 'ACTIVE'
        found.status_display = 'Operational (Approved)'
      }
      return data
    } catch {
      const found = MOCK_LEASES.find((l) => String(l.id) === String(id) || l.lease_id === String(id))
      if (found) {
        found.status = 'ACTIVE'
        found.status_display = 'Operational (Approved)'
        return found
      }
      return MOCK_LEASES[0]
    }
  },

  async bulkImport(leases: Partial<MiningLease>[]): Promise<{
    success: boolean
    created_count: number
    updated_count: number
    failed_count: number
    errors: { row: number; error: string }[]
    imported_leases: any[]
  }> {
    try {
      const { data } = await apiClient.post('/leases/bulk-import/', { leases })
      // Sync into local mock registry as well
      if (data?.imported_leases) {
        leases.forEach((l, idx) => {
          this.syncLocalLease(l, idx)
        })
      }
      return data
    } catch {
      // Standalone / offline fallback
      let created = 0
      let updated = 0
      const imported: any[] = []

      leases.forEach((item, idx) => {
        const synced = this.syncLocalLease(item, idx)
        if (synced.isNew) created++
        else updated++
        imported.push(synced.lease)
      })

      return {
        success: true,
        created_count: created,
        updated_count: updated,
        failed_count: 0,
        errors: [],
        imported_leases: imported,
      }
    }
  },

  async bulkImportFile(file: File): Promise<{
    success: boolean
    created_count: number
    updated_count: number
    failed_count: number
    errors: { row: number; error: string }[]
    imported_leases: any[]
  }> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post('/leases/bulk-import/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  syncLocalLease(l: Partial<MiningLease>, idx = 0): { lease: MiningLease; isNew: boolean } {
    const dist = l.district || 'Karimnagar'
    const code = dist.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'DMG'
    const leaseId = l.lease_id || `TS-${code}-${Date.now().toString().slice(-4)}-${idx + 1}`

    const cLon = l.centroid_lon ?? (78.0 + Math.random() * 2.0)
    const cLat = l.centroid_lat ?? (17.0 + Math.random() * 1.8)
    const area = Number(l.area_hectares) || 25.0

    // Approximate bounding box polygon from area
    const delta = Math.sqrt(area * 10000) / 220000.0
    const boundary = l.boundary_geojson || {
      type: 'Polygon',
      coordinates: [[
        [cLon - delta, cLat - delta],
        [cLon + delta, cLat - delta],
        [cLon + delta, cLat + delta],
        [cLon - delta, cLat + delta],
        [cLon - delta, cLat - delta],
      ]],
    }

    const existingIdx = MOCK_LEASES.findIndex((item) => item.lease_id === leaseId)
    const base: MiningLease = {
      id: existingIdx !== -1 ? MOCK_LEASES[existingIdx].id : Date.now() + Math.floor(Math.random() * 10000),
      lease_id: leaseId,
      mine_name: l.mine_name || 'Cadastral Mining Concession',
      mineral_type: (l.mineral_type as any) || 'GRANITE',
      mineral_display: l.mineral_display || String(l.mineral_type || 'Granite'),
      leaseholder_name: l.leaseholder_name || 'Registered Leaseholder',
      leaseholder_pan: l.leaseholder_pan || 'AAACT5589L',
      leaseholder_contact: l.leaseholder_contact || '+91 800-425-MINE',
      leaseholder_email: l.leaseholder_email || 'info@mines.telangana.gov.in',
      state: 'Telangana',
      district: dist,
      mandal: l.mandal || 'Mandal HQ',
      village: l.village || 'Revenue Village',
      survey_number: l.survey_number || 'Sy. No. ' + (idx + 101),
      area_hectares: area,
      centroid_lon: cLon,
      centroid_lat: cLat,
      boundary_geojson: boundary as any,
      grant_date: l.grant_date || '2022-01-01',
      commencement_date: l.commencement_date || '2022-04-01',
      valid_from: l.valid_from || '2022-04-01',
      valid_till: l.valid_till || '2032-03-31',
      status: (l.status as any) || 'ACTIVE',
      status_display: l.status === 'EXPIRED' ? 'Expired' : l.status === 'PENDING' ? 'Pending Review' : 'Operational',
      royalty_due: Number(l.royalty_due) || 0,
      days_remaining: 2500,
      is_expiring_soon: false,
    }

    if (existingIdx !== -1) {
      MOCK_LEASES[existingIdx] = { ...MOCK_LEASES[existingIdx], ...base }
      return { lease: MOCK_LEASES[existingIdx], isNew: false }
    } else {
      MOCK_LEASES.unshift(base)
      return { lease: base, isNew: true }
    }
  },

  async getGeoJSON(id: number | string): Promise<GeoJSONFeatureCollection> {
    try {
      const { data } = await apiClient.get<GeoJSONFeatureCollection>(`/leases/${id}/geojson/`)
      return data
    } catch {
      const lease = MOCK_LEASES.find((l) => String(l.id) === String(id)) || MOCK_LEASES[0]
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: lease.id,
            geometry: lease.boundary_geojson || null,
            properties: { ...lease },
          },
        ],
      }
    }
  },

  async getAllGeoJSON(filters: LeaseFilters = {}): Promise<GeoJSONFeatureCollection> {
    const scopedLeases = getJurisdictionFilteredLeases()
    try {
      const user = useAuthStore.getState().user
      const jurisdiction = getUserJurisdiction(user?.profile?.district)
      const districtParam = jurisdiction.name !== 'Statewide' ? jurisdiction.name : filters.district
      const { data } = await apiClient.get<GeoJSONFeatureCollection>('/leases/geojson/all/', {
        params: { ...filters, ...(districtParam ? { district: districtParam } : {}) },
      })
      if (jurisdiction.name !== 'Statewide') {
        const filteredFeatures = data.features.filter(
          (f: any) => String(f.properties?.district || '').toLowerCase() === jurisdiction.name.toLowerCase()
        )
        return { ...data, features: filteredFeatures }
      }
      return data
    } catch {
      return {
        type: 'FeatureCollection',
        features: scopedLeases.map((lease) => ({
          type: 'Feature',
          id: lease.id,
          geometry: lease.boundary_geojson || null,
          properties: { ...lease },
        })),
      }
    }
  },

  async search(q: string, limit = 10): Promise<{ results: MiningLease[]; count: number }> {
    const scopedLeases = getJurisdictionFilteredLeases()
    try {
      const { data } = await apiClient.get<{ results: MiningLease[]; count: number }>(
        '/leases/search/',
        { params: { q, limit } }
      )
      const user = useAuthStore.getState().user
      const jurisdiction = getUserJurisdiction(user?.profile?.district)
      if (jurisdiction.name !== 'Statewide') {
        const filtered = data.results.filter(
          (l) => l.district.toLowerCase() === jurisdiction.name.toLowerCase()
        )
        return { results: filtered, count: filtered.length }
      }
      return data
    } catch {
      const filtered = scopedLeases.filter(
        (l) =>
          l.mine_name.toLowerCase().includes(q.toLowerCase()) ||
          l.lease_id.toLowerCase().includes(q.toLowerCase()) ||
          l.district.toLowerCase().includes(q.toLowerCase()) ||
          l.leaseholder_name.toLowerCase().includes(q.toLowerCase())
      ).slice(0, limit)
      return { results: filtered, count: filtered.length }
    }
  },

  async getConflicts(id: number | string): Promise<ConflictResult> {
    try {
      const { data } = await apiClient.get<ConflictResult>(`/leases/${id}/conflicts/`)
      return data
    } catch {
      return {
        has_conflicts: false,
        total_conflicts: 0,
        conflicts: [],
      } as any
    }
  },

  async getBuffer(id: number | string, radiusM: number): Promise<BufferResult> {
    try {
      const { data } = await apiClient.get<BufferResult>(`/leases/${id}/buffer/`, {
        params: { radius: radiusM },
      })
      return data
    } catch {
      return {
        radius_meters: radiusM,
        overlapping_leases: [],
        nearby_forest_zones: [],
        nearby_water_bodies: [],
      } as any
    }
  },
}

