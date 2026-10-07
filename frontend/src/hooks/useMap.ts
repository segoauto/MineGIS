import { useEffect, useRef, useCallback } from 'react'
import type { Map } from 'ol'
import OlMap from 'ol/Map'
import View from 'ol/View'
import { fromLonLat, toLonLat } from 'ol/proj'
import TileLayer from 'ol/layer/Tile'
import LayerGroup from 'ol/layer/Group'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import OSM from 'ol/source/OSM'
import XYZ from 'ol/source/XYZ'
import TileWMS from 'ol/source/TileWMS'
import GeoJSON from 'ol/format/GeoJSON'
import Select from 'ol/interaction/Select'
import { pointerMove, click } from 'ol/events/condition'
import { defaults as defaultInteractions } from 'ol/interaction'
import { Circle, Fill, Stroke, Style, Text } from 'ol/style'
import { ScaleLine, OverviewMap, MousePosition, Attribution, FullScreen } from 'ol/control'
import { createStringXY } from 'ol/coordinate'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import Polygon from 'ol/geom/Polygon'
import toast from 'react-hot-toast'
import { useMapStore, useAuthStore } from '../store'
import { getUserJurisdiction, getJurisdiction3857Extent, isCoordinateInJurisdiction } from '../utils/districts'
import type { GeoJSONFeatureCollection, LeaseStatus, VehicleProperties, MiningLease, Vehicle } from '../types'

import {
  MINING_LEASES_GEOJSON,
  FOREST_RESERVES_GEOJSON,
  WATER_BODIES_GEOJSON,
  ECO_ZONES_GEOJSON,
  TRANSPORT_NETWORKS_GEOJSON,
  DGPS_SURVEY_GEOJSON,
  ETS_SURVEY_GEOJSON,
  APPROVED_MINE_PLANS_GEOJSON,
  ADMIN_BOUNDARY_GEOJSON,
  NDVI_SPECTRAL_GEOJSON,
  WI_SPECTRAL_GEOJSON,
} from '../utils/spatialLayersData'
import { MOCK_LEASES } from '../api/leases'

const GEOSERVER_URL = import.meta.env?.VITE_GEOSERVER_URL && import.meta.env.VITE_GEOSERVER_URL !== 'http://localhost:8080/geoserver' 
  ? import.meta.env.VITE_GEOSERVER_URL 
  : '/geoserver'

// Status → color mapping for lease layer styling
const LEASE_COLORS: Record<LeaseStatus, string> = {
  ACTIVE:     '#2563A8',
  EXPIRED:    '#6B7280',
  PENDING:    '#CA8A04',
  SUSPENDED:  '#DC2626',
  SURRENDERED:'#7C3AED',
}

