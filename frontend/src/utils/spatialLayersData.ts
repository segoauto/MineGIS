import type { GeoJSONFeatureCollection } from '../types'
import { MOCK_LEASES } from '../api/leases'

// ─── 1. Mining Leases GeoJSON ────────────────────────────────────────────────
export const MINING_LEASES_GEOJSON: GeoJSONFeatureCollection = {
  type: 'FeatureCollection',
  features: MOCK_LEASES.filter((l) => l.boundary_geojson).map((l) => ({
    type: 'Feature',
    id: l.id,
    geometry: l.boundary_geojson as any,
    properties: {
      id: l.id,
      lease_id: l.lease_id,
      mine_name: l.mine_name,
      mineral_type: l.mineral_type,
      mineral_display: l.mineral_display,
      leaseholder_name: l.leaseholder_name,
      district: l.district,
      mandal: l.mandal,
      area_hectares: l.area_hectares,
      status: l.status,
      color:
        l.mineral_type === 'COAL'
          ? '#1e293b'
          : l.mineral_type === 'GRANITE'
          ? '#ea580c'
          : l.mineral_type === 'LIMESTONE'
          ? '#0284c7'
          : l.mineral_type === 'SAND'
          ? '#d97706'
          : '#475569',
    },
  })),
}

// ─── 2. Forest Reserves GeoJSON ──────────────────────────────────────────────
export const FOREST_RESERVES_GEOJSON: GeoJSONFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'FOR-001',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [80.580, 17.580],
            [80.640, 17.585],
            [80.655, 17.540],
            [80.620, 17.525],
            [80.575, 17.550],
            [80.580, 17.580],
          ],
        ],
      },
      properties: {
        name: 'Kothagudem Reserved Teak Forest Block-IV',
        category: 'Reserved Forest (Class-I)',
        district: 'Bhadradri Kothagudem',
        canopy_density: 'Dense (>70%)',
        color: '#15803d',
      },
    },
    {
      type: 'Feature',
      id: 'FOR-002',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [78.580, 17.160],
            [78.630, 17.170],
            [78.640, 17.130],
            [78.590, 17.125],
            [78.580, 17.160],
          ],
        ],
      },
      properties: {
        name: 'Ibrahimpatnam Scrub Forest Buffer',
        category: 'Protected Forest (Buffer)',
        district: 'Rangareddy',
        canopy_density: 'Open Scrub (20-40%)',
        color: '#16a34a',
      },
    },
    {
      type: 'Feature',
      id: 'FOR-003',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [79.080, 18.420],
            [79.150, 18.440],
            [79.160, 18.400],
            [79.090, 18.390],
            [79.080, 18.420],
          ],
        ],
      },
      properties: {
        name: 'Manair Valley Reserved Forest',
        category: 'Protected Riverine Forest',
        district: 'Karimnagar',
        canopy_density: 'Moderate (40-70%)',
        color: '#15803d',
      },
    },
    {
      type: 'Feature',
      id: 'FOR-004',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.520, 17.220],
            [77.610, 17.250],
            [77.620, 17.200],
            [77.540, 17.180],
            [77.520, 17.220],
          ],
        ],
      },
      properties: {
        name: 'Ananthagiri Hills Forest Sanctuary Outer Zone',
        category: 'Eco-Fragile Reserve',
        district: 'Vikarabad',
        canopy_density: 'Semi-Evergreen (60%)',
        color: '#15803d',
      },
    },
  ],
}

