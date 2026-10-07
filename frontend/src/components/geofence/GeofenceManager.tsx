import React, { useState, useEffect } from 'react'
import {
  ShieldAlert, Plus, MapPin, CheckCircle2, AlertTriangle,
  Compass, Radio, Trash2, Edit3, Eye, Shield, ArrowRight,
  Sliders, Bell, Layers, Map as MapIcon, X, Video, Gauge,
  Truck, Key, Settings, Send, User, Check, ExternalLink,
  Flame, Leaf, BarChart2, ShieldCheck, Activity, PenLine,
  Crosshair, MousePointerClick, RotateCcw, FileText, Info,
  Pause, Play
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore, useMapStore } from '../../store'
import { getUserJurisdiction } from '../../utils/districts'
import { getRolePermissions } from '../../utils/rbac'
import { REAL_NETRADYNE_VEHICLES } from '../../data/realVehicles'
import { MOCK_LEASES } from '../../api/leases'
import NetradyneVideoModal from '../fleet/NetradyneVideoModal'
import type { Vehicle, VehicleAlert, MiningLease } from '../../types'
import toast from 'react-hot-toast'

export interface CoordinatePoint {
  id: string
  lat: number
  lng: number
  label?: string
}

export interface GeofenceZone {
  id: string
  name: string
  type: 'QUARRY_BOUNDARY' | 'BUFFER_RESTRICTION' | 'TRANSIT_CORRIDOR' | 'SAND_REACH'
  typeDisplay: string
  district: string
  mandal: string
  radiusMeters?: number
  speedLimitKmh: number
  activeTrucks: number
  violationCount: number
  status: 'ACTIVE' | 'WARNING' | 'INACTIVE' | 'PAUSED'
  alertTriggers: string[]
  coordinatesSummary: string
  color: string
  points?: CoordinatePoint[]
  centerPoint?: { lat: number; lng: number }
}

function calculatePolygonAreaHa(points: { lat: number; lng: number }[]): number {
  if (points.length < 3) return 0
  const R = 6378137 // Earth radius in meters
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    const p1 = points[i]
    const p2 = points[j]
    const lat1 = (p1.lat * Math.PI) / 180
    const lat2 = (p2.lat * Math.PI) / 180
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180
    area += dLng * (2 + Math.sin(lat1) + Math.sin(lat2))
  }
  area = Math.abs((area * R * R) / 2)
  return Number((area / 10000).toFixed(2)) // sq meters to Hectares
}

function calculatePerimeterKm(points: { lat: number; lng: number }[]): number {
  if (points.length < 2) return 0
  const R = 6371 // Earth radius in km
  let totalKm = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    const p1 = points[i]
    const p2 = points[j]
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    totalKm += R * c
  }
  return Number(totalKm.toFixed(2))
}

const DISTRICT_SAMPLE_POINTS: Record<string, CoordinatePoint[]> = {
  Rangareddy: [
    { id: 'p1', lat: 17.13502, lng: 78.43125, label: 'P1: North Corner' },
    { id: 'p2', lat: 17.14210, lng: 78.43954, label: 'P2: East Gate' },
    { id: 'p3', lat: 17.13855, lng: 78.44802, label: 'P3: Pit Boundary' },
    { id: 'p4', lat: 17.13050, lng: 78.44108, label: 'P4: Weighbridge' },
    { id: 'p5', lat: 17.13105, lng: 78.43301, label: 'P5: West Perimeter' },
  ],
  Vikarabad: [
    { id: 'p1', lat: 17.25412, lng: 77.58210, label: 'P1: Tandur North' },
    { id: 'p2', lat: 17.26125, lng: 77.58945, label: 'P2: Limestone Pit' },
    { id: 'p3', lat: 17.25810, lng: 77.59820, label: 'P3: Crusher Gate' },
    { id: 'p4', lat: 17.24905, lng: 77.59215, label: 'P4: Transit Outflow' },
  ],
  Nizamabad: [
    { id: 'p1', lat: 18.78850, lng: 78.29100, label: 'P1: Armoor North' },
    { id: 'p2', lat: 18.79510, lng: 78.29850, label: 'P2: East Transit' },
    { id: 'p3', lat: 18.79120, lng: 78.30720, label: 'P3: Quartz Section' },
    { id: 'p4', lat: 18.78200, lng: 78.30110, label: 'P4: Checkpost' },
  ],
  Default: [
    { id: 'p1', lat: 17.38500, lng: 78.48670, label: 'P1: Boundary A' },
    { id: 'p2', lat: 17.39200, lng: 78.49500, label: 'P2: Boundary B' },
    { id: 'p3', lat: 17.38800, lng: 78.50300, label: 'P3: Boundary C' },
    { id: 'p4', lat: 17.38000, lng: 78.49700, label: 'P4: Boundary D' },
  ],
}

export interface GeofenceLiveAlert {
  id: string
  timestamp: string
  eventType: 'ENTRY' | 'EXIT' | 'UNAUTHORIZED' | 'SPEEDING'
  vehicleNumber: string
  vehicleType: string
  driverName: string
  zoneId: string
  zoneName: string
  district: string
  speedKmh: number
  districtAuthorityNotified: string
  stateAuthorityNotified: string
  status: 'DELIVERED' | 'ACKNOWLEDGED' | 'ESCALATED'
  netradyneDevice: string
}

const INITIAL_GEOFENCES: GeofenceZone[] = [
  {
    id: 'GF-RR-001',
    name: 'Maheshwaram Quarry High-Security Perimeter',
    type: 'QUARRY_BOUNDARY',
    typeDisplay: 'Quarry Boundary Enclosure',
    district: 'Rangareddy',
    mandal: 'Maheshwaram',
    speedLimitKmh: 40,
    activeTrucks: 8,
    violationCount: 2,
    status: 'ACTIVE',
    alertTriggers: ['Boundary Entry/Exit', 'Over-Speeding (>40 km/h)', 'Weighbridge Check'],
    coordinatesSummary: 'Polygon (5 Vertices, 48.5 Ha)',
    color: '#0284C7',
    points: [
      { id: 'p1', lat: 17.13502, lng: 78.43125, label: 'P1: North Corner' },
      { id: 'p2', lat: 17.14210, lng: 78.43954, label: 'P2: East Gate' },
      { id: 'p3', lat: 17.13855, lng: 78.44802, label: 'P3: Pit Boundary' },
      { id: 'p4', lat: 17.13050, lng: 78.44108, label: 'P4: Weighbridge' },
      { id: 'p5', lat: 17.13105, lng: 78.43301, label: 'P5: West Perimeter' },
    ],
  },
  {
    id: 'GF-RR-002',
    name: 'Ibrahimpatnam Granite Safe Transit Corridor',
    type: 'TRANSIT_CORRIDOR',
    typeDisplay: 'Designated Mineral Transit Corridor',
    district: 'Rangareddy',
    mandal: 'Ibrahimpatnam',
    radiusMeters: 500,
    speedLimitKmh: 60,
    activeTrucks: 14,
    violationCount: 1,
    status: 'ACTIVE',
    alertTriggers: ['Corridor Departure (>500m)', 'Night Transit (10 PM - 5 AM)'],
    coordinatesSummary: 'Corridor Buffer along State Highway 19',
    color: '#16A34A',
    points: [
      { id: 'p1', lat: 17.1850, lng: 78.6250, label: 'Entry Gate SH19' },
      { id: 'p2', lat: 17.2150, lng: 78.6480, label: 'Mid-Corridor Toll' },
      { id: 'p3', lat: 17.2450, lng: 78.6820, label: 'Ring Road Junction' },
    ],
  },
  {
    id: 'GF-RR-003',
    name: 'Shadnagar Eco-Sensitive Lake Buffer',
    type: 'BUFFER_RESTRICTION',
    typeDisplay: 'Prohibited Eco-Buffer',
    district: 'Rangareddy',
    mandal: 'Farooqnagar',
    radiusMeters: 250,
    speedLimitKmh: 20,
    activeTrucks: 0,
    violationCount: 0,
    status: 'ACTIVE',
    alertTriggers: ['Strict No-Entry (Immediate Flying Squad Alert)', 'Zero-Extraction Zone'],
    coordinatesSummary: 'Radial 250m Buffer from Water Body Centroid',
    color: '#DC2626',
    centerPoint: { lat: 17.0680, lng: 78.2120 },
  },
  {
    id: 'GF-NZB-004',
    name: 'Godavari Reach-7 Sand Extraction Geofence',
    type: 'SAND_REACH',
    typeDisplay: 'River Sand Reach Boundary',
    district: 'Nizamabad',
    mandal: 'Kotgiri',
    speedLimitKmh: 30,
    activeTrucks: 11,
    violationCount: 3,
    status: 'WARNING',
    alertTriggers: ['Weighbridge Bypass', 'Off-Hours Extraction', 'Overloading Detection'],
    coordinatesSummary: 'Polygon (River Bed 32 Ha)',
    color: '#D97706',
    points: [
      { id: 'p1', lat: 18.78850, lng: 78.29100, label: 'River Reach North' },
      { id: 'p2', lat: 18.79510, lng: 78.29850, label: 'Sand Ramp Checkpost' },
      { id: 'p3', lat: 18.79120, lng: 78.30720, label: 'Extraction Bed East' },
      { id: 'p4', lat: 18.78200, lng: 78.30110, label: 'South Ghat Limit' },
    ],
  },
]