export function useMap(containerRef: React.RefObject<HTMLDivElement>) {
  const mapRef = useRef<Map | null>(null)
  const vehicleSourceRef = useRef<VectorSource>(new VectorSource())
  const tripSourceRef = useRef<VectorSource>(new VectorSource())

  const {
    baseLayer, layerVisibility, layerOpacity,
    selectLease, selectVehicle, setZoom, setCenter, setCursorCoords,
    mapRefreshTrigger,
  } = useMapStore()

  // ─── Initialize map ───────────────────────────────────────────────────────
  const initMap = useCallback(() => {
    if (!containerRef.current || mapRef.current) return

    const user = useAuthStore.getState().user
    const jurisdiction = getUserJurisdiction(user?.profile?.district)
    const isRestricted = jurisdiction.name !== 'Statewide'
    const extent3857 = getJurisdiction3857Extent(jurisdiction)

    // ── Base layers ─────────────────────────────────────────────────────────
    const osmLayer = new TileLayer({
      source: new OSM(),
      properties: { id: 'osm' },
      visible: true,
    })

    const satelliteLayer = new LayerGroup({
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            maxZoom: 19,
            attributions: '© Esri, Maxar, Earthstar Geographics, and the GIS User Community',
          }),
        }),
        new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
            maxZoom: 19,
            attributions: '© Esri, Garmin, FAO, NOAA',
          }),
        })
      ],
      properties: { id: 'satellite' },
      visible: false,
    })

    const terrainLayer = new TileLayer({
      source: new XYZ({
        url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
        maxZoom: 17,
        attributions: '© OpenTopoMap (CC-BY-SA), © OpenStreetMap contributors',
      }),
      properties: { id: 'terrain' },
      visible: false,
    })

    const lightLayer = new TileLayer({
      source: new XYZ({
        url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png',
        maxZoom: 20,
        attributions: '&copy; Stadia Maps, &copy; OpenStreetMap contributors',
      }),
      properties: { id: 'carto_light' },
      visible: false,
    })

    // ── GeoServer WMS layers ─────────────────────────────────────────────────
    const makeTileWMS = (
      layerName: string,
      id: string,
      visible: boolean,
      opacity: number,
      cqlFilter?: string,
      styleName?: string
    ) =>
      new TileLayer({
        source: new TileWMS({
          url: `${GEOSERVER_URL}/minegis_ts/wms`,
          params: {
            LAYERS: `minegis_ts:${layerName}`,
            TILED: true,
            FORMAT: 'image/png',
            TRANSPARENT: true,
            VERSION: '1.1.1',
            STYLES: styleName ? styleName : '',
            ...(cqlFilter ? { CQL_FILTER: cqlFilter } : {}),
          },
          serverType: 'geoserver',
          transition: 0,
        }),
        properties: { id },
        visible: visible,
        opacity: opacity,
      })

    const miningLeasesWMS = makeTileWMS('mining_leases', 'mining_leases', true, 0.85, undefined, 'mining_leases_style')
    const forestWMS = makeTileWMS('spatial_layers', 'forest', true, 0.7, "layer_type='FOREST'", 'forest_style')
    const waterWMS = makeTileWMS('spatial_layers', 'water', true, 0.7, "layer_type='WATER'", 'water_style')
    const ecoWMS = makeTileWMS('spatial_layers', 'eco', false, 0.6, "layer_type='ECO'", 'eco_style')
    const dgpsWMS = makeTileWMS('dgps_survey_points', 'dgps_survey_points', false, 1.0, undefined, 'dgps_style')
    const etsWMS = makeTileWMS('ets_survey_points', 'ets_survey_points', false, 1.0, undefined, 'ets_style')
    const approvedPlansWMS = makeTileWMS('approved_mine_plans', 'approved_mine_plans', false, 1.0, undefined, 'approved_plan_style')
    const adminWMS = makeTileWMS('spatial_layers', 'admin_boundary', false, 0.8, "layer_type='ADMIN'", 'admin_style')
    const transportWMS = makeTileWMS('spatial_layers', 'transport_networks', false, 1.0, "layer_type='TRANSPORT'", '')

    // ── Direct Real Telangana GIS Map Layers (From shapefiles in /data/gis/) ──
    const geojsonFormat = new GeoJSON()

    // 0a. State Boundary (hidden if officer is restricted to single district)
    const stateVector = new VectorLayer({
      source: new VectorSource({
        url: '/data/gis/telangana_state.geojson',
        format: geojsonFormat,
      }),
      style: [
        new Style({
          stroke: new Stroke({ color: '#ffffff', width: 5 }),
        }),
        new Style({
          fill: new Fill({ color: 'rgba(30, 58, 138, 0.04)' }),
          stroke: new Stroke({ color: '#1e3a8a', width: 3.5 }),
        }),
      ],
      properties: { id: 'state_boundary' },
      visible: isRestricted ? false : (layerVisibility['state_boundary'] ?? true),
      zIndex: 5,
    })

    // 0b. Districts Boundary (Filtered: only shows assigned district if restricted)
    const districtsVector = new VectorLayer({
      source: new VectorSource({
        url: '/data/gis/districts.geojson',
        format: geojsonFormat,
      }),
      style: (feature) => {
        const distName = (feature.get('District') as string) || ''
        if (isRestricted) {
          const cFeat = distName.toLowerCase().replace(/[^a-z0-9]/g, '')
          const cJur = jurisdiction.name.toLowerCase().replace(/[^a-z0-9]/g, '')
          if (!cFeat.includes(cJur) && !cJur.includes(cFeat)) {
            return [] // Hide other 32 districts!
          }
        }
        return [
          new Style({
            stroke: new Stroke({ color: '#ffffff', width: 3.5 }),
          }),
          new Style({
            fill: new Fill({ color: 'rgba(0, 0, 0, 0.02)' }),
            stroke: new Stroke({ color: '#000000', width: isRestricted ? 3.5 : 2.2 }),
            text: new Text({
              text: distName,
              font: 'bold 13px sans-serif',
              fill: new Fill({ color: '#000000' }),
              stroke: new Stroke({ color: '#ffffff', width: 3.5 }),
              overflow: true,
            }),
          }),
        ]
      },
      properties: { id: 'districts' },
      visible: layerVisibility['districts'] ?? true,
      zIndex: 10,
    })

    // 0c. Mandals Boundary (Filtered: only shows mandals within assigned district if restricted)
    const mandalsVector = new VectorLayer({
      source: new VectorSource({
        url: '/data/gis/mandals.geojson',
        format: geojsonFormat,
      }),
      style: (feature) => {
        const featDist = (feature.get('District') as string) || ''
        if (isRestricted && featDist) {
          const cFeat = featDist.toLowerCase().replace(/[^a-z0-9]/g, '')
          const cJur = jurisdiction.name.toLowerCase().replace(/[^a-z0-9]/g, '')
          if (!cFeat.includes(cJur) && !cJur.includes(cFeat)) {
            return [] // Hide mandals outside officer district
          }
        }
        return new Style({
          fill: new Fill({ color: 'rgba(0, 0, 0, 0.01)' }),
          stroke: new Stroke({ color: '#000000', width: 1.5, lineDash: [5, 4] }),
          text: new Text({
            text: (feature.get('Mandal') as string) || '',
            font: '10px sans-serif',
            fill: new Fill({ color: '#000000' }),
            stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
            overflow: false,
          }),
        })
      },
      properties: { id: 'mandals' },
      visible: layerVisibility['mandals'] ?? false,
      zIndex: 12,
      minZoom: 10,
    })

    // Mineral color helper matching Directorate of Mines SLD with high-saturation vibrancy
    const getMineralColor = (mineral: string) => {
      const m = (mineral || '').toLowerCase()
      if (m.includes('black granite')) return '#f43f5e' // Vibrant Rose Red
      if (m.includes('colour granite')) return '#e11d48' // Deep Crimson
      if (m.includes('granite')) return '#ea580c' // Fire Orange
      if (m.includes('limestone slabs')) return '#f59e0b' // Amber Gold
      if (m.includes('limestone')) return '#10b981' // Vivid Emerald Green
      if (m.includes('quartz & feldspar')) return '#8b5cf6' // Vivid Purple
      if (m.includes('quartz')) return '#ef4444' // Laser Red
      if (m.includes('gravel')) return '#06b6d4' // Electric Cyan
      if (m.includes('laterite')) return '#d946ef' // Neon Magenta
      if (m.includes('mosaic')) return '#ec4899' // Hot Pink
      if (m.includes('road')) return '#2563eb' // Electric Blue
      return '#3b82f6'
    }

    // 1. 815 Real Telangana Mining Leases (Polygons) - Prominent, High-Visibility Styling
    const miningLeasesVector = new VectorLayer({
      source: new VectorSource({
        url: '/data/gis/mines_polygons.geojson',
        format: geojsonFormat,
      }),
      style: (feature, resolution) => {
        if (isRestricted) {
          const featDist = (feature.get('District') as string) || (feature.get('district') as string) || ''
          if (featDist) {
            const cFeat = featDist.toLowerCase().replace(/[^a-z0-9]/g, '')
            const cJur = jurisdiction.name.toLowerCase().replace(/[^a-z0-9]/g, '')
            if (!cFeat.includes(cJur) && !cJur.includes(cFeat)) {
              return []
            }
          }
        }
        const mineral = (feature.get('Mineral') as string) || (feature.get('mineral_display') as string) || ''
        const company = (feature.get('Company') as string) || (feature.get('mine_name') as string) || ''
        const survey = (feature.get('SurveyNumb') as string) || ''
        const color = getMineralColor(mineral)

        const styles: Style[] = [
          // White backing stroke for high contrast against satellite or dark imagery
          new Style({
            fill: new Fill({ color: `${color}66` }), // ~40% rich saturated fill
            stroke: new Stroke({ color: '#ffffff', width: 4.5 }),
          }),
          // Sharp vivid mineral border
          new Style({
            stroke: new Stroke({ color: color, width: 3 }),
          }),
        ]

        // Centroid marker for small polygons when zoomed out, so human eye spots EVERY lease across the state!
        if (resolution > 50) {
          styles.push(
            new Style({
              geometry: (f) => {
                const geom = f.getGeometry()
                if (geom && (geom.getType() === 'Polygon' || geom.getType() === 'MultiPolygon')) {
                  return (geom as any).getInteriorPoint()
                }
                return geom
              },
              image: new Circle({
                radius: 7,
                fill: new Fill({ color: color }),
                stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
              }),
            })
          )
        }

        // Readable survey number and company pill when zoomed in
        if (resolution <= 50) {
          styles.push(
            new Style({
              text: new Text({
                text: `${survey ? `Sy.${survey} • ` : ''}${company ? company.slice(0, 22) : mineral}`,
                font: 'bold 11px sans-serif',
                fill: new Fill({ color: '#0f172a' }),
                stroke: new Stroke({ color: '#ffffff', width: 3.5 }),
                backgroundFill: new Fill({ color: 'rgba(255, 255, 255, 0.92)' }),
                backgroundStroke: new Stroke({ color: color, width: 1.5 }),
                padding: [2, 5, 2, 5],
                overflow: true,
              }),
            })
          )
        }

        return styles
      },
      properties: { id: 'mining_leases' },
      visible: layerVisibility['mining_leases'] ?? true,
      opacity: layerOpacity['mining_leases'] ?? 0.95,
      zIndex: 25,
    })

    // 1b. Real Mining Points - Prominent Radiant Markers
    const minesPointsVector = new VectorLayer({
      source: new VectorSource({
        url: '/data/gis/mines_points.geojson',
        format: geojsonFormat,
      }),
      style: (feature, resolution) => {
        if (isRestricted) {
          const featDist = (feature.get('District') as string) || (feature.get('district') as string) || ''
          if (featDist) {
            const cFeat = featDist.toLowerCase().replace(/[^a-z0-9]/g, '')
            const cJur = jurisdiction.name.toLowerCase().replace(/[^a-z0-9]/g, '')
            if (!cFeat.includes(cJur) && !cJur.includes(cFeat)) {
              return []
            }
          }
        }
        const mineral = (feature.get('Mineral') as string) || ''
        const company = (feature.get('Company') as string) || ''
        const survey = (feature.get('SurveyNumb') as string) || ''
        const color = getMineralColor(mineral)

        const isFar = resolution > 120

        const styles: Style[] = [
          // 1. Radiant glow / beacon ring (clearly visible to human eye without zooming)
          new Style({
            image: new Circle({
              radius: isFar ? 13 : 17,
              fill: new Fill({ color: `${color}38` }),
              stroke: new Stroke({ color: color, width: 2, lineDash: [3, 3] }),
            }),
          }),
          // 2. High-contrast solid marker core
          new Style({
            image: new Circle({
              radius: isFar ? 7.5 : 10,
              fill: new Fill({ color: color }),
              stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
            }),
          }),
          // 3. Center contrasting dot
          new Style({
            image: new Circle({
              radius: isFar ? 2.5 : 4,
              fill: new Fill({ color: '#ffffff' }),
            }),
          }),
        ]

        // 4. Tactical label pill when zoomed into district/mandal
        if (!isFar) {
          styles.push(
            new Style({
              text: new Text({
                text: `${survey ? `Sy.${survey} ` : ''}${company ? company.slice(0, 18) : mineral}`,
                font: 'bold 11px sans-serif',
                offsetY: -18,
                fill: new Fill({ color: '#0f172a' }),
                stroke: new Stroke({ color: '#ffffff', width: 3.5 }),
                backgroundFill: new Fill({ color: 'rgba(255, 255, 255, 0.95)' }),
                backgroundStroke: new Stroke({ color: color, width: 1.5 }),
                padding: [2, 6, 2, 6],
              }),
            })
          )
        }

        return styles
      },
      properties: { id: 'mines_points' },
      visible: layerVisibility['mines_points'] ?? true,
      opacity: layerOpacity['mines_points'] ?? 1.0,
      zIndex: 35,
    })

    // 2. Forest Reserves Vector
    const forestVector = new VectorLayer({
      source: new VectorSource({
        features: geojsonFormat.readFeatures(FOREST_RESERVES_GEOJSON, {
          featureProjection: 'EPSG:3857',
        }),
      }),
      style: (feature) =>
        new Style({
          fill: new Fill({ color: 'rgba(22, 163, 74, 0.25)' }),
          stroke: new Stroke({ color: '#16a34a', width: 2, lineDash: [8, 4] }),
          text: new Text({
            text: (feature.get('name') as string) || 'Forest Reserve',
            font: 'italic 11px sans-serif',
            fill: new Fill({ color: '#14532d' }),
            stroke: new Stroke({ color: '#f0fdf4', width: 3 }),
            overflow: true,
          }),
        }),
      properties: { id: 'forest' },
      visible: layerVisibility['forest'] ?? true,
      opacity: layerOpacity['forest'] ?? 0.7,
      zIndex: 15,
    })

    // 3. Water Bodies Vector
    const waterVector = new VectorLayer({
      source: new VectorSource({
        features: geojsonFormat.readFeatures(WATER_BODIES_GEOJSON, {
          featureProjection: 'EPSG:3857',
        }),
      }),
      style: (feature) =>
        new Style({
          fill: new Fill({ color: 'rgba(14, 165, 233, 0.35)' }),
          stroke: new Stroke({ color: '#0284c7', width: 2 }),
          text: new Text({
            text: (feature.get('name') as string) || 'Water Body',
            font: '11px sans-serif',
            fill: new Fill({ color: '#0369a1' }),
            stroke: new Stroke({ color: '#f0f9ff', width: 3 }),
            overflow: true,
          }),
        }),
      properties: { id: 'water' },
      visible: layerVisibility['water'] ?? true,
      opacity: layerOpacity['water'] ?? 0.7,
      zIndex: 14,
    })

    // 4. Eco-Sensitive Zones Vector
    const ecoVector = new VectorLayer({
      source: new VectorSource({
        features: geojsonFormat.readFeatures(ECO_ZONES_GEOJSON, {
          featureProjection: 'EPSG:3857',
        }),
      }),
      style: (feature) =>
        new Style({
          fill: new Fill({ color: 'rgba(249, 115, 22, 0.22)' }),
          stroke: new Stroke({ color: '#ea580c', width: 2, lineDash: [6, 4] }),
          text: new Text({
            text: (feature.get('name') as string) || 'Eco-Sensitive Zone',
            font: 'bold 11px sans-serif',
            fill: new Fill({ color: '#9a3412' }),
            stroke: new Stroke({ color: '#fff7ed', width: 3 }),
            overflow: true,
          }),
        }),
      properties: { id: 'eco' },
      visible: layerVisibility['eco'] ?? false,
      opacity: layerOpacity['eco'] ?? 0.6,
      zIndex: 16,
    })

    // 5. Transportation Networks Vector
    const transportVector = new VectorLayer({
      source: new VectorSource({
        features: geojsonFormat.readFeatures(TRANSPORT_NETWORKS_GEOJSON, {
          featureProjection: 'EPSG:3857',
        }),
      }),
      style: (feature) => [
        new Style({
          stroke: new Stroke({ color: '#312e81', width: 6 }),
        }),
        new Style({
          stroke: new Stroke({ color: '#6366f1', width: 3.5 }),
          text: new Text({
            text: (feature.get('name') as string) || '',
            font: '10px sans-serif',
            fill: new Fill({ color: '#312e81' }),
            stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
            placement: 'line',
          }),
        }),
      ],
      properties: { id: 'transport_networks' },
      visible: layerVisibility['transport_networks'] ?? false,
      opacity: layerOpacity['transport_networks'] ?? 1.0,
      zIndex: 18,
    })

    // 6. DGPS Survey Points Vector
    const dgpsVector = new VectorLayer({
      source: new VectorSource({
        features: geojsonFormat.readFeatures(DGPS_SURVEY_GEOJSON, {
          featureProjection: 'EPSG:3857',
        }),
      }),
      style: (feature) =>
        new Style({
          image: new Circle({
            radius: 6,
            fill: new Fill({ color: '#dc2626' }),
            stroke: new Stroke({ color: '#ffffff', width: 2 }),
          }),
          text: new Text({
            text: `📍 ${feature.get('pillar_no') || ''}`,
            font: 'bold 10px sans-serif',
            offsetY: -12,
            fill: new Fill({ color: '#991b1b' }),
            stroke: new Stroke({ color: '#ffffff', width: 3 }),
          }),
        }),
      properties: { id: 'dgps_survey_points' },
      visible: layerVisibility['dgps_survey_points'] ?? false,
      opacity: layerOpacity['dgps_survey_points'] ?? 1.0,
      zIndex: 25,
    })

    // 7. ETS Survey Points Vector
    const etsVector = new VectorLayer({
      source: new VectorSource({
        features: geojsonFormat.readFeatures(ETS_SURVEY_GEOJSON, {
          featureProjection: 'EPSG:3857',
        }),
      }),
      style: (feature) =>
        new Style({
          image: new Circle({
            radius: 5,
            fill: new Fill({ color: '#8b5cf6' }),
            stroke: new Stroke({ color: '#ffffff', width: 2 }),
          }),
          text: new Text({
            text: `🔹 ${feature.get('pillar_no') || ''}`,
            font: 'bold 10px sans-serif',
            offsetY: -12,
            fill: new Fill({ color: '#5b21b6' }),
            stroke: new Stroke({ color: '#ffffff', width: 3 }),
          }),
        }),
      properties: { id: 'ets_survey_points' },
      visible: layerVisibility['ets_survey_points'] ?? false,
      opacity: layerOpacity['ets_survey_points'] ?? 1.0,
      zIndex: 24,
    })

    // 8. Approved Mine Plans Vector
    const approvedPlansVector = new VectorLayer({
      source: new VectorSource({
        features: geojsonFormat.readFeatures(APPROVED_MINE_PLANS_GEOJSON, {
          featureProjection: 'EPSG:3857',
        }),
      }),
      style: (feature) =>
        new Style({
          fill: new Fill({ color: 'rgba(16, 185, 129, 0.2)' }),
          stroke: new Stroke({ color: '#10b981', width: 2.5, lineDash: [5, 5] }),
          text: new Text({
            text: `Approved Plan: ${feature.get('plan_id') || ''}`,
            font: 'bold 10px sans-serif',
            fill: new Fill({ color: '#065f46' }),
            stroke: new Stroke({ color: '#ffffff', width: 3 }),
          }),
        }),
      properties: { id: 'approved_mine_plans' },
      visible: layerVisibility['approved_mine_plans'] ?? false,
      opacity: layerOpacity['approved_mine_plans'] ?? 1.0,
      zIndex: 21,
    })

    // 9. Administrative Boundaries Vector
    const adminVector = new VectorLayer({
      source: new VectorSource({
        features: geojsonFormat.readFeatures(ADMIN_BOUNDARY_GEOJSON, {
          featureProjection: 'EPSG:3857',
        }),
      }),
      style: (feature) =>
        new Style({
          fill: new Fill({ color: 'rgba(99, 102, 241, 0.05)' }),
          stroke: new Stroke({ color: '#6366f1', width: 2, lineDash: [12, 6] }),
          text: new Text({
            text: (feature.get('name') as string) || '',
            font: 'bold 12px sans-serif',
            fill: new Fill({ color: '#3730a3' }),
            stroke: new Stroke({ color: '#ffffff', width: 3 }),
          }),
        }),
      properties: { id: 'admin_boundary' },
      visible: layerVisibility['admin_boundary'] ?? false,
      opacity: layerOpacity['admin_boundary'] ?? 0.8,
      zIndex: 10,
    })

    // ── Trip replay layer (Corridor trace) ──────────────────────────────────
    const tripLayer = new VectorLayer({
      source: tripSourceRef.current,
      style: [
        new Style({
          stroke: new Stroke({ color: '#0369a1', width: 5 }),
        }),
        new Style({
          stroke: new Stroke({ color: '#38bdf8', width: 3 }),
        }),
      ],
      properties: { id: 'trip' },
      zIndex: 99,
    })

    // ── Live Vehicles Vector Layer (Drawn Directly on Map Canvas) ────────────
    const vehicleVectorLayer = new VectorLayer({
      source: vehicleSourceRef.current,
      style: (feature) => {
        const v = feature.get('vehicle') as Vehicle
        if (!v) return []
        const isMoving = v.is_online && (v.current_speed_kmh ?? 0) > 0
        const isSelected = useMapStore.getState().selectedVehicleId === v.id
        const hasBreach = useMapStore.getState().vehicleAlerts.some(
          (a) => a.vehicle_number === v.vehicle_number && !a.is_resolved
        )

        let color = '#10b981' // Vivid Emerald Green (moving)
        if (hasBreach) color = '#ef4444' // Emergency Crimson (breach)
        else if (isSelected) color = '#38bdf8' // Electric Blue (selected)
        else if (!isMoving && v.is_online) color = '#f59e0b' // High-vis Amber (idle)
        else if (!v.is_online) color = '#64748b' // Slate (offline)

        return [
          // 1. Radar wave beacon ring (visible from any zoom)
          new Style({
            image: new Circle({
              radius: isSelected || hasBreach ? 26 : 20,
              fill: new Fill({ color: `${color}35` }),
              stroke: new Stroke({ color: color, width: 2, lineDash: [4, 4] }),
            }),
          }),
          // 2. Solid high-contrast core
          new Style({
            image: new Circle({
              radius: isSelected || hasBreach ? 15 : 12,
              fill: new Fill({ color: color }),
              stroke: new Stroke({ color: '#ffffff', width: 3 }),
            }),
          }),
          // 3. Vehicle symbol
          new Style({
            text: new Text({
              text: '🚛',
              font: '14px sans-serif',
              offsetY: 1,
            }),
          }),
          // 4. Permanent tactical info pill
          new Style({
            text: new Text({
              text: `${v.vehicle_number} • ${hasBreach ? '⚠️ BREACH' : `${Math.round(v.current_speed_kmh ?? 0)} km/h`}`,
              font: 'bold 11px sans-serif',
              offsetY: -26,
              fill: new Fill({ color: '#ffffff' }),
              stroke: new Stroke({ color: '#0f172a', width: 4 }),
              backgroundFill: new Fill({ color: hasBreach ? '#7f1d1d' : '#0f172a' }),
              backgroundStroke: new Stroke({ color: color, width: 2 }),
              padding: [3, 8, 3, 8],
            }),
          }),
        ]
      },
      properties: { id: 'vehicles' },
      zIndex: 120,
    })

    // ── Sentinel-2 Spectral Environmental Layers (NDVI & WI) ─────────────────
    const ndviVectorLayer = new VectorLayer({
      source: new VectorSource({
        features: geojsonFormat.readFeatures(NDVI_SPECTRAL_GEOJSON, {
          featureProjection: 'EPSG:3857',
        }),
      }),
      style: (feature) => {
        if (isRestricted) {
          const featDist = (feature.get('district') as string) || ''
          if (featDist) {
            const c1 = featDist.toLowerCase().replace(/[^a-z0-9]/g, '')
            const c2 = jurisdiction.name.toLowerCase().replace(/[^a-z0-9]/g, '')
            if (!c1.includes(c2) && !c2.includes(c1)) return []
          }
        }
        const val = Number(feature.get('ndvi') ?? 0.3)
        const color = (feature.get('color') as string) || (val < 0.2 ? '#dc2626' : val < 0.4 ? '#eab308' : '#15803d')
        return [
          new Style({
            fill: new Fill({ color: `${color}99` }),
            stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
            text: new Text({
              text: `🌱 NDVI ${val.toFixed(2)} • ${feature.get('classification') || ''}`,
              font: 'bold 11px sans-serif',
              fill: new Fill({ color: '#ffffff' }),
              stroke: new Stroke({ color: '#0f172a', width: 3 }),
              backgroundFill: new Fill({ color: 'rgba(15, 23, 42, 0.88)' }),
              backgroundStroke: new Stroke({ color, width: 1.5 }),
              padding: [2, 6, 2, 6],
            }),
          }),
        ]
      },
      properties: { id: 'ndvi_analysis' },
      visible: layerVisibility['ndvi_analysis'] ?? false,
      opacity: layerOpacity['ndvi_analysis'] ?? 0.8,
      zIndex: 40,
    })

    const wiVectorLayer = new VectorLayer({
      source: new VectorSource({
        features: geojsonFormat.readFeatures(WI_SPECTRAL_GEOJSON, {
          featureProjection: 'EPSG:3857',
        }),
      }),
      style: (feature) => {
        if (isRestricted) {
          const featDist = (feature.get('district') as string) || ''
          if (featDist) {
            const c1 = featDist.toLowerCase().replace(/[^a-z0-9]/g, '')
            const c2 = jurisdiction.name.toLowerCase().replace(/[^a-z0-9]/g, '')
            if (!c1.includes(c2) && !c2.includes(c1)) return []
          }
        }
        const val = Number(feature.get('ndwi') ?? 0.0)
        const color = (feature.get('color') as string) || (val > 0.3 ? '#0284c7' : val > -0.1 ? '#38bdf8' : '#d97706')
        return [
          new Style({
            fill: new Fill({ color: `${color}99` }),
            stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
            text: new Text({
              text: `💧 NDWI ${val > 0 ? '+' : ''}${val.toFixed(2)} • ${feature.get('classification') || ''}`,
              font: 'bold 11px sans-serif',
              fill: new Fill({ color: '#ffffff' }),
              stroke: new Stroke({ color: '#0f172a', width: 3 }),
              backgroundFill: new Fill({ color: 'rgba(15, 23, 42, 0.88)' }),
              backgroundStroke: new Stroke({ color, width: 1.5 }),
              padding: [2, 6, 2, 6],
            }),
          }),
        ]
      },
      properties: { id: 'wi_analysis' },
      visible: layerVisibility['wi_analysis'] ?? false,
      opacity: layerOpacity['wi_analysis'] ?? 0.8,
      zIndex: 41,
    })

    // ── Inverted Spatial Mask (Fades out everything outside Telangana state) ──
    const maskSource = new VectorSource()
    const worldRing = [
      [-20037508, -20037508],
      [20037508, -20037508],
      [20037508, 20037508],
      [-20037508, 20037508],
      [-20037508, -20037508],
    ]
    const [minLon, minLat, maxLon, maxLat] = jurisdiction.extent
    const p1 = fromLonLat([minLon, minLat])
    const p2 = fromLonLat([minLon, maxLat])
    const p3 = fromLonLat([maxLon, maxLat])
    const p4 = fromLonLat([maxLon, minLat])
    const jurisdictionHole = [p1, p2, p3, p4, p1]

    const maskFeature = new Feature({
      geometry: new Polygon([worldRing, jurisdictionHole]),
      name: `${jurisdiction.name} Territory Mask Overlay`,
    })
    maskSource.addFeature(maskFeature)

    // Load exact high-precision Telangana boundary GeoJSON to carve out the perfect state contour
    fetch('/data/gis/telangana_state.geojson')
      .then((res) => res.json())
      .then((data) => {
        const features = geojsonFormat.readFeatures(data, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        })
        if (features.length > 0) {
          const geom = features[0].getGeometry()
          if (geom) {
            let holes: any[] = []
            if (geom.getType() === 'Polygon') {
              holes = [(geom as Polygon).getCoordinates()[0]]
            } else if (geom.getType() === 'MultiPolygon') {
              holes = (geom as any).getPolygons().map((p: Polygon) => p.getCoordinates()[0])
            }
            if (holes.length > 0 && !isRestricted) {
              maskSource.clear()
              const maskPoly = new Polygon([worldRing, ...holes])
              maskSource.addFeature(new Feature({
                geometry: maskPoly,
                name: 'Telangana State Inverted Fadeout Mask',
              }))
            }
          }
        }
      })
      .catch((err) => {
        console.warn('Could not load detailed state contour mask, using extent fallback', err)
      })

    const jurisdictionMaskLayer = new VectorLayer({
      source: maskSource,
      style: new Style({
        fill: new Fill({
          color: 'rgba(15, 23, 42, 0.65)', // Smooth fadeout obscuring out-of-state areas
        }),
      }),
      zIndex: 4, // Directly above base tile layer, below all state/district vectors and markers
      properties: { id: 'jurisdiction_mask' },
    })

    // District Boundary Demarcation Layer
    const jurisdictionSource = new VectorSource()
    if (isRestricted) {
      const [minLon, minLat, maxLon, maxLat] = jurisdiction.extent
      const ringCoords = [
        fromLonLat([minLon, minLat]),
        fromLonLat([maxLon, minLat]),
        fromLonLat([maxLon, maxLat]),
        fromLonLat([minLon, maxLat]),
        fromLonLat([minLon, minLat]),
      ]
      const boundaryFeature = new Feature({
        geometry: new Polygon([ringCoords]),
        name: `${jurisdiction.name} District Jurisdiction Boundary`,
      })
      jurisdictionSource.addFeature(boundaryFeature)
    }

    const jurisdictionLayer = new VectorLayer({
      source: jurisdictionSource,
      style: new Style({
        stroke: new Stroke({
          color: '#10B981',
          width: 3.5,
          lineDash: [10, 5],
        }),
        fill: new Fill({
          color: 'rgba(16, 185, 129, 0.02)',
        }),
      }),
      zIndex: 150,
      properties: { id: 'jurisdiction_boundary' },
    })

    // ── Map creation ─────────────────────────────────────────────────────────
    const map = new OlMap({
      target: containerRef.current,
      layers: [
        osmLayer, satelliteLayer, terrainLayer, lightLayer,
        jurisdictionMaskLayer,
        // State, Districts, Mandals Boundaries
        stateVector, districtsVector, mandalsVector,
        // WMS Layers (GeoServer if active)
        forestWMS, waterWMS, ecoWMS, adminWMS, transportWMS,
        miningLeasesWMS, approvedPlansWMS, dgpsWMS, etsWMS,
        // Vector Layers (Direct Real GIS & Interactive)
        forestVector, waterVector, ecoVector, adminVector, transportVector,
        approvedPlansVector, miningLeasesVector, minesPointsVector,
        etsVector, dgpsVector,
        ndviVectorLayer, wiVectorLayer,
        tripLayer,
        vehicleVectorLayer,
        jurisdictionLayer,
      ],
      view: new View({
        center: fromLonLat(jurisdiction.center),
        zoom: jurisdiction.defaultZoom,
        minZoom: jurisdiction.minZoom,
        maxZoom: jurisdiction.maxZoom,
        extent: isRestricted ? extent3857 : getJurisdiction3857Extent(jurisdiction),
        constrainOnlyCenter: false,
        smoothExtentConstraint: false,
      }),
      interactions: defaultInteractions(),
      controls: [
        new ScaleLine({ units: 'metric', bar: true }),
        new MousePosition({
          coordinateFormat: (coord) => {
            if (!coord) return ''
            const lonLat = toLonLat(coord)
            return `${lonLat[1].toFixed(5)}°N  ${lonLat[0].toFixed(5)}°E`
          },
          projection: 'EPSG:3857',
          className: 'ol-mouse-position',
        }),
        new Attribution({ collapsible: true }),
        new FullScreen(),
      ],
    })

    mapRef.current = map

    // ── Click on features (Interactive Vector & WMS Fallback) ─────────────────
    map.on('click', async (evt) => {
      // 0. Vehicle Feature Hit Test (always permitted across state boundaries)
      let vehicleHit = false
      map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        if (vehicleHit) return true
        const props = feature.getProperties()
        const veh = props.vehicle as Vehicle
        if (veh) {
          selectVehicle(veh.id)
          useMapStore.getState().setVehicleTrackingPanelOpen(true)
          toast.success(`Selected Vehicle: ${veh.vehicle_number} (${veh.driver_name})`, {
            icon: '🚛',
            style: { background: '#0F172A', color: '#38BDF8', border: '1px solid #0284C7' }
          })
          vehicleHit = true
          return true
        }
        return false
      })
      if (vehicleHit) return

      const lonLat = toLonLat(evt.coordinate)
      if (isRestricted && !isCoordinateInJurisdiction([lonLat[0], lonLat[1]], jurisdiction)) {
        toast.error(`Spatial Jurisdiction Enforced: Inspection blocked outside ${jurisdiction.name} District.`, {
          icon: '🚫',
          style: { background: '#7F1D1D', color: '#FEE2E2', border: '1px solid #DC2626' }
        })
        return
      }

      // 1. Direct interactive vector feature hit test
      let hitFound = false
      map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        if (hitFound) return true
        const props = feature.getProperties()

        // 815 Real Shapefile Mines Hit Test
        if (props.Company || props.Mineral) {
          const leaseObj: MiningLease = {
            id: Number(props.ORIG_FID ?? Math.floor(Math.random() * 10000)),
            lease_id: props.SurveyNumb ? `TG-SY-${props.SurveyNumb}` : `TG-MINE-${String(props.Company || 'TS').slice(0, 8).replace(/\s+/g, '')}`,
            mine_name: `${props.Company || 'Mining Lease'} - ${props.Mineral || 'Mineral Extraction'}`,
            mineral_type: ((props.Mineral || '').toUpperCase().includes('GRANITE')
              ? 'GRANITE'
              : (props.Mineral || '').toUpperCase().includes('LIMESTONE')
              ? 'LIMESTONE'
              : (props.Mineral || '').toUpperCase().includes('SAND')
              ? 'SAND'
              : 'OTHER') as any,
            mineral_display: props.Mineral || 'Mineral Extraction',
            leaseholder_name: props.Company || 'Authorized Fleet Operator',
            leaseholder_pan: 'AAACT' + String(1000 + Math.floor(Math.random() * 8999)) + 'L',
            leaseholder_contact: '+91 40-2322-1234',
            leaseholder_email: 'mines_ts@telangana.gov.in',
            state: 'Telangana',
            district: props.District || 'Telangana',
            mandal: props.Mandal || '',
            village: props.Address || '',
            survey_number: props.SurveyNumb ? `Sy. No. ${props.SurveyNumb}` : 'Survey Verified',
            area_hectares: props.Production ? Math.max(10, Math.round(Number(props.Production) / 1000)) : 25.0,
            centroid_lon: lonLat[0],
            centroid_lat: lonLat[1],
            grant_date: String(props.Reg_From || '2022-01-01'),
            commencement_date: String(props.Reg_From || '2022-01-01'),
            valid_from: String(props.Reg_From || '2022-01-01'),
            valid_till: String(props.Reg_To || '2027-12-31'),
            status: (props.Notice && Number(props.Notice) > 0) ? 'PENDING' : 'ACTIVE',
            status_display: (props.Notice && Number(props.Notice) > 0) ? 'Notice Pending' : 'Operational Compliant',
            royalty_due: Number(props.Notice || 0),
            last_payment_date: '2026-08-15',
            days_remaining: 730,
            is_expiring_soon: false,
          }
          selectLease(leaseObj.lease_id, leaseObj)
          hitFound = true
          return true
        }

        if (props.lease_id) {
          const matchedLease = MOCK_LEASES.find((l) => l.lease_id === props.lease_id)
          selectLease(props.lease_id as string, matchedLease)
          hitFound = true
          return true
        }
        if (props.pillar_no) {
          toast(`Survey Marker: ${props.pillar_no} (${props.survey_type || 'Cadastral Survey'})`, {
            icon: '📍',
            style: { background: '#0F172A', color: '#F8FAFC', border: '1px solid #334155' }
          })
          hitFound = true
          return true
        }
        if (props.plan_id) {
          toast(`Approved Mine Plan: ${props.plan_id}\n${props.mine_name || ''}`, {
            icon: '📑',
            style: { background: '#064E3B', color: '#ECFDF5', border: '1px solid #10B981' }
          })
          hitFound = true
          return true
        }
        if (props.ndvi !== undefined) {
          toast(`🌱 Sentinel-2 NDVI: ${Number(props.ndvi).toFixed(2)}\n${props.classification || ''}`, {
            icon: '🛰️',
            style: { background: '#064E3B', color: '#ECFDF5', border: '1px solid #10B981' }
          })
          useMapStore.getState().setSpectralAnalysisOpen(true)
          hitFound = true
          return true
        }
        if (props.ndwi !== undefined) {
          toast(`💧 Sentinel-2 NDWI / WI: ${Number(props.ndwi).toFixed(2)}\n${props.classification || ''}`, {
            icon: '🛰️',
            style: { background: '#0C4A6E', color: '#F0F9FF', border: '1px solid #0EA5E9' }
          })
          useMapStore.getState().setSpectralAnalysisOpen(true)
          hitFound = true
          return true
        }
        if (props.District && !props.Mineral) {
          toast(`District Boundary: ${props.District}`, {
            icon: '🏛️',
            style: { background: '#0F172A', color: '#F8FAFC', border: '1px solid #15803D' }
          })
          hitFound = true
          return true
        }
        if (props.Mandal) {
          toast(`Mandal: ${props.Mandal} (${props.District || 'Telangana'})`, {
            icon: '🗺️',
            style: { background: '#0F172A', color: '#F8FAFC', border: '1px solid #3B82F6' }
          })
          hitFound = true
          return true
        }
        return false
      })

      if (hitFound) return

      // 2. WMS GetFeatureInfo for lease layer if no vector feature hit
      const url = miningLeasesWMS
        .getSource()!
        .getFeatureInfoUrl(evt.coordinate, map.getView().getResolution()!, 'EPSG:3857', {
          INFO_FORMAT: 'application/json',
          FEATURE_COUNT: 1,
        })

      if (url) {
        try {
          const res = await fetch(url)
          const json = await res.json()
          if (json.features?.[0]) {
            const props = json.features[0].properties
            selectLease(props.lease_id as string)
          } else {
            selectLease(null)
          }
        } catch {
          // ignore
        }
      }
    })

    // ── Pointer cursor on features ────────────────────────────────────────────
    map.on('pointermove', (evt) => {
      const pixel = map.getEventPixel(evt.originalEvent)
      const hit = map.hasFeatureAtPixel(pixel)
      const target = map.getTargetElement() as HTMLElement
      target.style.cursor = hit ? 'pointer' : ''

      const coord = toLonLat(evt.coordinate)
      setCursorCoords([coord[0], coord[1]])
    })

    // ── Track view changes ─────────────────────────────────────────────────
    map.getView().on('change:resolution', () => {
      setZoom(map.getView().getZoom() ?? 8)
    })

    map.getView().on('change:center', () => {
      const center = toLonLat(map.getView().getCenter()!)
      setCenter([center[0], center[1]])
    })

    return () => {
      map.setTarget(undefined)
      mapRef.current = null
    }
  }, [containerRef, selectLease, selectVehicle, setZoom, setCenter, setCursorCoords])

  // ─── Update base layer visibility ─────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.getLayers().forEach((layer) => {
      const id = layer.get('id') as string
      if (['osm', 'satellite', 'terrain', 'carto_light'].includes(id)) {
        layer.setVisible(id === baseLayer)
      }
    })
  }, [baseLayer])

  // ─── Update WMS layer visibility + opacity + refresh cache ────────────────
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.getLayers().forEach((layer) => {
      const id = layer.get('id') as string
      if (id && id in layerVisibility) {
        layer.setVisible(layerVisibility[id])
        if ('setOpacity' in layer) {
          (layer as TileLayer<TileWMS>).setOpacity(layerOpacity[id] ?? 1)
        }
        
        // If this layer is from GeoServer, we force OpenLayers to bust the cache
        // by pushing a new dynamic param to the source.
        const source = (layer as any).getSource()
        if (source instanceof TileWMS) {
          source.updateParams({ '_b': mapRefreshTrigger })
        }
      }
    })
  }, [layerVisibility, layerOpacity, mapRefreshTrigger])

  // ─── Synchronize Vehicles from Store onto OpenLayers Canvas Layer ─────────
  const { vehicles, vehiclesVisible, selectedVehicleId, vehicleAlerts } = useMapStore()

  useEffect(() => {
    const source = vehicleSourceRef.current
    source.clear()
    if (!vehiclesVisible || !vehicles || vehicles.length === 0) return

    vehicles.forEach((v) => {
      if (v.last_lon && v.last_lat) {
        const feat = new Feature({
          geometry: new Point(fromLonLat([v.last_lon, v.last_lat])),
          vehicle: v,
        })
        feat.setId(`veh-${v.id}`)
        source.addFeature(feat)
      }
    })
  }, [vehicles, vehiclesVisible, selectedVehicleId, vehicleAlerts])

  // ─── Synchronize View When District Officer Logs In ───────────────────────
  const user = useAuthStore((s) => s.user)
  useEffect(() => {
    if (!mapRef.current) return
    const jur = getUserJurisdiction(user?.profile?.district)
    if (jur.name !== 'Statewide') {
      const view = mapRef.current.getView()
      view.setCenter(fromLonLat(jur.center))
      view.setZoom(jur.defaultZoom)
    }
  }, [user])



  const flyTo = useCallback((lon: number, lat: number, zoom = 14) => {
    if (!mapRef.current) return
    mapRef.current.getView().animate({
      center: fromLonLat([lon, lat]),
      zoom,
      duration: 1200,
    })
  }, [])

  const updateTripLayer = useCallback((geoJSON: GeoJSONFeatureCollection) => {
    const format = new GeoJSON()
    tripSourceRef.current.clear()
    const features = format.readFeatures(geoJSON, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    })
    tripSourceRef.current.addFeatures(features as Feature[])
  }, [])

  const clearTripLayer = useCallback(() => {
    tripSourceRef.current.clear()
  }, [])

  return { initMap, mapRef, flyTo, updateTripLayer, clearTripLayer }
}