// ─── 3. Water Bodies GeoJSON ─────────────────────────────────────────────────
export const WATER_BODIES_GEOJSON: GeoJSONFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'WAT-001',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.860, 18.820],
            [77.920, 18.810],
            [77.950, 18.760],
            [77.910, 18.750],
            [77.850, 18.790],
            [77.860, 18.820],
          ],
        ],
      },
      properties: {
        name: 'Godavari River Basin Reach',
        type: 'Perennial River & Floodplain',
        district: 'Nizamabad',
        buffer_rule: '500m No-Mining Statutory Buffer',
        color: '#0284c7',
      },
    },
    {
      type: 'Feature',
      id: 'WAT-002',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [80.590, 17.510],
            [80.630, 17.515],
            [80.640, 17.490],
            [80.600, 17.485],
            [80.590, 17.510],
          ],
        ],
      },
      properties: {
        name: 'Kinnerasani River Drainage Canal',
        type: 'Tributary Water Course',
        district: 'Bhadradri Kothagudem',
        buffer_rule: '200m Riverine Protection',
        color: '#0284c7',
      },
    },
    {
      type: 'Feature',
      id: 'WAT-003',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [79.520, 16.940],
            [79.580, 16.950],
            [79.590, 16.920],
            [79.530, 16.915],
            [79.520, 16.940],
          ],
        ],
      },
      properties: {
        name: 'Krishna River Basin Irrigation Canal',
        type: 'Main Irrigation Feeder Channel',
        district: 'Nalgonda',
        buffer_rule: '100m Canal Embankment Protection',
        color: '#0284c7',
      },
    },
  ],
}

// ─── 4. Eco-Sensitive / Protected Zones GeoJSON ──────────────────────────────
export const ECO_ZONES_GEOJSON: GeoJSONFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'ECO-001',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [78.410, 17.110],
            [78.470, 17.120],
            [78.480, 17.070],
            [78.420, 17.065],
            [78.410, 17.110],
          ],
        ],
      },
      properties: {
        name: 'Shadnagar Eco-Sensitive Watershed Zone',
        authority: 'Telangana State Pollution Control Board',
        restriction: 'Strictly Restricted: No Heavy Blasting Permitted',
        color: '#f59e0b',
      },
    },
    {
      type: 'Feature',
      id: 'ECO-002',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [80.660, 17.580],
            [80.720, 17.600],
            [80.740, 17.550],
            [80.670, 17.530],
            [80.660, 17.580],
          ],
        ],
      },
      properties: {
        name: 'Kinnerasani Wildlife Sanctuary ESZ Buffer',
        authority: 'Ministry of Environment, Forest and Climate Change',
        restriction: 'Statutory 10km Ecological Buffer Zone',
        color: '#f59e0b',
      },
    },
  ],
}

// ─── 5. Transport Networks (Mineral Transit Corridors) GeoJSON ───────────────
export const TRANSPORT_NETWORKS_GEOJSON: GeoJSONFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'ROU-001',
      geometry: {
        type: 'LineString',
        coordinates: [
          [80.612, 17.548],
          [80.615, 17.550],
          [80.625, 17.560],
          [80.640, 17.575],
          [80.660, 17.590],
          [80.680, 17.600],
        ],
      },
      properties: {
        name: 'NH-365 Kothagudem Coal Express Haul Road',
        pavement: 'Four-Lane Heavy Commercial Asphalt',
        speed_limit: '45 km/h',
        color: '#6366f1',
      },
    },
    {
      type: 'Feature',
      id: 'ROU-002',
      geometry: {
        type: 'LineString',
        coordinates: [
          [78.448, 17.152],
          [78.490, 17.165],
          [78.550, 17.175],
          [78.612, 17.185],
          [78.670, 17.200],
        ],
      },
      properties: {
        name: 'ORR Radial Road 9 (Maheshwaram - Ibrahimpatnam Transit)',
        pavement: 'Six-Lane Heavy Duty Reinforced Highway',
        speed_limit: '60 km/h',
        color: '#6366f1',
      },
    },
    {
      type: 'Feature',
      id: 'ROU-003',
      geometry: {
        type: 'LineString',
        coordinates: [
          [79.130, 18.436],
          [79.145, 18.450],
          [79.170, 18.475],
          [79.200, 18.510],
        ],
      },
      properties: {
        name: 'SH-1 Karimnagar Granite Freight Corridor',
        pavement: 'Dedicated Mineral Transport Corridor',
        speed_limit: '50 km/h',
        color: '#6366f1',
      },
    },
    {
      type: 'Feature',
      id: 'ROU-004',
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.587, 17.260],
          [77.620, 17.280],
          [77.670, 17.300],
          [77.720, 17.320],
        ],
      },
      properties: {
        name: 'Tandur-Vikarabad Cement Grade Freight Line',
        pavement: 'Reinforced Concrete Heavy Route',
        speed_limit: '40 km/h',
        color: '#6366f1',
      },
    },
  ],
}