const INITIAL_LIVE_ALERTS: GeofenceLiveAlert[] = [
  {
    id: 'ALR-GEOF-901',
    timestamp: '2 mins ago',
    eventType: 'ENTRY',
    vehicleNumber: 'TG07U1889',
    vehicleType: 'DMG Vigilance & Flying Squad Rapid Patrol',
    driverName: 'Transit Driver (TG-07)',
    zoneId: 'GF-RR-001',
    zoneName: 'Maheshwaram Quarry High-Security Perimeter',
    district: 'Rangareddy',
    speedKmh: 42,
    districtAuthorityNotified: 'Rangareddy DMO via SMS & Push',
    stateAuthorityNotified: 'Director of Mines & Geology, Hyderabad (Central Ledger)',
    status: 'DELIVERED',
    netradyneDevice: '6603125484',
  },
  {
    id: 'ALR-GEOF-902',
    timestamp: '18 mins ago',
    eventType: 'EXIT',
    vehicleNumber: 'TG05T8099',
    vehicleType: 'DMG River Sand Reach Flying Squad',
    driverName: 'Transit Driver (TG-05A)',
    zoneId: 'GF-RR-001',
    zoneName: 'Maheshwaram Quarry High-Security Perimeter',
    district: 'Nizamabad',
    speedKmh: 48,
    districtAuthorityNotified: 'Nizamabad DMO via Push Notification',
    stateAuthorityNotified: 'State Flying Squad Control Desk (TS-DMG)',
    status: 'ACKNOWLEDGED',
    netradyneDevice: '6603094534',
  },
  {
    id: 'ALR-GEOF-903',
    timestamp: '42 mins ago',
    eventType: 'UNAUTHORIZED',
    vehicleNumber: 'TG05U2349',
    vehicleType: 'Heavy Mineral Tipper (47,500 kg GVWR)',
    driverName: 'Transit Driver (TG-05B)',
    zoneId: 'GF-RR-003',
    zoneName: 'Shadnagar Eco-Sensitive Lake Buffer',
    district: 'Bhadradri Kothagudem',
    speedKmh: 48,
    districtAuthorityNotified: 'Bhadradri Kothagudem DMO [URGENT ENFORCEMENT FLAG]',
    stateAuthorityNotified: 'State Director of Mines & Environmental Vigilance Cell',
    status: 'ESCALATED',
    netradyneDevice: '6603101915',
  },
]

interface GeofenceManagerProps {
  onOpenMap?: () => void
  onOpenMapToDraw?: () => void
}

type ActiveViewTab = 'ZONES' | 'ALERTS' | 'GREEN_ZONE' | 'SETTINGS'

