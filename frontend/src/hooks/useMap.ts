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
import { ScaleLine, OverviewMap, ZoomSlider, MousePosition, Attribution, FullScreen } from 'ol/control'
import { createStringXY } from 'ol/coordinate'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { useMapStore } from '../store'
import type { GeoJSONFeatureCollection, LeaseStatus, VehicleProperties } from '../types'

const GEOSERVER_URL = import.meta.env.VITE_GEOSERVER_URL ?? 'http://localhost:8080/geoserver'

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
  } = useMapStore()

  // ─── Initialize map ───────────────────────────────────────────────────────
  const initMap = useCallback(() => {
    if (!containerRef.current || mapRef.current) return

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
            attributions: '© Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS',
          }),
        }),
        new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
            maxZoom: 19,
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
            STYLES: styleName ? styleName : '', // Explicitly link SLD
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
    const transportWMS = makeTileWMS('spatial_layers', 'transport_networks', false, 1.0, "layer_type='TRANSPORT'", 'transport_style')



    // ── Trip replay layer ────────────────────────────────────────────────────
    const tripLayer = new VectorLayer({
      source: tripSourceRef.current,
      style: new Style({
        stroke: new Stroke({ color: '#F59E0B', width: 3, lineDash: [6, 3] }),
      }),
      properties: { id: 'trip' },
      zIndex: 99,
    })

    // ── Map creation ─────────────────────────────────────────────────────────
    const map = new OlMap({
      target: containerRef.current,
      layers: [
        osmLayer, satelliteLayer, terrainLayer,
        forestWMS, waterWMS, ecoWMS, adminWMS, transportWMS,
        miningLeasesWMS, approvedPlansWMS, dgpsWMS, etsWMS,
        tripLayer,
      ],
      view: new View({
        center: fromLonLat([79.5, 18.0]),
        zoom: 8,
        minZoom: 5,
        maxZoom: 20,
      }),
      interactions: defaultInteractions(),
      controls: [
        new ScaleLine({ units: 'metric', bar: true }),
        new ZoomSlider(),
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
        new OverviewMap({
          collapsed: true,
          layers: [new TileLayer({ source: new OSM() })],
        }),
      ],
    })

    mapRef.current = map





    // ── Click on lease WMS ────────────────────────────────────────────────────
    map.on('click', async (evt) => {
      // WMS GetFeatureInfo for lease layer
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
      if (['osm', 'satellite', 'terrain'].includes(id)) {
        layer.setVisible(id === baseLayer)
      }
    })
  }, [baseLayer])

  // ─── Update WMS layer visibility + opacity ────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.getLayers().forEach((layer) => {
      const id = layer.get('id') as string
      if (id && id in layerVisibility) {
        layer.setVisible(layerVisibility[id])
        if ('setOpacity' in layer) {
          (layer as TileLayer<TileWMS>).setOpacity(layerOpacity[id] ?? 1)
        }
      }
    })
  }, [layerVisibility, layerOpacity])



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