// ─── 6. DGPS Cadastral Survey Pillars GeoJSON ───────────────────────────────
export const DGPS_SURVEY_GEOJSON: GeoJSONFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'DGPS-001',
      geometry: { type: 'Point', coordinates: [80.612, 17.548] },
      properties: { pillar_no: 'BP-KGM-01', survey_type: 'Dual-Frequency DGPS', accuracy: '0.012 m', lease: 'Singareni Collieries' },
    },
    {
      type: 'Feature',
      id: 'DGPS-002',
      geometry: { type: 'Point', coordinates: [80.618, 17.552] },
      properties: { pillar_no: 'BP-KGM-02', survey_type: 'Dual-Frequency DGPS', accuracy: '0.008 m', lease: 'Singareni Collieries' },
    },
    {
      type: 'Feature',
      id: 'DGPS-003',
      geometry: { type: 'Point', coordinates: [78.612, 17.185] },
      properties: { pillar_no: 'BP-RR-01', survey_type: 'Dual-Frequency DGPS', accuracy: '0.015 m', lease: 'Ibrahimpatnam Granite' },
    },
    {
      type: 'Feature',
      id: 'DGPS-004',
      geometry: { type: 'Point', coordinates: [79.130, 18.436] },
      properties: { pillar_no: 'BP-KNR-01', survey_type: 'Dual-Frequency DGPS', accuracy: '0.010 m', lease: 'Karimnagar Granite' },
    },
    {
      type: 'Feature',
      id: 'DGPS-005',
      geometry: { type: 'Point', coordinates: [77.587, 17.260] },
      properties: { pillar_no: 'BP-VKB-01', survey_type: 'DGPS Geodetic Pillar', accuracy: '0.005 m', lease: 'Tandur Limestone' },
    },
  ],
}

// ─── 7. Electronic Total Station (ETS) Survey Points ─────────────────────────
export const ETS_SURVEY_GEOJSON: GeoJSONFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'ETS-001',
      geometry: { type: 'Point', coordinates: [80.622, 17.545] },
      properties: { pillar_no: 'ETS-KGM-A1', survey_type: 'Electronic Total Station', accuracy: '0.003 m', elevation_m: 214.5 },
    },
    {
      type: 'Feature',
      id: 'ETS-002',
      geometry: { type: 'Point', coordinates: [78.625, 17.195] },
      properties: { pillar_no: 'ETS-RR-B2', survey_type: 'Electronic Total Station', accuracy: '0.004 m', elevation_m: 542.1 },
    },
    {
      type: 'Feature',
      id: 'ETS-003',
      geometry: { type: 'Point', coordinates: [79.145, 18.442] },
      properties: { pillar_no: 'ETS-KNR-C1', survey_type: 'Electronic Total Station', accuracy: '0.003 m', elevation_m: 298.8 },
    },
    {
      type: 'Feature',
      id: 'ETS-004',
      geometry: { type: 'Point', coordinates: [79.575, 16.995] },
      properties: { pillar_no: 'ETS-NLG-D3', survey_type: 'Electronic Total Station', accuracy: '0.005 m', elevation_m: 168.2 },
    },
  ],
}