export default function GeofenceManager({ onOpenMap, onOpenMapToDraw }: GeofenceManagerProps) {
  const { user } = useAuthStore()
  const {
    addVehicleAlert, selectVehicle,
    drawnGeofenceGeoJSON, setDrawnGeofenceGeoJSON,
    setDrawBoundaryMode
  } = useMapStore()
  const jurisdiction = getUserJurisdiction(user?.profile?.district)
  const isRestricted = jurisdiction.name !== 'Statewide'
  const perms = getRolePermissions(user?.profile?.role)
  const STORAGE_KEY = 'minegis_geofences_v2'

  const [activeTab, setActiveTab] = useState<ActiveViewTab>('ZONES')
  const [geofences, setGeofences] = useState<GeofenceZone[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (isRestricted) {
            const filtered = parsed.filter(
              (g: GeofenceZone) => g.district.toLowerCase() === jurisdiction.name.toLowerCase()
            )
            return filtered.length > 0 ? filtered : parsed
          }
          return parsed
        }
      }
    } catch (e) {
      console.warn('Failed to load geofences from storage', e)
    }

    if (isRestricted) {
      return INITIAL_GEOFENCES.filter(
        (g) => g.district.toLowerCase() === jurisdiction.name.toLowerCase()
      )
    }
    return INITIAL_GEOFENCES
  })

  // Sync geofences updates to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(geofences))
    } catch (e) {
      console.warn('Failed to persist geofences', e)
    }
  }, [geofences])

  // Editing geofence state
  const [editingZone, setEditingZone] = useState<GeofenceZone | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<GeofenceZone['type']>('QUARRY_BOUNDARY')
  const [editSpeedLimit, setEditSpeedLimit] = useState<number>(40)
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'PAUSED'>('ACTIVE')
  const [editTriggers, setEditTriggers] = useState<string[]>([])

  const [liveAlerts, setLiveAlerts] = useState<GeofenceLiveAlert[]>(() => {
    if (isRestricted) {
      return INITIAL_LIVE_ALERTS.filter(
        (a) => a.district.toLowerCase() === jurisdiction.name.toLowerCase()
      )
    }
    return INITIAL_LIVE_ALERTS
  })

  // Selected vehicle for video streaming modal
  const [selectedVideoVehicle, setSelectedVideoVehicle] = useState<Vehicle | null>(null)
  const [selectedGeofenceForVideo, setSelectedGeofenceForVideo] = useState<string>('')

  // Netradyne API Credentials state
  const [showApiModal, setShowApiModal] = useState(false)
  const [netradyneClientId, setNetradyneClientId] = useState('171e8fc7-2887-43b4-84a2-831e070971e8')
  const [netradyneClientSecret, setNetradyneClientSecret] = useState('91714C59EE32DDCF5FFF932848F57E418198C0B9CC2717D62AEA277FA1F7C2BB')
  const [netradyneFleetName, setNetradyneFleetName] = useState('N504553548819474')
  const [netradyneApiKey, setNetradyneApiKey] = useState('91714C59EE32DDCF5FFF932848F57E418198C0B9CC2717D62AEA277FA1F7C2BB')
  const [webhookUrl, setWebhookUrl] = useState('https://minegis.telangana.gov.in/api/vehicles/telematics/webhook/')

  // Modal for new Geofence
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filterType, setFilterType] = useState<string>('ALL')

  // Geometry Definition Method in Wizard
  const [geomMethod, setGeomMethod] = useState<'POINTS' | 'DRAW_MAP' | 'BUFFER' | 'LEASE'>('POINTS')

  // Coordinate points table state
  const initialDistrictPoints = DISTRICT_SAMPLE_POINTS[jurisdiction.name] || DISTRICT_SAMPLE_POINTS.Rangareddy || DISTRICT_SAMPLE_POINTS.Default
  const [points, setPoints] = useState<CoordinatePoint[]>(initialDistrictPoints)
  const [centerLat, setCenterLat] = useState(initialDistrictPoints[0]?.lat || 17.13502)
  const [centerLng, setCenterLng] = useState(initialDistrictPoints[0]?.lng || 78.43125)
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>('')

  // Inspecting coordinates modal state for any existing zone
  const [inspectingZone, setInspectingZone] = useState<GeofenceZone | null>(null)

  // Form State for creating new geofence
  const [newZoneName, setNewZoneName] = useState('')
  const [newZoneType, setNewZoneType] = useState<GeofenceZone['type']>('QUARRY_BOUNDARY')
  const [newZoneMandal, setNewZoneMandal] = useState('')
  const [newSpeedLimit, setNewSpeedLimit] = useState(40)
  const [newBufferRadius, setNewBufferRadius] = useState(250)
  const [newTriggers, setNewTriggers] = useState<string[]>([
    'Boundary Entry/Exit Detection',
    'Speed Violation Alert',
    'Automatic District & State Authority Notification',
  ])

  // Listen for polygon drawn on the interactive OpenLayers map
  useEffect(() => {
    if (drawnGeofenceGeoJSON) {
      try {
        const rawCoords = (drawnGeofenceGeoJSON as any).coordinates?.[0]
        if (Array.isArray(rawCoords) && rawCoords.length >= 3) {
          const isClosed =
            rawCoords.length > 3 &&
            rawCoords[0][0] === rawCoords[rawCoords.length - 1][0] &&
            rawCoords[0][1] === rawCoords[rawCoords.length - 1][1]
          const ring = isClosed ? rawCoords.slice(0, -1) : rawCoords

          const newPts: CoordinatePoint[] = ring.map((c: [number, number], idx: number) => ({
            id: `pt-drawn-${idx + 1}-${Date.now()}`,
            lat: Number(Number(c[1]).toFixed(6)),
            lng: Number(Number(c[0]).toFixed(6)),
            label: `P${idx + 1} (Surveyed Vertex)`,
          }))

          setPoints(newPts)
          setShowCreateModal(true)
          setGeomMethod('POINTS')
          toast.success(`Successfully imported ${newPts.length} polygon boundary points from map drawing!`, {
            icon: '📍',
            duration: 5000,
          })
        }
      } catch (err) {
        console.error('Error importing drawn coordinates:', err)
      }
    }
  }, [drawnGeofenceGeoJSON])

  const handleAddPoint = () => {
    const lastPt = points[points.length - 1] || { lat: 17.1350, lng: 78.4312 }
    const newPt: CoordinatePoint = {
      id: `pt-${Date.now()}`,
      lat: Number((lastPt.lat + 0.003).toFixed(5)),
      lng: Number((lastPt.lng + 0.003).toFixed(5)),
      label: `P${points.length + 1}`,
    }
    setPoints([...points, newPt])
    toast('Added new coordinate point', { icon: '➕' })
  }

  const handleDeletePoint = (id: string) => {
    if (points.length <= 3) {
      toast.error('A polygon geofence requires at least 3 coordinate points')
      return
    }
    setPoints(points.filter((p) => p.id !== id))
  }

  const handlePointChange = (id: string, field: 'lat' | 'lng' | 'label', val: any) => {
    setPoints(
      points.map((p) => {
        if (p.id !== id) return p
        return {
          ...p,
          [field]: field === 'label' ? val : Number(val),
        }
      })
    )
  }

  const handlePreFillSample = () => {
    const sample = DISTRICT_SAMPLE_POINTS[jurisdiction.name] || DISTRICT_SAMPLE_POINTS.Rangareddy || DISTRICT_SAMPLE_POINTS.Default
    setPoints(sample)
    toast.success(`Loaded ${sample.length} verified surveyed coordinates for ${jurisdiction.name}`, {
      icon: '📐',
    })
  }

  const handleClearPoints = () => {
    setPoints([
      { id: 'p1', lat: 17.1350, lng: 78.4312, label: 'P1' },
      { id: 'p2', lat: 17.1400, lng: 78.4312, label: 'P2' },
      { id: 'p3', lat: 17.1350, lng: 78.4380, label: 'P3' },
    ])
  }

  const handleStartDrawOnMap = () => {
    setShowCreateModal(false)
    if (onOpenMapToDraw) {
      onOpenMapToDraw()
    } else {
      setDrawBoundaryMode('polygon', 'geofence')
      onOpenMap?.()
    }
    toast('Switched to Map! Click anywhere to demarcate geofence vertices. Double-click to complete.', {
      icon: '✏️',
      duration: 6000,
    })
  }

  const handleAttachLease = (leaseId: string) => {
    setSelectedLeaseId(leaseId)
    const lease = MOCK_LEASES.find((l) => l.lease_id === leaseId || String(l.id) === leaseId)
    if (!lease) return

    setNewZoneName(`${lease.mine_name || lease.leaseholder_name} Mining Zone Perimeter`)
    setNewZoneMandal(lease.mandal)
    setNewZoneType('QUARRY_BOUNDARY')

    if (lease.boundary_geojson && (lease.boundary_geojson as any).coordinates) {
      try {
        const ring = (lease.boundary_geojson as any).coordinates[0]
        if (Array.isArray(ring) && ring.length >= 3) {
          const newPts: CoordinatePoint[] = ring.slice(0, -1).map((c: [number, number], idx: number) => ({
            id: `lease-pt-${idx + 1}`,
            lat: Number(Number(c[1]).toFixed(6)),
            lng: Number(Number(c[0]).toFixed(6)),
            label: `Corner ${idx + 1} (${lease.lease_id})`,
          }))
          setPoints(newPts)
          setGeomMethod('POINTS')
          toast.success(`Imported ${newPts.length} surveyed vertices from lease ${lease.lease_id}`, {
            icon: '📑',
          })
          return
        }
      } catch (err) {
        console.error('Error reading lease boundary:', err)
      }
    }

    const sample = DISTRICT_SAMPLE_POINTS[lease.district] || DISTRICT_SAMPLE_POINTS.Rangareddy || DISTRICT_SAMPLE_POINTS.Default
    setPoints(sample)
    setGeomMethod('POINTS')
    toast.success(`Boundaries loaded for lease ${lease.lease_id}`, { icon: '📑' })
  }

  const handleCreateGeofence = (e: React.FormEvent) => {
    e.preventDefault()
    if (!perms.canManageGeofences) {
      toast.error('Permission Denied: Your assigned role cannot create or modify statutory geofences.')
      return
    }
    if (!newZoneName.trim()) {
      toast.error('Please enter a valid Geofence Name')
      return
    }

    if ((geomMethod === 'POINTS' || geomMethod === 'DRAW_MAP' || geomMethod === 'LEASE') && points.length < 3) {
      toast.error('Please configure at least 3 coordinate points to define the polygon perimeter.')
      return
    }

    const areaHa =
      geomMethod === 'BUFFER'
        ? Number(((Math.PI * newBufferRadius * newBufferRadius) / 10000).toFixed(2))
        : calculatePolygonAreaHa(points)

    const perimeterKm =
      geomMethod === 'BUFFER'
        ? Number(((2 * Math.PI * newBufferRadius) / 1000).toFixed(2))
        : calculatePerimeterKm(points)

    const newZone: GeofenceZone = {
      id: `GF-${jurisdiction.name.slice(0, 3).toUpperCase()}-00${geofences.length + 1}`,
      name: newZoneName,
      type: newZoneType,
      typeDisplay:
        newZoneType === 'QUARRY_BOUNDARY'
          ? 'Quarry Boundary Enclosure'
          : newZoneType === 'TRANSIT_CORRIDOR'
          ? 'Designated Mineral Transit Corridor'
          : newZoneType === 'BUFFER_RESTRICTION'
          ? 'Prohibited Eco-Buffer'
          : 'River Sand Reach Boundary',
      district: isRestricted ? jurisdiction.name : 'Rangareddy',
      mandal: newZoneMandal || `${jurisdiction.name} Rural`,
      radiusMeters: geomMethod === 'BUFFER' ? newBufferRadius : undefined,
      speedLimitKmh: Number(newSpeedLimit),
      activeTrucks: 0,
      violationCount: 0,
      status: 'ACTIVE',
      alertTriggers: newTriggers,
      coordinatesSummary:
        geomMethod === 'BUFFER'
          ? `Radial ${newBufferRadius}m Circular Buffer (${areaHa} Ha)`
          : `Polygon (${points.length} Vertices, ${areaHa} Ha, ${perimeterKm} km)`,
      color:
        newZoneType === 'BUFFER_RESTRICTION'
          ? '#DC2626'
          : newZoneType === 'TRANSIT_CORRIDOR'
          ? '#16A34A'
          : '#0284C7',
      points: geomMethod === 'BUFFER' ? undefined : points,
      centerPoint: geomMethod === 'BUFFER' ? { lat: centerLat, lng: centerLng } : undefined,
    }

    setGeofences((prev) => [newZone, ...prev])
    setShowCreateModal(false)
    setNewZoneName('')
    // Clear drawn state so subsequent creations don't reuse by accident
    setDrawnGeofenceGeoJSON(null)

    const alertLon = geomMethod === 'BUFFER' ? centerLng : (points[0]?.lng ?? 78.4867)
    const alertLat = geomMethod === 'BUFFER' ? centerLat : (points[0]?.lat ?? 17.3850)

    const designatedVeh = REAL_NETRADYNE_VEHICLES.find((v) => v.assigned_district.toLowerCase().includes(newZone.district.toLowerCase())) || REAL_NETRADYNE_VEHICLES[0]

    // 1. Dispatch real-time geofence live alert into the surveillance feed
    const newActivationAlert: GeofenceLiveAlert = {
      id: `ALR-GEOF-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: 'Just now',
      eventType: 'ENTRY',
      vehicleNumber: designatedVeh.vehicle_number,
      vehicleType: designatedVeh.vehicle_type_display,
      driverName: designatedVeh.driver_name,
      zoneId: newZone.id,
      zoneName: newZone.name,
      district: newZone.district,
      speedKmh: newZone.speedLimitKmh || 40,
      districtAuthorityNotified: `${newZone.district} DMO & Regional Vigilance Squad alerted`,
      stateAuthorityNotified: 'Director of Mines & Geology (Central State Surveillance Ledger)',
      status: 'DELIVERED',
      netradyneDevice: designatedVeh.netradyne_device_id || netradyneFleetName,
    }
    setLiveAlerts((prev) => [newActivationAlert, ...prev])

    // 2. Dispatch to global vehicle alerts ledger and notification counter
    addVehicleAlert({
      id: Date.now(),
      vehicle_number: designatedVeh.vehicle_number,
      driver_name: designatedVeh.driver_name,
      alert_type: 'GEOFENCE_ENTRY',
      alert_type_display: `Vehicle ${designatedVeh.vehicle_number}: Geofence Active in ${newZone.name}`,
      severity: 'HIGH',
      alert_lon: alertLon,
      alert_lat: alertLat,
      lease_id: newZone.id,
      mine_name: newZone.name,
      timestamp: new Date().toISOString(),
      description: `Active Perimeter Established for Vehicle ${designatedVeh.vehicle_number} in "${newZone.name}" (${newZone.coordinatesSummary}). Speed limit: ${newZone.speedLimitKmh} km/h. Real-time telemetry breach alerts enabled for ${newZone.district}.`,
      is_resolved: false,
      resolved_by_name: null,
      resolved_at: null,
    })

    // 3. Trigger tactical map alert popup
    useMapStore.getState().setActiveGeofenceAlertPopup({
      id: Date.now(),
      vehicleNumber: designatedVeh.vehicle_number,
      driverName: designatedVeh.driver_name,
      eventType: 'ENTRY',
      zoneName: newZone.name,
      zoneType: newZone.typeDisplay,
      district: newZone.district,
      speedKmh: newZone.speedLimitKmh || 40,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      lon: alertLon,
      lat: alertLat,
      severity: 'CRITICAL',
    })

    // 4. Instant custom alert toast banner
    toast.custom((t) => (
      <div
        className={clsx(
          'max-w-md w-full bg-slate-900 border-2 border-emerald-500 text-white rounded-lg shadow-2xl p-4 transition-all duration-300 pointer-events-auto',
          t.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex-shrink-0">
            GEOFENCE ACTIVE
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold flex items-center justify-between">
              <span className="font-mono text-white text-sm">{newZone.name}</span>
              <span className="text-[10px] text-emerald-400 font-semibold">RADAR ARMED</span>
            </div>
            <div className="text-slate-300 mt-0.5">
              Perimeter established with 24/7 automated telematics &amp; speed radar monitoring ({newZone.speedLimitKmh} km/h).
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800 space-y-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                <CheckCircle2 size={12} className="text-emerald-400" />
                <span>{newZone.district} Mining Officer (DMO) Surveillance Alert Dispatched</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ), { duration: 6000 })
  }

  // Live simulation of vehicle entering or leaving mining zone
  const handleSimulateGeofenceEvent = (eventType: 'ENTRY' | 'EXIT') => {
    const veh = REAL_NETRADYNE_VEHICLES[Math.floor(Math.random() * REAL_NETRADYNE_VEHICLES.length)] || REAL_NETRADYNE_VEHICLES[0]
    const targetGeofence = geofences[0] || INITIAL_GEOFENCES[0]

    const newAlert: GeofenceLiveAlert = {
      id: `ALR-GEOF-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: 'Just now',
      eventType,
      vehicleNumber: veh.vehicle_number,
      vehicleType: veh.vehicle_type_display,
      driverName: veh.driver_name,
      zoneId: targetGeofence.id,
      zoneName: targetGeofence.name,
      district: veh.assigned_district,
      speedKmh: Math.floor(32 + Math.random() * 15),
      districtAuthorityNotified: `${veh.assigned_district} District Mining Officer (DMO) alerted via SMS & App Push`,
      stateAuthorityNotified: 'Director of Mines & Geology (Central State Surveillance Ledger)',
      status: 'DELIVERED',
      netradyneDevice: veh.netradyne_device_id,
    }

    setLiveAlerts((prev) => [newAlert, ...prev])

    // Update global store
    addVehicleAlert({
      id: Date.now(),
      vehicle_number: veh.vehicle_number,
      driver_name: veh.driver_name,
      alert_type: eventType === 'ENTRY' ? 'GEOFENCE_ENTRY' : 'GEOFENCE_EXIT',
      alert_type_display:
        eventType === 'ENTRY'
          ? `Vehicle ${veh.vehicle_number}: Entered Mining Zone (${targetGeofence.name})`
          : `Vehicle ${veh.vehicle_number}: Exited Mining Zone (${targetGeofence.name})`,
      severity: eventType === 'ENTRY' ? 'MEDIUM' : 'LOW',
      alert_lon: veh.last_lon,
      alert_lat: veh.last_lat,
      lease_id: targetGeofence.id,
      mine_name: targetGeofence.name,
      timestamp: new Date().toISOString(),
      description: `Telematics Cloud Event: Vehicle ${veh.vehicle_number} [${eventType}] in ${targetGeofence.name}. Alert delivered to ${veh.assigned_district} DMO & State DMG HQ.`,
      is_resolved: false,
      resolved_by_name: null,
      resolved_at: null,
    })

    // Set interactive on-map tactical alert popup
    useMapStore.getState().setActiveGeofenceAlertPopup({
      id: Date.now(),
      vehicleNumber: veh.vehicle_number,
      driverName: veh.driver_name,
      eventType: eventType === 'ENTRY' ? 'ENTRY' : 'EXIT',
      zoneName: targetGeofence.name,
      zoneType: targetGeofence.typeDisplay,
      district: veh.assigned_district,
      speedKmh: veh.current_speed_kmh,
      timestamp: new Date().toLocaleTimeString(),
      lon: veh.last_lon ?? 78.4867,
      lat: veh.last_lat ?? 17.3850,
      severity: 'CRITICAL',
      vehicleId: veh.id,
    })

    // Show instant dual notification toast
    toast.custom((t) => (
      <div
        className={clsx(
          'max-w-md w-full bg-slate-900 border text-white rounded-lg shadow-2xl p-4 transition-all duration-300 pointer-events-auto',
          eventType === 'ENTRY' ? 'border-emerald-500' : 'border-blue-500',
          t.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
      >
        <div className="flex items-start gap-3">
          <div className={clsx(
            'p-2 rounded-lg font-bold text-xs flex-shrink-0',
            eventType === 'ENTRY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
          )}>
            {eventType === 'ENTRY' ? 'GEOFENCE ENTRY' : 'GEOFENCE EXIT'}
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold flex items-center justify-between">
              <span className="font-mono text-amber-300 font-extrabold text-sm">Vehicle {veh.vehicle_number}</span>
              <span className="text-[10px] text-slate-400 font-mono">{newAlert.speedKmh} km/h</span>
            </div>
            <div className="text-slate-300 mt-0.5">
              Vehicle <strong className="text-white font-mono">{veh.vehicle_number}</strong> {eventType === 'ENTRY' ? 'entered' : 'departed'} <strong>{targetGeofence.name}</strong>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800 space-y-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <CheckCircle2 size={12} className="text-emerald-400" />
                <span>District Authority: {veh.assigned_district} DMO notified</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                <CheckCircle2 size={12} className="text-emerald-400" />
                <span>State Authority: Director of Mines &amp; Geology notified</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedVideoVehicle(veh)
                  setSelectedGeofenceForVideo(targetGeofence.name)
                  toast.dismiss(t.id)
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Video size={11} /> Watch Live Video Feed
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-2 py-1 text-slate-400 hover:text-white text-[11px]"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    ), { duration: 8000 })
  }

  const handleOpenVideoForVehicle = (vehNumber: string, zoneName: string) => {
    const v = REAL_NETRADYNE_VEHICLES.find((item) => item.vehicle_number === vehNumber) || REAL_NETRADYNE_VEHICLES[0]
    setSelectedVideoVehicle(v)
    setSelectedGeofenceForVideo(zoneName)
  }

  const handleOpenEdit = (zone: GeofenceZone) => {
    setEditingZone(zone)
    setEditName(zone.name)
    setEditType(zone.type)
    setEditSpeedLimit(zone.speedLimitKmh)
    setEditStatus((zone.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE') as 'ACTIVE' | 'PAUSED')
    setEditTriggers([...zone.alertTriggers])
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingZone) return
    if (!editName.trim()) {
      toast.error('Please enter a valid geofence name')
      return
    }

    const updatedZone: GeofenceZone = {
      ...editingZone,
      name: editName.trim(),
      type: editType,
      typeDisplay:
        editType === 'QUARRY_BOUNDARY'
          ? 'Quarry Boundary Enclosure'
          : editType === 'TRANSIT_CORRIDOR'
          ? 'Designated Mineral Transit Corridor'
          : editType === 'BUFFER_RESTRICTION'
          ? 'Prohibited Eco-Buffer'
          : 'River Sand Reach Boundary',
      speedLimitKmh: Number(editSpeedLimit),
      status: editStatus,
      alertTriggers: editTriggers,
      color:
        editType === 'BUFFER_RESTRICTION'
          ? '#DC2626'
          : editType === 'TRANSIT_CORRIDOR'
          ? '#16A34A'
          : '#0284C7',
    }

    setGeofences((prev) => prev.map((g) => (g.id === editingZone.id ? updatedZone : g)))
    setEditingZone(null)
    toast.success(`Geofence "${updatedZone.name}" updated successfully!`, {
      icon: '✏️',
      style: { background: '#064E3B', color: '#ECFDF5' },
    })
  }

  const toggleEditTrigger = (trigger: string) => {
    setEditTriggers((prev) =>
      prev.includes(trigger) ? prev.filter((t) => t !== trigger) : [...prev, trigger]
    )
  }

  const handleToggleStatus = (id: string) => {
    setGeofences((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const nextStatus = g.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
          toast.success(`Geofence "${g.name}" radar tracking is now ${nextStatus}.`, {
            icon: nextStatus === 'ACTIVE' ? '🛡️' : '⏸️',
          })
          return { ...g, status: nextStatus }
        }
        return g
      })
    )
  }

  const handleDelete = (id: string, name: string) => {
    if (!perms.canManageGeofences) {
      toast.error('Permission Denied: Your assigned role cannot delete statutory geofences.')
      return
    }
    if (confirm(`Are you sure you want to permanently delete and remove geofence "${name}"?`)) {
      setGeofences((prev) => prev.filter((g) => g.id !== id))
      toast.success(`Geofence "${name}" (${id}) removed from system.`, {
        icon: '🗑️',
      })
    }
  }

  const handleSaveApiKeys = (e: React.FormEvent) => {
    e.preventDefault()
    setShowApiModal(false)
    toast.success('Fleet Telematics API Credentials verified & synchronized!', {
      icon: '🔑',
      style: { background: '#064E3B', color: '#ECFDF5' },
    })
  }

  return (
    <div className="flex-1 bg-slate-100 p-4 sm:p-6 overflow-y-auto custom-scrollbar font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Statutory Header Banner ── */}
        <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full border-2 border-gov-600 bg-blue-50/50 flex items-center justify-center p-1 shadow-xs flex-shrink-0">
              <ShieldAlert size={24} className="text-gov-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-gov-700 tracking-tight">
                  Fleet Geofence Surveillance &amp; Green Zone Control
                </h1>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300 uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Cloud API v2.4 Active
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Automated vehicle ingress/egress notifications routed to <strong>Respective District Authority</strong> &amp; <strong>State Directorate</strong> with live AI video feeds.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              onClick={() => setShowApiModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              title="Configure Fleet Telematics API Gateway & Webhook"
            >
              <Key size={14} className="text-gov-600" />
              <span>Fleet API Gateway</span>
            </button>

            <button
              onClick={handleStartDrawOnMap}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Draw new polygon geofence directly on the live GIS cadastral map"
            >
              <PenLine size={15} />
              <span>Draw Polygon on Map</span>
            </button>

            <button
              onClick={() => {
                setShowCreateModal(true)
                setGeomMethod('POINTS')
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={15} />
              <span>Setup New Geofence</span>
            </button>
          </div>
        </div>

        {/* ── Key Operational Metrics Strip ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-600 font-bold mb-1">
              <span>Active Mining Geofences</span>
              <Shield size={16} className="text-gov-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{geofences.length} <span className="text-xs font-normal text-slate-500">Perimeters</span></div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-1">100% Boundary Monitored</div>
          </div>

          <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-600 font-bold mb-1">
              <span>Trucks Inside Zones</span>
              <Truck size={16} className="text-emerald-700" />
            </div>
            <div className="text-2xl font-black text-emerald-800">
              {geofences.reduce((s, g) => s + g.activeTrucks, 0)} <span className="text-xs font-normal text-slate-500">Active</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Live GPS Telematics tracking</div>
          </div>

          <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-600 font-bold mb-1">
              <span>Green Zone Compliance</span>
              <Leaf size={16} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700">99.4%</div>
            <div className="text-[11px] text-emerald-800 font-semibold mt-1">Zero Buffer Encroachments</div>
          </div>

          <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-600 font-bold mb-1">
              <span>Authority Alert Target</span>
              <MapPin size={16} className="text-gov-600" />
            </div>
            <div className="text-base font-black text-slate-900 truncate">
              {isRestricted ? `${jurisdiction.name} DMO` : '33 Districts & State HQ'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Dual-level push routing active
            </div>
          </div>
        </div>

        {/* ── Main Geofence Sub-Navigation Bar ── */}
        <div className="bg-white border border-slate-300 rounded-lg p-2 shadow-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('ZONES')}
              className={clsx(
                'flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all cursor-pointer',
                activeTab === 'ZONES'
                  ? 'bg-gov-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              <Shield size={14} />
              <span>Mining Zones &amp; Perimeters ({geofences.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('ALERTS')}
              className={clsx(
                'flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all cursor-pointer relative',
                activeTab === 'ALERTS'
                  ? 'bg-gov-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              <Bell size={14} />
              <span>Live Ingress/Egress Alerts</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-red-600 text-white">
                {liveAlerts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('GREEN_ZONE')}
              className={clsx(
                'flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all cursor-pointer',
                activeTab === 'GREEN_ZONE'
                  ? 'bg-gov-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              <Leaf size={14} />
              <span>Green Zone &amp; Eco Statistics</span>
            </button>
          </div>

          {/* Quick Simulation Trigger Button */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">Test Alert Engine:</span>
            <button
              onClick={() => handleSimulateGeofenceEvent('ENTRY')}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="Simulate a vehicle entering the mining zone"
            >
              <Send size={12} className="text-emerald-600" />
              <span>Simulate Zone Entry</span>
            </button>
            <button
              onClick={() => handleSimulateGeofenceEvent('EXIT')}
              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="Simulate a vehicle leaving the mining zone"
            >
              <Send size={12} className="text-blue-600" />
              <span>Simulate Zone Exit</span>
            </button>
          </div>
        </div>

        {/* ── TAB 1: MINING ZONES & PERIMETERS ── */}
        {activeTab === 'ZONES' && (
          <div className="space-y-4">
            {/* Filter Pills */}
            <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-xs flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-slate-500" />
                <span className="font-bold text-slate-700">Filter Classification:</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'ALL', label: 'All Zones' },
                  { id: 'QUARRY_BOUNDARY', label: 'Quarry Boundaries' },
                  { id: 'TRANSIT_CORRIDOR', label: 'Transit Corridors' },
                  { id: 'BUFFER_RESTRICTION', label: 'Eco-Buffers' },
                  { id: 'SAND_REACH', label: 'Sand Reaches' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFilterType(t.id)}
                    className={clsx(
                      'px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer',
                      filterType === t.id
                        ? 'bg-gov-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Geofence Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {geofences
                .filter((g) => filterType === 'ALL' || g.type === filterType)
                .map((zone) => (
                  <div
                    key={zone.id}
                    className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs flex flex-col justify-between hover:border-gov-400 transition-all"
                  >
                    <div>
                      {/* Top Bar of Card */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: zone.color }}
                          />
                          <span className="font-mono text-xs font-bold text-gov-800 bg-gov-50 px-2 py-0.5 rounded border border-gov-200">
                            {zone.id}
                          </span>
                          <span
                            className={clsx(
                              'text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase',
                              zone.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            )}
                          >
                            {zone.status}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] font-bold text-slate-500">Speed Limit</span>
                          <div className="text-xs font-black text-slate-800">{zone.speedLimitKmh} km/h</div>
                        </div>
                      </div>

                      <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                        {zone.name}
                      </h3>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Type: <strong className="text-slate-700">{zone.typeDisplay}</strong>
                      </div>

                      {/* Location details */}
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">District / Mandal:</span>
                          <span className="font-semibold text-slate-800">
                            {zone.district} District · {zone.mandal} Mandal
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Geometry Scope:</span>
                          <span className="font-medium text-slate-700">{zone.coordinatesSummary}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Live Active Fleet:</span>
                          <span className="font-bold text-emerald-700 flex items-center gap-1">
                            <Radio size={11} className="animate-pulse" /> {zone.activeTrucks} Vehicles Inside
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Violations Recorded:</span>
                          <span
                            className={clsx(
                              'font-bold',
                              zone.violationCount > 0 ? 'text-amber-700' : 'text-slate-600'
                            )}
                          >
                            {zone.violationCount} Breaches
                          </span>
                        </div>
                      </div>

                      {/* Configured Triggers */}
                      <div className="mt-3">
                        <div className="text-[11px] font-bold text-slate-600 uppercase mb-1">
                          Automated Ingress/Egress Triggers:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {zone.alertTriggers.map((trig, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-medium"
                            >
                              {trig}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        {onOpenMap && (
                          <button
                            onClick={onOpenMap}
                            className="px-3 py-1.5 bg-gov-600 hover:bg-gov-700 text-white rounded font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>View on Map</span>
                          </button>
                        )}
                        <button
                          onClick={() => setInspectingZone(zone)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded font-semibold transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
                          title="Inspect Geofence Boundary Coordinates"
                        >
                          <MapPin size={13} className="text-gov-600" />
                          <span>{zone.points ? `${zone.points.length} Pts` : zone.centerPoint ? 'Center Pt' : 'Coordinates'}</span>
                        </button>
                        <button
                          onClick={() => handleOpenVideoForVehicle('TS-07-EA-4122', zone.name)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
                          title="Live In-Cabin / Road Telematics Stream"
                        >
                          <Video size={13} className="text-emerald-700" />
                          <span>Video</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(zone.id)}
                          className={clsx(
                            'px-2.5 py-1.5 border rounded font-bold transition-colors flex items-center gap-1.5 cursor-pointer text-xs',
                            zone.status === 'PAUSED'
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                          )}
                          title={zone.status === 'PAUSED' ? 'Resume Radar Telematics Tracking' : 'Pause Radar Tracking'}
                        >
                          {zone.status === 'PAUSED' ? (
                            <>
                              <Play size={13} className="text-amber-600" />
                              <span>Resume</span>
                            </>
                          ) : (
                            <>
                              <Pause size={13} className="text-slate-600" />
                              <span>Pause</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(zone)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-bold transition-colors flex items-center gap-1 cursor-pointer text-xs"
                          title="Edit Geofence Name, Speed Limit, Status & Triggers"
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(zone.id, zone.name)}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded font-bold transition-colors flex items-center gap-1 cursor-pointer text-xs"
                          title="Permanently Delete and Remove Geofence"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── TAB 2: LIVE ENTRY/EXIT ALERTS & AUTHORITY ROUTING ── */}
        {activeTab === 'ALERTS' && (
          <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Bell size={16} className="text-gov-600" />
                  Live Mining Zone Ingress &amp; Egress Notification Stream
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time geofence cross-boundary alerts automatically dispatched to the authorized District Officer and State Enforcement Directorate.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">{liveAlerts.length} Events Logged Today</span>
              </div>
            </div>

            <div className="space-y-3">
              {liveAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-gov-400 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border',
                          alert.eventType === 'ENTRY'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : alert.eventType === 'EXIT'
                            ? 'bg-blue-100 text-blue-900 border-blue-300'
                            : 'bg-red-100 text-red-900 border-red-300'
                        )}
                      >
                        {alert.eventType === 'ENTRY' ? 'ZONE ENTRY' : alert.eventType === 'EXIT' ? 'ZONE EXIT' : 'UNAUTHORIZED INGRESS'}
                      </span>

                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {alert.vehicleNumber}
                      </span>
                      <span className="text-[10px] text-slate-500">({alert.vehicleType})</span>
                      <span className="text-[10px] text-slate-400 font-mono">· {alert.timestamp}</span>
                    </div>

                    <div className="text-xs text-slate-700">
                      Driver: <strong>{alert.driverName}</strong> | Zone: <strong>{alert.zoneName}</strong> ({alert.zoneId}) | Speed: <strong className="text-gov-700">{alert.speedKmh} km/h</strong>
                    </div>

                    {/* Dual-Level Authority Notification Routing Confirmation */}
                    <div className="p-2 bg-white rounded border border-slate-200 space-y-1 text-[11px]">
                      <div className="flex items-center gap-2 text-amber-900">
                        <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                        <span><strong>District Authority Notified:</strong> {alert.districtAuthorityNotified}</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-950">
                        <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                        <span><strong>State Directorate Notified:</strong> {alert.stateAuthorityNotified}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start md:self-center flex-shrink-0">
                    <button
                      onClick={() => handleOpenVideoForVehicle(alert.vehicleNumber, alert.zoneName)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Video size={13} />
                      <span>Live Video</span>
                    </button>
                    {onOpenMap && (
                      <button
                        onClick={onOpenMap}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-semibold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <MapPin size={13} className="text-gov-600" />
                        <span>Map</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: GREEN ZONE & ECO-BUFFER STATISTICS ── */}
        {activeTab === 'GREEN_ZONE' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-600 font-bold mb-2">
                  <span>Eco-Buffer Adherence Rate</span>
                  <Leaf size={18} className="text-emerald-600" />
                </div>
                <div className="text-3xl font-black text-emerald-700">99.4%</div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Percentage of active mineral trips maintaining 100% boundary separation from prohibited water bodies &amp; reserved forests.
                </p>
              </div>

              <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-600 font-bold mb-2">
                  <span>Zero-Breach Transit Hours</span>
                  <Activity size={18} className="text-gov-600" />
                </div>
                <div className="text-3xl font-black text-slate-900">1,420 <span className="text-xs font-normal text-slate-500">Hours</span></div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Cumulative operating fleet time inside approved commercial corridors without unauthorized diversions into green buffers.
                </p>
              </div>

              <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-600 font-bold mb-2">
                  <span>Idle Engine Emissions in Zones</span>
                  <Flame size={18} className="text-amber-600" />
                </div>
                <div className="text-3xl font-black text-amber-700">0 <span className="text-xs font-normal text-slate-500">Violations</span></div>
                <p className="text-[11px] text-slate-500 mt-2">
                  IoT idle sensors detect zero unauthorized truck idling inside eco-sensitive zones beyond the 10-minute threshold.
                </p>
              </div>
            </div>

            {/* Environmental Zones Ledger */}
            <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" />
                Telangana Eco-Sensitive Mineral Buffer Zone Registry
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-300 text-slate-600 uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2.5">Zone Identifier</th>
                      <th className="px-3 py-2.5">Protected Feature</th>
                      <th className="px-3 py-2.5">District / Jurisdiction</th>
                      <th className="px-3 py-2.5">Buffer Radius</th>
                      <th className="px-3 py-2.5">Speed Cap</th>
                      <th className="px-3 py-2.5">Enforcement Protocol</th>
                      <th className="px-3 py-2.5">Compliance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-mono font-bold text-gov-700">GF-RR-003</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">Shadnagar Lake Wetland Buffer</td>
                      <td className="px-3 py-2.5">Rangareddy (Farooqnagar)</td>
                      <td className="px-3 py-2.5 font-mono">250 Meters</td>
                      <td className="px-3 py-2.5">20 km/h</td>
                      <td className="px-3 py-2.5">Zero Mineral Extraction Allowed</td>
                      <td className="px-3 py-2.5">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">
                          100% COMPLIANT
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-mono font-bold text-gov-700">GF-NZB-004</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">Godavari Riverbed Sanctuary Reach</td>
                      <td className="px-3 py-2.5">Nizamabad (Kotgiri)</td>
                      <td className="px-3 py-2.5 font-mono">500 Meters</td>
                      <td className="px-3 py-2.5">30 km/h</td>
                      <td className="px-3 py-2.5">De-siltation only with valid e-Permit</td>
                      <td className="px-3 py-2.5">
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px]">
                          MONITORED
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-mono font-bold text-gov-700">GF-VKB-005</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">Ananthagiri Reserved Forest Fringe</td>
                      <td className="px-3 py-2.5">Vikarabad (Vikarabad Mandal)</td>
                      <td className="px-3 py-2.5 font-mono">1,000 Meters</td>
                      <td className="px-3 py-2.5">30 km/h</td>
                      <td className="px-3 py-2.5">Strict Limestone Transit Corridor Lock</td>
                      <td className="px-3 py-2.5">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">
                          100% COMPLIANT
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── MODAL 1: NETRADYNE LIVE VIDEO STREAMING & TELEMATICS MODAL ── */}
      <NetradyneVideoModal
        vehicle={selectedVideoVehicle}
        isOpen={Boolean(selectedVideoVehicle)}
        onClose={() => setSelectedVideoVehicle(null)}
        currentGeofenceName={selectedGeofenceForVideo}
      />

      {/* ── MODAL 2: FLEET TELEMATICS API CREDENTIALS & WEBHOOK SETTINGS ── */}
      {showApiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-fade-in">
          <div className="bg-white border border-slate-300 w-full max-w-lg rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 bg-gov-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Key size={18} className="text-amber-300" />
                <div>
                  <h3 className="font-extrabold text-sm">Fleet Telematics API Gateway &amp; Cloud Webhook</h3>
                  <p className="text-[11px] text-blue-100">Configure AI Fleet Telematics &amp; Geofence Integration Keys</p>
                </div>
              </div>
              <button
                onClick={() => setShowApiModal(false)}
                className="text-white/80 hover:text-white p-1 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveApiKeys} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Cloud API Status: Authenticated &amp; Linked</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Target Fleet: <strong className="font-mono">{netradyneFleetName}</strong>. Real-time ADAS forward telematics, DMS driver surveillance, and geofence entry/exit alerts are active.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Client ID: *
                </label>
                <input
                  type="text"
                  required
                  value={netradyneClientId}
                  onChange={(e) => setNetradyneClientId(e.target.value)}
                  placeholder="Enter Telematics Client ID..."
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 font-mono text-xs text-slate-800 outline-none focus:border-gov-600 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Client Secret: *
                </label>
                <input
                  type="password"
                  required
                  value={netradyneClientSecret}
                  onChange={(e) => setNetradyneClientSecret(e.target.value)}
                  placeholder="Enter Telematics Client Secret..."
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 font-mono text-xs text-slate-800 outline-none focus:border-gov-600 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Fleet Unique Name (Fleet ID): *
                </label>
                <input
                  type="text"
                  required
                  value={netradyneFleetName}
                  onChange={(e) => setNetradyneFleetName(e.target.value)}
                  placeholder="e.g. N504553548819474"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 font-mono text-xs text-slate-800 outline-none focus:border-gov-600 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  MineGIS Webhook Endpoint (Auto-configured):
                </label>
                <input
                  type="text"
                  value={webhookUrl}
                  readOnly
                  className="w-full bg-slate-100 border border-slate-300 rounded px-3 py-2 font-mono text-[11px] text-slate-600 select-all"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Cloud telematics webhook dispatches instant SMS, Push &amp; Ledger notifications to District &amp; State Authorities.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowApiModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Save &amp; Verify Fleet Connection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: SETUP NEW GEOFENCE WIZARD ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-fade-in overflow-y-auto">
          <div className="bg-white border border-slate-300 w-full max-w-3xl rounded-xl overflow-hidden shadow-2xl flex flex-col my-8">
            <div className="px-6 py-4 bg-gov-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-amber-300" />
                <div>
                  <h3 className="font-extrabold text-sm">Configure Statutory Mining Geofence</h3>
                  <p className="text-[11px] text-gov-100">
                    Jurisdiction: <strong>{jurisdiction.name}</strong> · AI Boundary Demarcation &amp; Ingress/Egress Alerting
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/80 hover:text-white p-1 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGeofence} className="p-6 space-y-5 text-xs max-h-[82vh] overflow-y-auto">
              {/* General Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Geofence Perimeter Name: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tandur Limestone Quarry Sector-A"
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 outline-none focus:border-gov-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Zone Classification:
                  </label>
                  <select
                    value={newZoneType}
                    onChange={(e) => setNewZoneType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-gov-600"
                  >
                    <option value="QUARRY_BOUNDARY">Quarry Boundary Enclosure</option>
                    <option value="TRANSIT_CORRIDOR">Mineral Transit Corridor</option>
                    <option value="BUFFER_RESTRICTION">Prohibited Eco-Buffer</option>
                    <option value="SAND_REACH">River Sand Reach</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mandal / Sub-District:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tandur Mandal"
                    value={newZoneMandal}
                    onChange={(e) => setNewZoneMandal(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 outline-none focus:border-gov-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Speed Limit Inside Zone:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={10}
                      max={80}
                      value={newSpeedLimit}
                      onChange={(e) => setNewSpeedLimit(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-gov-600"
                    />
                    <span className="text-slate-500 font-bold">km/h</span>
                  </div>
                </div>
              </div>

              {/* ── GEOMETRY DEMARCATION MODE TABS ── */}
              <div className="border border-slate-300 rounded-lg overflow-hidden bg-slate-50/50">
                <div className="bg-slate-100 border-b border-slate-300 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Compass size={15} className="text-gov-700" />
                    <span className="font-extrabold text-xs text-slate-800">Perimeter Demarcation &amp; Points Definition:</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-md p-0.5">
                    <button
                      type="button"
                      onClick={() => setGeomMethod('POINTS')}
                      className={clsx(
                        'px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                        geomMethod === 'POINTS'
                          ? 'bg-gov-600 text-white shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      <MapPin size={12} />
                      <span>Set Points Table ({points.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGeomMethod('DRAW_MAP')}
                      className={clsx(
                        'px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                        geomMethod === 'DRAW_MAP'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      <PenLine size={12} />
                      <span>Draw Polygon on Map</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGeomMethod('BUFFER')}
                      className={clsx(
                        'px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                        geomMethod === 'BUFFER'
                          ? 'bg-gov-600 text-white shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      <Radio size={12} />
                      <span>Radial Buffer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGeomMethod('LEASE')}
                      className={clsx(
                        'px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                        geomMethod === 'LEASE'
                          ? 'bg-gov-600 text-white shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      <FileText size={12} />
                      <span>Attach Lease</span>
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  {/* TAB 1: POINTS TABLE */}
                  {geomMethod === 'POINTS' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                        <span className="text-slate-600">
                          Enter or fine-tune exact <strong>Latitude / Longitude coordinates</strong> (WGS84 / EPSG:4326) for each polygon corner:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handlePreFillSample}
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-gov-700 rounded font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            title="Load pre-surveyed sample points for your district"
                          >
                            <RotateCcw size={11} />
                            <span>Pre-fill {jurisdiction.name} Sample Points</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleAddPoint}
                            className="px-2.5 py-1 bg-gov-600 hover:bg-gov-700 text-white rounded font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Plus size={12} />
                            <span>Add Vertex</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleClearPoints}
                            className="px-2 py-1 text-slate-400 hover:text-red-600 transition-colors"
                            title="Reset Points"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {/* Coordinates Table */}
                      <div className="border border-slate-300 rounded-lg overflow-hidden bg-white max-h-56 overflow-y-auto shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                            <tr>
                              <th className="py-2 px-3 w-12 text-center">#</th>
                              <th className="py-2 px-3">Vertex Identifier / Label</th>
                              <th className="py-2 px-3">Latitude (°N)</th>
                              <th className="py-2 px-3">Longitude (°E)</th>
                              <th className="py-2 px-3 w-16 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {points.map((pt, idx) => (
                              <tr key={pt.id} className="hover:bg-blue-50/40 transition-colors">
                                <td className="py-2 px-3 font-mono font-bold text-center text-slate-500 text-[11px]">
                                  P{idx + 1}
                                </td>
                                <td className="py-1 px-3">
                                  <input
                                    type="text"
                                    value={pt.label || `Point ${idx + 1}`}
                                    onChange={(e) => handlePointChange(pt.id, 'label', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 outline-none focus:border-gov-600"
                                  />
                                </td>
                                <td className="py-1 px-3">
                                  <input
                                    type="number"
                                    step="0.000001"
                                    value={pt.lat}
                                    onChange={(e) => handlePointChange(pt.id, 'lat', e.target.value)}
                                    className="w-full font-mono bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 outline-none focus:border-gov-600 font-semibold"
                                  />
                                </td>
                                <td className="py-1 px-3">
                                  <input
                                    type="number"
                                    step="0.000001"
                                    value={pt.lng}
                                    onChange={(e) => handlePointChange(pt.id, 'lng', e.target.value)}
                                    className="w-full font-mono bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 outline-none focus:border-gov-600 font-semibold"
                                  />
                                </td>
                                <td className="py-1 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePoint(pt.id)}
                                    disabled={points.length <= 3}
                                    className={clsx(
                                      'p-1 rounded transition-colors',
                                      points.length <= 3
                                        ? 'text-slate-300 cursor-not-allowed'
                                        : 'text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                                    )}
                                    title={points.length <= 3 ? 'Minimum 3 points required for polygon' : 'Remove Vertex'}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Live Calculated Geometry Metrics Strip */}
                      <div className="bg-emerald-50/70 border border-emerald-300 rounded-lg p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-emerald-800 font-bold">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            <span>Closed Polygon: {points.length} Vertices</span>
                          </div>
                          <span className="text-slate-300">|</span>
                          <div className="text-slate-700">
                            Surface Area: <strong className="text-emerald-900 font-mono text-sm">{calculatePolygonAreaHa(points)} Ha</strong> ({(calculatePolygonAreaHa(points) * 2.471).toFixed(1)} Acres)
                          </div>
                          <span className="text-slate-300">|</span>
                          <div className="text-slate-700">
                            Perimeter: <strong className="text-slate-900 font-mono">{calculatePerimeterKm(points)} km</strong>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleStartDrawOnMap}
                          className="text-gov-700 hover:text-gov-800 font-bold underline flex items-center gap-1 cursor-pointer"
                        >
                          <PenLine size={12} />
                          <span>Prefer drawing on map? Click here</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: DRAW POLYGON ON MAP */}
                  {geomMethod === 'DRAW_MAP' && (
                    <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-center flex-shrink-0 text-emerald-600">
                          <Crosshair size={26} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-extrabold text-sm text-slate-900">
                            Interactive GIS Boundary Demarcation on Map
                          </h4>
                          <p className="text-slate-600 mt-1 leading-relaxed">
                            Click below to jump directly onto Telangana's high-resolution satellite basemap. You will be able to click on any quarry perimeter, crusher site, or transit gate to plot vertices.
                          </p>
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-slate-700 font-medium bg-slate-50 p-2.5 rounded border border-slate-200">
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">1</span>
                              <span>Click on map to place points</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">2</span>
                              <span>Trace boundary corners</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">3</span>
                              <span>Double-click to complete</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                        <div className="text-slate-500">
                          {points.length >= 3 ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 size={13} />
                              Current captured polygon has {points.length} vertices ({calculatePolygonAreaHa(points)} Ha)
                            </span>
                          ) : (
                            <span>No custom map drawing captured yet.</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handleStartDrawOnMap}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer text-xs"
                        >
                          <PenLine size={15} />
                          <span>Launch Map Drawing Mode Now</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: RADIAL BUFFER */}
                  {geomMethod === 'BUFFER' && (
                    <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-4">
                      <p className="text-slate-600">
                        Define a circular buffer perimeter around an extraction centroid or eco-sensitive zone:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Center Latitude (°N):</label>
                          <input
                            type="number"
                            step="0.000001"
                            value={centerLat}
                            onChange={(e) => setCenterLat(Number(e.target.value))}
                            className="w-full font-mono bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-gov-600"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Center Longitude (°E):</label>
                          <input
                            type="number"
                            step="0.000001"
                            value={centerLng}
                            onChange={(e) => setCenterLng(Number(e.target.value))}
                            className="w-full font-mono bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-gov-600"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="font-bold text-slate-700">Radial Buffer Radius:</label>
                          <span className="font-black text-gov-800 text-sm font-mono">{newBufferRadius} Meters</span>
                        </div>
                        <input
                          type="range"
                          min={50}
                          max={2000}
                          step={25}
                          value={newBufferRadius}
                          onChange={(e) => setNewBufferRadius(Number(e.target.value))}
                          className="w-full accent-gov-600 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                          <span>50 m (Local Site)</span>
                          <span>500 m (Statutory Buffer)</span>
                          <span>2,000 m (Catchment Zone)</span>
                        </div>
                      </div>

                      <div className="bg-blue-50/70 border border-blue-200 rounded p-2.5 text-xs text-blue-900 flex items-center justify-between">
                        <span>Calculated Buffer Coverage:</span>
                        <strong className="font-mono">
                          {((Math.PI * newBufferRadius * newBufferRadius) / 10000).toFixed(2)} Hectares
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: ATTACH MINING LEASE */}
                  {geomMethod === 'LEASE' && (
                    <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-4">
                      <p className="text-slate-600">
                        Inherit statutory coordinates directly from an active cadastral lease surveyed in <strong>{jurisdiction.name}</strong>:
                      </p>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Select Registered Concession / Lease:
                        </label>
                        <select
                          value={selectedLeaseId}
                          onChange={(e) => handleAttachLease(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-gov-600"
                        >
                          <option value="">-- Choose Mining Lease from District Registry --</option>
                          {MOCK_LEASES.filter(
                            (l) => !isRestricted || l.district.toLowerCase() === jurisdiction.name.toLowerCase()
                          ).map((l) => (
                            <option key={l.id} value={l.lease_id}>
                              {l.lease_id} - {l.mine_name || l.leaseholder_name} ({l.mineral_display || l.mineral_type}, {l.mandal} Mandal - {l.area_hectares} Ha)
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedLeaseId && (
                        <div className="bg-emerald-50 border border-emerald-300 rounded p-3 text-xs space-y-1">
                          <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            Cadastral Boundary Coordinates Loaded!
                          </div>
                          <p className="text-emerald-800 text-[11px]">
                            Boundary vertices have been automatically populated into the Points Table. You can review or adjust any corner points by switching to the <strong>Set Points Table</strong> tab above.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Notification Routing Protocol */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-700 block">Statutory Alert Notification Routing:</span>
                <p className="text-[11px] text-slate-500">
                  Any vehicle crossing into or out of this geofence will automatically dispatch real-time alerts to the <strong>{isRestricted ? `${jurisdiction.name} DMO` : 'Authorized District Officer'}</strong> and <strong>State Director of Mines &amp; Geology</strong> with live video links.
                </p>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleStartDrawOnMap}
                  className="px-3 py-2 text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <PenLine size={13} />
                  <span>Switch to Map to Draw Polygon</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Activate Geofence
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT GEOFENCE PARAMETERS ── */}
      {editingZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-fade-in overflow-y-auto">
          <div className="bg-white border border-slate-300 w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl flex flex-col my-8">
            <div className="px-6 py-4 bg-gov-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-amber-300" />
                <div>
                  <h3 className="font-extrabold text-sm">Edit Geofence Parameters</h3>
                  <p className="text-[11px] text-gov-100">ID: {editingZone.id} · {editingZone.district} District</p>
                </div>
              </div>
              <button
                onClick={() => setEditingZone(null)}
                className="text-white/80 hover:text-white p-1 rounded-md hover:bg-gov-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Geofence Name:
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-600 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Geofence Classification:
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as GeofenceZone['type'])}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-600 font-medium"
                  >
                    <option value="QUARRY_BOUNDARY">Quarry Boundary Enclosure</option>
                    <option value="TRANSIT_CORRIDOR">Mineral Transit Corridor</option>
                    <option value="BUFFER_RESTRICTION">Prohibited Eco-Buffer</option>
                    <option value="SAND_REACH">River Sand Reach Boundary</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Maximum Speed Limit (km/h):
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={120}
                    value={editSpeedLimit}
                    onChange={(e) => setEditSpeedLimit(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-600 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Enforcement Status:
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'ACTIVE' | 'PAUSED')}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-600 font-medium"
                  >
                    <option value="ACTIVE">ACTIVE — Enforcing Telematics Breaches</option>
                    <option value="PAUSED">PAUSED — Suspend Active Tracking</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    District / Mandal (Jurisdiction):
                  </label>
                  <div className="bg-slate-100 border border-slate-200 rounded px-3 py-2 text-slate-700 font-semibold">
                    {editingZone.district} · {editingZone.mandal}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Automated Breach Dispatch Triggers:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {[
                    { id: 'UNAUTHORIZED_ENTRY', label: 'Unauthorized Ingress (Entry)' },
                    { id: 'UNAUTHORIZED_EXIT', label: 'Unauthorized Mineral Egress (Exit)' },
                    { id: 'SPEED_VIOLATION', label: 'Speed Limit Breach (> limit)' },
                    { id: 'NIGHT_MOVEMENT', label: 'Night Movement Breach (10PM-5AM)' },
                    { id: 'ROUTE_DEVIATION', label: 'Corridor Deviation / Straying' },
                    { id: 'IDLE_TRANSIT', label: 'Prolonged Stationary Idling (>20m)' },
                  ].map((trig) => (
                    <label
                      key={trig.id}
                      className="flex items-center gap-2 text-slate-700 cursor-pointer hover:text-slate-900"
                    >
                      <input
                        type="checkbox"
                        checked={editTriggers.includes(trig.id)}
                        onChange={() => toggleEditTrigger(trig.id)}
                        className="rounded text-gov-600 focus:ring-gov-500 h-4 w-4"
                      />
                      <span>{trig.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <ShieldCheck size={14} />
                  <span>Statutory Spatial Record</span>
                </div>
                <div>Geometry: <strong>{editingZone.coordinatesSummary}</strong></div>
                <div>Active Trucks Inside: <strong>{editingZone.activeTrucks} vehicles</strong></div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    handleDelete(editingZone.id, editingZone.name)
                    setEditingZone(null)
                  }}
                  className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded font-bold flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
                >
                  <Trash2 size={13} />
                  <span>Delete Permanently</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingZone(null)}
                    className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: INSPECT COORDINATES MODAL ── */}
      {inspectingZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-fade-in">
          <div className="bg-white border border-slate-300 w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 bg-gov-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-amber-300" />
                <div>
                  <h3 className="font-extrabold text-sm">Geofence Boundary Coordinates</h3>
                  <p className="text-[11px] text-gov-100">{inspectingZone.name} ({inspectingZone.id})</p>
                </div>
              </div>
              <button
                onClick={() => setInspectingZone(null)}
                className="text-white/80 hover:text-white p-1 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Classification:</span>
                  <strong className="text-slate-800">{inspectingZone.typeDisplay}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Mandal / District:</span>
                  <strong className="text-slate-800">{inspectingZone.mandal}, {inspectingZone.district}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Geometry Scope:</span>
                  <strong className="text-emerald-700">{inspectingZone.coordinatesSummary}</strong>
                </div>
              </div>

              {inspectingZone.points && inspectingZone.points.length > 0 ? (
                <div className="border border-slate-300 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                      <tr>
                        <th className="py-2 px-3 w-12 text-center">#</th>
                        <th className="py-2 px-3">Vertex Label</th>
                        <th className="py-2 px-3">Latitude (°N)</th>
                        <th className="py-2 px-3">Longitude (°E)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {inspectingZone.points.map((pt, idx) => (
                        <tr key={pt.id || idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-500">P{idx + 1}</td>
                          <td className="py-2 px-3 font-medium text-slate-800">{pt.label || `Point ${idx + 1}`}</td>
                          <td className="py-2 px-3 font-mono font-semibold text-slate-900">{pt.lat.toFixed(6)}</td>
                          <td className="py-2 px-3 font-mono font-semibold text-slate-900">{pt.lng.toFixed(6)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : inspectingZone.centerPoint ? (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2">
                  <div className="font-bold text-blue-900">Circular Buffer Center:</div>
                  <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                    <div>Latitude: <strong>{inspectingZone.centerPoint.lat}</strong></div>
                    <div>Longitude: <strong>{inspectingZone.centerPoint.lng}</strong></div>
                  </div>
                  <div>Radius: <strong>{inspectingZone.radiusMeters} Meters</strong></div>
                </div>
              ) : (
                <p className="text-slate-500 italic">No explicit coordinate points table stored for this legacy boundary.</p>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                {onOpenMap && (
                  <button
                    type="button"
                    onClick={() => {
                      setInspectingZone(null)
                      onOpenMap()
                    }}
                    className="px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye size={14} />
                    <span>View Boundary on Map</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setInspectingZone(null)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