// ─── 8. IBM / DMG Approved Mine Plans (Pits & Dumps) ─────────────────────────
export const APPROVED_MINE_PLANS_GEOJSON: GeoJSONFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'PLAN-001',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [80.608, 17.558],
            [80.622, 17.562],
            [80.626, 17.545],
            [80.610, 17.540],
            [80.608, 17.558],
          ],
        ],
      },
      properties: {
        plan_id: 'AMP-IBM-2024-KGM-09',
        mine_name: 'Kothagudem Open Cast Coal Quarry Plan',
        approval_authority: 'Indian Bureau of Mines (IBM) & DMG TG',
        approved_production_mtpa: '4.50 MTPA',
        valid_upto: '2029-03-31',
        color: '#10b981',
      },
    },
    {
      type: 'Feature',
      id: 'PLAN-002',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [78.608, 17.195],
            [78.625, 17.200],
            [78.628, 17.182],
            [78.611, 17.178],
            [78.608, 17.195],
          ],
        ],
      },
      properties: {
        plan_id: 'AMP-DMG-2023-RR-44',
        mine_name: 'Ibrahimpatnam Granite Extraction Plan',
        approval_authority: 'Director of Mines & Geology, Telangana',
        approved_production_mtpa: '120,000 CBM/yr',
        valid_upto: '2028-12-31',
        color: '#10b981',
      },
    },
    {
      type: 'Feature',
      id: 'PLAN-003',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [79.558, 16.992],
            [79.575, 16.998],
            [79.578, 16.978],
            [79.560, 16.974],
            [79.558, 16.992],
          ],
        ],
      },
      properties: {
        plan_id: 'AMP-IBM-2025-NLG-12',
        mine_name: 'Miryalaguda Limestone Industrial Pit Plan',
        approval_authority: 'IBM Southern Zone & DMG TG',
        approved_production_mtpa: '2.80 MTPA',
        valid_upto: '2030-06-30',
        color: '#10b981',
      },
    },
  ],
}

// ─── 9. Administrative Boundaries GeoJSON ────────────────────────────────────
export const ADMIN_BOUNDARY_GEOJSON: GeoJSONFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'ADM-KGM',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [80.35, 17.85],
            [80.95, 17.80],
            [80.98, 17.30],
            [80.40, 17.32],
            [80.35, 17.85],
          ],
        ],
      },
      properties: {
        name: 'Bhadradri Kothagudem District Boundary',
        level: 'District Mining Administrative Circle',
        officer: 'Deputy Director of Mines & Geology, Kothagudem',
      },
    },
    {
      type: 'Feature',
      id: 'ADM-RR',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [78.10, 17.55],
            [78.85, 17.50],
            [78.80, 16.90],
            [78.15, 16.95],
            [78.10, 17.55],
          ],
        ],
      },
      properties: {
        name: 'Rangareddy District Boundary',
        level: 'District Mining Administrative Circle',
        officer: 'Assistant Director of Mines & Geology, Rangareddy',
      },
    },
    {
      type: 'Feature',
      id: 'ADM-NLG',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [79.10, 17.25],
            [79.85, 17.20],
            [79.80, 16.70],
            [79.15, 16.75],
            [79.10, 17.25],
          ],
        ],
      },
      properties: {
        name: 'Nalgonda District Boundary',
        level: 'District Mining Administrative Circle',
        officer: 'Assistant Director of Mines & Geology, Nalgonda',
      },
    },
  ],
}

// ─── 10. Sentinel-2 NDVI Spectral Vegetation Index (Telangana Mining Zones) ───
export const NDVI_SPECTRAL_GEOJSON: GeoJSONFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    // Bhadradri Kothagudem Coal / Forest Buffer Zones
    {
      type: 'Feature',
      id: 'NDVI-KGM-01',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [80.605, 17.545],
            [80.635, 17.548],
            [80.640, 17.525],
            [80.610, 17.520],
            [80.605, 17.545],
          ],
        ],
      },
      properties: {
        id: 'NDVI-KGM-01',
        name: 'Kothagudem OC-IV Core Pit - Barren Excavation',
        ndvi: 0.08,
        classification: 'Excavation Core (Devoid of Vegetation)',
        canopy_loss_ha: 38.4,
        change_pct_2yr: -42.8,
        district: 'Bhadradri Kothagudem',
        date: '2024-03-28 (Sentinel-2 L2A)',
        color: '#dc2626',
      },
    },
    {
      type: 'Feature',
      id: 'NDVI-KGM-02',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [80.635, 17.550],
            [80.670, 17.555],
            [80.675, 17.525],
            [80.640, 17.525],
            [80.635, 17.550],
          ],
        ],
      },
      properties: {
        id: 'NDVI-KGM-02',
        name: 'Kothagudem Forest Buffer - Intermediate Canopy',
        ndvi: 0.44,
        classification: 'Moderate Canopy / Buffer Woodland',
        canopy_loss_ha: 4.2,
        change_pct_2yr: -6.5,
        district: 'Bhadradri Kothagudem',
        date: '2024-03-28 (Sentinel-2 L2A)',
        color: '#84cc16',
      },
    },
    {
      type: 'Feature',
      id: 'NDVI-KGM-03',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [80.670, 17.560],
            [80.710, 17.565],
            [80.715, 17.530],
            [80.675, 17.525],
            [80.670, 17.560],
          ],
        ],
      },
      properties: {
        id: 'NDVI-KGM-03',
        name: 'Paloncha Reserve Forest Canopy - Dense Teak Cover',
        ndvi: 0.72,
        classification: 'Dense Reserve Forest (>70% Crown Cover)',
        canopy_loss_ha: 0.0,
        change_pct_2yr: +1.2,
        district: 'Bhadradri Kothagudem',
        date: '2024-03-28 (Sentinel-2 L2A)',
        color: '#15803d',
      },
    },

    // Rangareddy Granite Quarry & Scrub Environs
    {
      type: 'Feature',
      id: 'NDVI-RR-01',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [78.435, 17.145],
            [78.465, 17.148],
            [78.470, 17.125],
            [78.440, 17.120],
            [78.435, 17.145],
          ],
        ],
      },
      properties: {
        id: 'NDVI-RR-01',
        name: 'Turkayamjal Granite Cluster - Exposed Bedrock',
        ndvi: 0.12,
        classification: 'Granite Outcrop / Active Quarry Pit',
        canopy_loss_ha: 14.8,
        change_pct_2yr: -18.4,
        district: 'Rangareddy',
        date: '2024-03-28 (Sentinel-2 L2A)',
        color: '#ea580c',
      },
    },
    {
      type: 'Feature',
      id: 'NDVI-RR-02',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [78.465, 17.150],
            [78.495, 17.152],
            [78.500, 17.130],
            [78.470, 17.125],
            [78.465, 17.150],
          ],
        ],
      },
      properties: {
        id: 'NDVI-RR-02',
        name: 'Turkayamjal Buffer - Semi-Arid Scrub',
        ndvi: 0.28,
        classification: 'Sparse Vegetation / Scrub Regrowth',
        canopy_loss_ha: 1.5,
        change_pct_2yr: -2.1,
        district: 'Rangareddy',
        date: '2024-03-28 (Sentinel-2 L2A)',
        color: '#eab308',
      },
    },

    // Karimnagar Granite Belt
    {
      type: 'Feature',
      id: 'NDVI-KNR-01',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [79.110, 18.430],
            [79.145, 18.435],
            [79.150, 18.405],
            [79.115, 18.400],
            [79.110, 18.430],
          ],
        ],
      },
      properties: {
        id: 'NDVI-KNR-01',
        name: 'Asifnagar Tan Brown Granite Zone - Active Benches',
        ndvi: 0.11,
        classification: 'Active Granite Excavation Bench',
        canopy_loss_ha: 22.1,
        change_pct_2yr: -24.6,
        district: 'Karimnagar',
        date: '2024-03-28 (Sentinel-2 L2A)',
        color: '#dc2626',
      },
    },
    {
      type: 'Feature',
      id: 'NDVI-KNR-02',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [79.145, 18.440],
            [79.180, 18.445],
            [79.185, 18.410],
            [79.150, 18.405],
            [79.145, 18.440],
          ],
        ],
      },
      properties: {
        id: 'NDVI-KNR-02',
        name: 'Lower Manair Catchment Green Belt',
        ndvi: 0.62,
        classification: 'Dense Riparian Vegetation / Agro-Forestry',
        canopy_loss_ha: 0.0,
        change_pct_2yr: +3.4,
        district: 'Karimnagar',
        date: '2024-03-28 (Sentinel-2 L2A)',
        color: '#15803d',
      },
    },

    // Nizamabad / Bodhan Zone
    {
      type: 'Feature',
      id: 'NDVI-NZB-01',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [78.080, 18.670],
            [78.115, 18.675],
            [78.120, 18.645],
            [78.085, 18.640],
            [78.080, 18.670],
          ],
        ],
      },
      properties: {
        id: 'NDVI-NZB-01',
        name: 'Nizamabad Road Metal Quarry Cluster',
        ndvi: 0.14,
        classification: 'Crushed Stone Pit Floor',
        canopy_loss_ha: 8.9,
        change_pct_2yr: -12.1,
        district: 'Nizamabad',
        date: '2024-03-28 (Sentinel-2 L2A)',
        color: '#ea580c',
      },
    },

    // Nalgonda Limestone Basin
    {
      type: 'Feature',
      id: 'NDVI-NLG-01',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [79.820, 16.730],
            [79.860, 16.735],
            [79.865, 16.700],
            [79.825, 16.695],
            [79.820, 16.730],
          ],
        ],
      },
      properties: {
        id: 'NDVI-NLG-01',
        name: 'Mellacheruvu Limestone Pit - Cleared Surface',
        ndvi: 0.09,
        classification: 'Sedimentary Limestone Pit Floor',
        canopy_loss_ha: 31.2,
        change_pct_2yr: -35.0,
        district: 'Nalgonda',
        date: '2024-03-28 (Sentinel-2 L2A)',
        color: '#dc2626',
      },
    },
  ],
}

// ─── 11. Sentinel-2 NDWI / Water Index (Telangana River Sand & Water Bodies) ─
export const WI_SPECTRAL_GEOJSON: GeoJSONFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    // Godavari River Sand Reaches (Bhadradri Kothagudem / Mancherial)
    {
      type: 'Feature',
      id: 'WI-KGM-01',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [80.865, 17.585],
            [80.915, 17.575],
            [80.920, 17.550],
            [80.870, 17.560],
            [80.865, 17.585],
          ],
        ],
      },
      properties: {
        id: 'WI-KGM-01',
        name: 'Godavari River Sand Reach #7 - Water Channel',
        ndwi: 0.54,
        classification: 'Active River Channel / High Water Depth',
        water_risk: 'BUFFER_BREACH',
        water_distance_m: 0,
        district: 'Bhadradri Kothagudem',
        date: '2024-03-28 (Sentinel-2 L2A)',
        color: '#0284c7',
      },
    },
    {
      type: 'Feature',
      id: 'WI-KGM-02',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [80.840, 17.595],
            [80.870, 17.585],
            [80.875, 17.560],
            [80.845, 17.570],
            [80.840, 17.595],
          ],
        ],
      },
      properties: {
        id: 'WI-KGM-02',
        name: 'Bhadrachalam Sand Shoal - High Moisture Sand',
        ndwi: -0.05,
        classification: 'Submerged Sand Bar / Saturated Sand Bed',
        water_risk: 'MEDIUM',
        water_distance_m: 45,
        district: 'Bhadradri Kothagudem',
        date: '2024-03-28 (Sentinel-2 L2A)',
        color: '#38bdf8',
      },
    },
    {
      type: 'Feature',
      id: 'WI-KGM-03',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [80.810, 17.610],
            [80.840, 17.600],
            [80.845, 17.575],
            [80.815, 17.585],
            [80.810, 17.610],
          ],
        ],
      },
      properties: {
        id: 'WI-KGM-03',
        name: 'Burgampahad Stockyard - Dry Sand Bank',
        ndwi: -0.32,
        classification: 'Dry Alluvial Sand / Stockpile Area',
        water_risk: 'LOW',
        water_distance_m: 320,
        district: 'Bhadradri Kothagudem',
        date: '2024-03-28 (Sentinel-2 L2A)',
        color: '#d97706',
      },
    },

    // Karimnagar Lower Manair Dam & Sand Belt
    {
      type: 'Feature',
      id: 'WI-KNR-01',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [79.160, 18.390],
            [79.200, 18.395],
            [79.205, 18.365],
            [79.165, 18.360],
            [79.160, 18.390],
          ],
        ],
      },
      properties: {
        id: 'WI-KNR-01',
        name: 'Lower Manair Dam Water Body',
        ndwi: 0.62,
        classification: 'Open Water Reservoir (>2m depth)',
        water_risk: 'BUFFER_BREACH',
        water_distance_m: 0,
        district: 'Karimnagar',
        date: '2024-03-28 (Sentinel-2 L2A)',
        color: '#0369a1',
      },
    },
    {
      type: 'Feature',
      id: 'WI-KNR-02',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [79.200, 18.400],
            [79.230, 18.405],
            [79.235, 18.375],
            [79.205, 18.370],
            [79.200, 18.400],
          ],
        ],
      },
      properties: {
        id: 'WI-KNR-02',
        name: 'Manair Riverbed Sand Extraction Reach',
        ndwi: -0.12,
        classification: 'Moist Riparian Sand / Seasonal Bed',
        water_risk: 'MEDIUM',
        water_distance_m: 110,
        district: 'Karimnagar',
        date: '2024-03-28 (Sentinel-2 L2A)',
        color: '#38bdf8',
      },
    },

    // Krishna River Sand Reaches (Mahabubnagar / Jogulamba Gadwal)
    {
      type: 'Feature',
      id: 'WI-MBN-01',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.720, 16.380],
            [77.760, 16.375],
            [77.765, 16.350],
            [77.725, 16.355],
            [77.720, 16.380],
          ],
        ],
      },
      properties: {
        id: 'WI-MBN-01',
        name: 'Krishna River Waterway - Jurala Downstream',
        ndwi: 0.58,
        classification: 'Deep River Waterway',
        water_risk: 'BUFFER_BREACH',
        water_distance_m: 0,
        district: 'Mahabubnagar',
        date: '2024-03-28 (Sentinel-2 L2A)',
        color: '#0284c7',
      },
    },
    {
      type: 'Feature',
      id: 'WI-MBN-02',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.760, 16.385],
            [77.790, 16.380],
            [77.795, 16.355],
            [77.765, 16.360],
            [77.760, 16.385],
          ],
        ],
      },
      properties: {
        id: 'WI-MBN-02',
        name: 'Krishna River Sand Reach - Damp Sand Bed',
        ndwi: -0.08,
        classification: 'Damp Sand Bed / Excavation Channel',
        water_risk: 'MEDIUM',
        water_distance_m: 60,
        district: 'Mahabubnagar',
        date: '2024-03-28 (Sentinel-2 L2A)',
        color: '#38bdf8',
      },
    },

    // Nizamabad / Godavari Reach
    {
      type: 'Feature',
      id: 'WI-NZB-01',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.980, 18.910],
            [78.020, 18.905],
            [78.025, 18.880],
            [77.985, 18.885],
            [77.980, 18.910],
          ],
        ],
      },
      properties: {
        id: 'WI-NZB-01',
        name: 'Kandakurthi Godavari-Manjira Confluence',
        ndwi: 0.52,
        classification: 'River Confluence Water Surface',
        water_risk: 'BUFFER_BREACH',
        water_distance_m: 0,
        district: 'Nizamabad',
        date: '2024-03-28 (Sentinel-2 L2A)',
        color: '#0284c7',
      },
    },
  ],
}

