import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  Compass, Mountain, Layers, Eye, RotateCw, Play, Pause,
  Maximize2, Crosshair, ArrowLeft, ZoomIn, ZoomOut, Info,
  Truck, ShieldAlert, Sparkles, Sliders
} from 'lucide-react'
import { useMapStore } from '../../store'
import clsx from 'clsx'

// Preset Telangana Mining Concessions for 3D Geological DEM Simulation
interface Concession3DProfile {
  id: string
  name: string
  mineral: string
  district: string
  coords: [number, number] // [lon, lat]
  elevationMSL: number
  pitDepth: number
  benchCount: number
  rockColor: string
  secondaryColor: string
}

const TELANGANA_3D_MINES: Concession3DProfile[] = [
  {
    id: 'TS-KGM-COAL-001',
    name: 'Singareni Collieries OCP-IV',
    mineral: 'Coal (Anthracite / Bituminous)',
    district: 'Peddapalli (Godavarikhani)',
    coords: [79.5218, 18.7562],
    elevationMSL: 148,
    pitDepth: 96,
    benchCount: 7,
    rockColor: '#1A1D20', // deep coal black/carbonaceous shale
    secondaryColor: '#4A3B32',
  },
  {
    id: 'TS-KNR-GRN-002',
    name: 'Karimnagar Tan Brown Granite Quarry',
    mineral: 'Tan Brown Architectural Granite',
    district: 'Karimnagar',
    coords: [79.1328, 18.4386],
    elevationMSL: 265,
    pitDepth: 64,
    benchCount: 5,
    rockColor: '#7A4B3A', // porphyritic pink/brown feldspar granite
    secondaryColor: '#363435',
  },
  {
    id: 'TS-VKR-LMS-004',
    name: 'Tandur Sedimentary Limestone Pit',
    mineral: 'High-Grade Limestone (Cement Grade)',
    district: 'Vikarabad (Tandur)',
    coords: [77.5855, 17.2564],
    elevationMSL: 450,
    pitDepth: 48,
    benchCount: 4,
    rockColor: '#9E978E', // creamy grey limestone beds
    secondaryColor: '#5C554E',
  },
  {
    id: 'TS-RGD-STN-003',
    name: 'Ibrahimpatnam Royal Black Granite',
    mineral: 'Black Dolerite / Granite',
    district: 'Ranga Reddy',
    coords: [78.6480, 17.1950],
    elevationMSL: 520,
    pitDepth: 55,
    benchCount: 5,
    rockColor: '#25282A',
    secondaryColor: '#8C7A6B',
  },
  {
    id: 'TS-BDK-QTZ-008',
    name: 'Paloncha Industrial Quartz & Silica',
    mineral: 'Vein Quartz & Heavy Minerals',
    district: 'Bhadradri Kothagudem',
    coords: [80.6980, 17.5980],
    elevationMSL: 115,
    pitDepth: 42,
    benchCount: 4,
    rockColor: '#D8D4CD',
    secondaryColor: '#9C7A58',
  },
]

type ShadingMode = 'satellite' | 'hypsometric' | 'wireframe' | 'strata'

export default function Map3DView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    selectedLeaseData,
    setMapMode,
    selectLease,
    vehicles,
    vehiclesVisible,
  } = useMapStore()

  // Active Concession Profile
  const [activeMineIndex, setActiveMineIndex] = useState(0)
  const [shadingMode, setShadingMode] = useState<ShadingMode>('satellite')
  const [verticalExaggeration, setVerticalExaggeration] = useState(1.8)
  const [isDroneOrbiting, setIsDroneOrbiting] = useState(false)
  const [wireframeOverlay, setWireframeOverlay] = useState(false)
  const [showPillars, setShowPillars] = useState(true)
  const [showFleet, setShowFleet] = useState(true)
  const [cameraAltitude, setCameraAltitude] = useState(380)
  const [cameraPitch, setCameraPitch] = useState(48)
  const [cameraAzimuth, setCameraAzimuth] = useState(35)
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(true)

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const terrainMeshRef = useRef<THREE.Mesh | null>(null)
  const wireframeMeshRef = useRef<THREE.LineSegments | null>(null)
  const trucksGroupRef = useRef<THREE.Group | null>(null)
  const pillarsGroupRef = useRef<THREE.Group | null>(null)
  const waterMeshRef = useRef<THREE.Mesh | null>(null)
  const animFrameIdRef = useRef<number | null>(null)

  // Camera Orbit State
  const orbitStateRef = useRef({
    distance: 450,
    pitch: 0.85, // radians (~48 deg)
    azimuth: 0.6, // radians (~35 deg)
    target: new THREE.Vector3(0, -10, 0),
    isDragging: false,
    dragButton: 0,
    lastMouseX: 0,
    lastMouseY: 0,
  })

  // Match selected lease if available
  useEffect(() => {
    if (selectedLeaseData) {
      const matchIdx = TELANGANA_3D_MINES.findIndex(
        (m) =>
          m.id === selectedLeaseData.lease_id ||
          m.name.toLowerCase().includes(selectedLeaseData.mine_name.toLowerCase()) ||
          selectedLeaseData.mine_name.toLowerCase().includes(m.name.toLowerCase())
      )
      if (matchIdx !== -1) {
        setActiveMineIndex(matchIdx)
      }
    }
  }, [selectedLeaseData])

  const activeMine = TELANGANA_3D_MINES[activeMineIndex]

  // Procedural Geological Texture Generator for Canvas Texture
  const generateTerrainTexture = (profile: Concession3DProfile, mode: ShadingMode) => {
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 2048
    const ctx = canvas.getContext('2d')
    if (!ctx) return new THREE.Texture()

    const w = canvas.width
    const h = canvas.height
    const cx = w / 2
    const cy = h / 2

    if (mode === 'hypsometric') {
      // Hypsometric elevation tint
      const gradient = ctx.createRadialGradient(cx, cy, 50, cx, cy, w * 0.48)
      gradient.addColorStop(0, '#1E3A8A') // deep pit pool navy
      gradient.addColorStop(0.15, '#0284C7') // deep bench cyan
      gradient.addColorStop(0.35, '#0D9488') // middle bench teal
      gradient.addColorStop(0.55, '#D97706') // upper bench ochre
      gradient.addColorStop(0.75, '#65A30D') // surface green
      gradient.addColorStop(0.9, '#84CC16') // plateau grass
      gradient.addColorStop(1.0, '#475569') // outer bedrock
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)

      // Contour elevation rings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.lineWidth = 3
      for (let r = 80; r < w * 0.45; r += 70) {
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
      }
    } else if (mode === 'strata') {
      // Geological Rock Strata
      ctx.fillStyle = '#475569'
      ctx.fillRect(0, 0, w, h)

      // Alternating geological layers
      const colors = [profile.rockColor, profile.secondaryColor, '#2E3440', '#7C6F64', '#D08770']
      for (let i = 0; i < 24; i++) {
        ctx.fillStyle = colors[i % colors.length]
        const y = (h / 24) * i
        ctx.fillRect(0, y, w, h / 24)
      }
    } else {
      // Satellite Orthophoto Drone Simulation
      // 1. Surrounding Deccan vegetation & scrubland background
      ctx.fillStyle = '#6E6F56' // semi-arid Deccan plateau terrain
      ctx.fillRect(0, 0, w, h)

      // Agricultural field mosaics around mine
      ctx.fillStyle = '#5A6348'
      for (let x = 0; x < w; x += 180) {
        for (let y = 0; y < h; y += 180) {
          if (Math.hypot(x - cx, y - cy) > w * 0.38) {
            ctx.fillStyle = (x + y) % 360 === 0 ? '#4D5838' : '#737050'
            ctx.fillRect(x + 5, y + 5, 170, 170)
          }
        }
      }

      // 2. Open-cast pit excavation terrace benches (stepped concentric quarry)
      const benchLevels = profile.benchCount
      for (let b = benchLevels; b >= 1; b--) {
        const radius = (w * 0.34) * (b / benchLevels)
        const benchGrad = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius)
        
        // Rock colors
        benchGrad.addColorStop(0, profile.rockColor)
        benchGrad.addColorStop(0.7, profile.secondaryColor)
        benchGrad.addColorStop(1, '#8C857B')

        ctx.fillStyle = benchGrad
        ctx.beginPath()
        ctx.ellipse(cx, cy, radius, radius * 0.82, Math.PI / 8, 0, Math.PI * 2)
        ctx.fill()

        // Bench crest edge line
        ctx.strokeStyle = 'rgba(230, 220, 200, 0.45)'
        ctx.lineWidth = 4
        ctx.stroke()
      }

      // 3. Spiraling Haulage Roads (white/gravel tracks winding down)
      ctx.strokeStyle = '#D1C7B7'
      ctx.lineWidth = 22
      ctx.lineCap = 'round'
      ctx.beginPath()
      for (let angle = 0; angle < Math.PI * 5.5; angle += 0.05) {
        const r = (w * 0.34) * (1 - (angle / (Math.PI * 6.5)))
        const rx = cx + Math.cos(angle) * r
        const ry = cy + Math.sin(angle) * (r * 0.82)
        if (angle === 0) ctx.moveTo(rx, ry)
        else ctx.lineTo(rx, ry)
      }
      ctx.stroke()

      // 4. Overburden waste dumps (terrace heaps on northeast flank)
      const obGrad = ctx.createRadialGradient(cx + 420, cy - 380, 30, cx + 420, cy - 380, 240)
      obGrad.addColorStop(0, '#B09F82')
      obGrad.addColorStop(0.6, '#8A7A60')
      obGrad.addColorStop(1, '#65604B')
      ctx.fillStyle = obGrad
      ctx.beginPath()
      ctx.arc(cx + 420, cy - 380, 240, 0, Math.PI * 2)
      ctx.fill()

      // 5. Pit sump water pond at deepest pit floor
      const sumpGrad = ctx.createRadialGradient(cx - 30, cy + 20, 10, cx - 30, cy + 20, 90)
      sumpGrad.addColorStop(0, '#0284C7')
      sumpGrad.addColorStop(0.8, '#0369A1')
      sumpGrad.addColorStop(1, '#0C4A6E')
      ctx.fillStyle = sumpGrad
      ctx.beginPath()
      ctx.ellipse(cx - 30, cy + 20, 90, 60, -Math.PI / 6, 0, Math.PI * 2)
      ctx.fill()

      // High-resolution noise / gravel texture
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
      for (let i = 0; i < 4000; i++) {
        const rx = Math.random() * w
        const ry = Math.random() * h
        ctx.fillRect(rx, ry, 2, 2)
      }
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.generateMipmaps = true
    return texture
  }

  // Generate Procedural DEM Heightfield Vertices
  const applyDEMElevation = (
    geometry: THREE.PlaneGeometry,
    profile: Concession3DProfile,
    exaggeration: number
  ) => {
    const pos = geometry.attributes.position
    const count = pos.count

    const pitRadius = 240
    const maxDepth = (profile.pitDepth || 60) * 0.7 * exaggeration
    const benches = profile.benchCount || 5

    for (let i = 0; i < count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i) // In PlaneGeometry, Y is the other planar coordinate

      const dist = Math.hypot(x, y)

      let z = 0 // Height offset

      if (dist < pitRadius) {
        // Inside excavation pit: stepped benches
        const normalizedDist = dist / pitRadius // 0 at center, 1 at crest
        // Stepped terrace calculation
        const benchStep = Math.floor(normalizedDist * benches) / benches
        const smoothFloor = Math.pow(normalizedDist, 1.4)
        const terraceDepth = (1 - benchStep * 0.7 - smoothFloor * 0.3) * maxDepth

        z = -terraceDepth

        // Deepest sump pit depression in center
        if (dist < 45) {
          z -= 8 * exaggeration
        }
      } else {
        // Outside the pit: natural Deccan plateau rolling hills and Overburden dump
        // Rolling terrain waves
        const hill1 = Math.sin(x * 0.015) * Math.cos(y * 0.015) * 8 * exaggeration
        const hill2 = Math.sin(x * 0.03 + y * 0.02) * 5 * exaggeration
        z = hill1 + hill2

        // Overburden waste dump ridge on North-East (+X, +Y)
        const obDist = Math.hypot(x - 220, y - 200)
        if (obDist < 160) {
          const obHeight = Math.cos((obDist / 160) * Math.PI * 0.5) * 32 * exaggeration
          z += obHeight
        }
      }

      pos.setZ(i, z)
    }

    geometry.computeVertexNormals()
    pos.needsUpdate = true
  }

  // 3D Scene Initialization & Loop
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // 1. Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0F172A') // Slate-900 atmosphere
    scene.fog = new THREE.FogExp2('#0F172A', 0.0012)
    sceneRef.current = scene

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 5, 3000)
    cameraRef.current = camera

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer

    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // 4. Lights
    const ambientLight = new THREE.AmbientLight('#E2E8F0', 0.85)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight('#FFFBEB', 1.8)
    sunLight.position.set(250, 450, 200)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.camera.near = 50
    sunLight.shadow.camera.far = 1000
    sunLight.shadow.camera.left = -400
    sunLight.shadow.camera.right = 400
    sunLight.shadow.camera.top = 400
    sunLight.shadow.camera.bottom = -400
    scene.add(sunLight)

    const skyLight = new THREE.HemisphereLight('#38BDF8', '#78350F', 0.6)
    scene.add(skyLight)

    // 5. Geological Terrain Surface Mesh
    const planeGeo = new THREE.PlaneGeometry(800, 800, 160, 160)
    planeGeo.rotateX(-Math.PI / 2) // Orient horizontally (XZ plane, Y is elevation)

    applyDEMElevation(planeGeo, activeMine, verticalExaggeration)

    const terrainTex = generateTerrainTexture(activeMine, shadingMode)
    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTex,
      roughness: 0.82,
      metalness: 0.12,
      flatShading: shadingMode === 'strata',
    })

    const terrainMesh = new THREE.Mesh(planeGeo, terrainMat)
    terrainMesh.receiveShadow = true
    terrainMesh.castShadow = true
    scene.add(terrainMesh)
    terrainMeshRef.current = terrainMesh

    // 6. Wireframe Mesh Overlay (TIN)
    const wireframeGeo = new THREE.WireframeGeometry(planeGeo)
    const wireframeMat = new THREE.LineBasicMaterial({
      color: '#38BDF8',
      transparent: true,
      opacity: 0.28,
    })
    const wireframeMesh = new THREE.LineSegments(wireframeGeo, wireframeMat)
    wireframeMesh.visible = wireframeOverlay
    scene.add(wireframeMesh)
    wireframeMeshRef.current = wireframeMesh

    // 7. Sump Pond Water Surface Mesh (Deepest Bench)
    const waterGeo = new THREE.CircleGeometry(55, 32)
    waterGeo.rotateX(-Math.PI / 2)
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#0284C7',
      roughness: 0.1,
      metalness: 0.7,
      transparent: true,
      opacity: 0.75,
    })
    const waterMesh = new THREE.Mesh(waterGeo, waterMat)
    waterMesh.position.set(-15, -(activeMine.pitDepth * 0.68 * verticalExaggeration), 10)
    scene.add(waterMesh)
    waterMeshRef.current = waterMesh

    // 8. Concession DGPS Boundary Pillars & Laser Boundary Wall
    const pillarsGroup = new THREE.Group()
    const pillarCoords = [
      { id: 'BP-01', x: -180, z: -170 },
      { id: 'BP-02', x: 190, z: -160 },
      { id: 'BP-03', x: 210, z: 180 },
      { id: 'BP-04', x: -170, z: 190 },
    ]

    // Laser wall points
    const wallPts: THREE.Vector3[] = []
    pillarCoords.forEach((p) => {
      // Concrete Pillar
      const pillarGeo = new THREE.CylinderGeometry(2.5, 3.2, 16, 12)
      const pillarMat = new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.7 })
      const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat)
      pillarMesh.position.set(p.x, 8, p.z)
      pillarMesh.castShadow = true
      pillarsGroup.add(pillarMesh)

      // Beacon Red Lamp
      const lampGeo = new THREE.SphereGeometry(2, 12, 12)
      const lampMat = new THREE.MeshBasicMaterial({ color: '#EF4444' })
      const lampMesh = new THREE.Mesh(lampGeo, lampMat)
      lampMesh.position.set(p.x, 18, p.z)
      pillarsGroup.add(lampMesh)

      wallPts.push(new THREE.Vector3(p.x, 0, p.z))
    })

    // Glowing Concession Perimeter Ribbon
    const boundaryLineGeo = new THREE.BufferGeometry().setFromPoints([
      ...wallPts,
      wallPts[0], // close loop
    ])
    const boundaryLineMat = new THREE.LineBasicMaterial({
      color: '#10B981', // Emerald boundary
      linewidth: 3,
    })
    const boundaryLine = new THREE.Line(boundaryLineGeo, boundaryLineMat)
    boundaryLine.position.y = 2
    pillarsGroup.add(boundaryLine)

    scene.add(pillarsGroup)
    pillarsGroupRef.current = pillarsGroup

    // 9. 3D Mining Fleet (Tipper Trucks & Excavator Models)
    const trucksGroup = new THREE.Group()
    
    // Truck builder helper
    const createTruckModel = (color: string) => {
      const truck = new THREE.Group()
      // Chassis
      const chassisGeo = new THREE.BoxGeometry(10, 2.5, 5)
      const chassisMat = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.9 })
      const chassis = new THREE.Mesh(chassisGeo, chassisMat)
      chassis.position.y = 2
      truck.add(chassis)

      // Cab
      const cabGeo = new THREE.BoxGeometry(3.5, 4, 4.8)
      const cabMat = new THREE.MeshStandardMaterial({ color: '#F59E0B', roughness: 0.4 })
      const cab = new THREE.Mesh(cabGeo, cabMat)
      cab.position.set(3, 4.5, 0)
      truck.add(cab)

      // Dump Bed
      const bedGeo = new THREE.BoxGeometry(6, 3.5, 4.8)
      const bedMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
      const bed = new THREE.Mesh(bedGeo, bedMat)
      bed.position.set(-2, 4.2, 0)
      truck.add(bed)

      // Headlight glow
      const lightGeo = new THREE.SphereGeometry(0.5, 8, 8)
      const lightMat = new THREE.MeshBasicMaterial({ color: '#FEF08A' })
      const light1 = new THREE.Mesh(lightGeo, lightMat)
      light1.position.set(4.8, 3.5, 1.8)
      const light2 = new THREE.Mesh(lightGeo, lightMat)
      light2.position.set(4.8, 3.5, -1.8)
      truck.add(light1, light2)

      truck.scale.set(1.2, 1.2, 1.2)
      return truck
    }

    const truck1 = createTruckModel('#EF4444') // TG07U1889
    const truck2 = createTruckModel('#3B82F6') // TS05UE3699
    const truck3 = createTruckModel('#10B981') // TS12UD9828

    trucksGroup.add(truck1)
    trucksGroup.add(truck2)
    trucksGroup.add(truck3)
    scene.add(trucksGroup)
    trucksGroupRef.current = trucksGroup

    // Update camera position from orbit state
    const updateCamera = () => {
      const state = orbitStateRef.current
      const x = state.target.x + state.distance * Math.sin(state.pitch) * Math.sin(state.azimuth)
      const y = state.target.y + state.distance * Math.cos(state.pitch)
      const z = state.target.z + state.distance * Math.sin(state.pitch) * Math.cos(state.azimuth)

      camera.position.set(x, y, z)
      camera.lookAt(state.target)

      // Update telemetry state
      setCameraAltitude(Math.round(y))
      setCameraPitch(Math.round((state.pitch * 180) / Math.PI))
      setCameraAzimuth(Math.round(((state.azimuth * 180) / Math.PI) % 360))
    }

    updateCamera()

    // 10. Mouse & Interaction Handlers
    const onMouseDown = (e: MouseEvent) => {
      orbitStateRef.current.isDragging = true
      orbitStateRef.current.dragButton = e.button
      orbitStateRef.current.lastMouseX = e.clientX
      orbitStateRef.current.lastMouseY = e.clientY
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!orbitStateRef.current.isDragging) return
      const dx = e.clientX - orbitStateRef.current.lastMouseX
      const dy = e.clientY - orbitStateRef.current.lastMouseY
      orbitStateRef.current.lastMouseX = e.clientX
      orbitStateRef.current.lastMouseY = e.clientY

      if (orbitStateRef.current.dragButton === 0) {
        // Left click: Orbit Rotate (Azimuth & Pitch)
        orbitStateRef.current.azimuth -= dx * 0.006
        orbitStateRef.current.pitch = Math.max(
          0.1,
          Math.min(Math.PI / 2 - 0.05, orbitStateRef.current.pitch + dy * 0.006)
        )
      } else if (orbitStateRef.current.dragButton === 2) {
        // Right click: Pan Target
        const panSpeed = orbitStateRef.current.distance * 0.001
        orbitStateRef.current.target.x -= dx * panSpeed * Math.cos(orbitStateRef.current.azimuth)
        orbitStateRef.current.target.z += dx * panSpeed * Math.sin(orbitStateRef.current.azimuth)
        orbitStateRef.current.target.y += dy * panSpeed
      }
      updateCamera()
    }

    const onMouseUp = () => {
      orbitStateRef.current.isDragging = false
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      orbitStateRef.current.distance = Math.max(
        60,
        Math.min(1200, orbitStateRef.current.distance + e.deltaY * 0.6)
      )
      updateCamera()
    }

    const onContextMenu = (e: MouseEvent) => e.preventDefault()

    const domElem = renderer.domElement
    domElem.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    domElem.addEventListener('wheel', onWheel, { passive: false })
    domElem.addEventListener('contextmenu', onContextMenu)

    // Touch Support for tablets & trackpads
    let touchStartX = 0
    let touchStartY = 0
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX
        touchStartY = e.touches[0].clientY
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStartX
        const dy = e.touches[0].clientY - touchStartY
        touchStartX = e.touches[0].clientX
        touchStartY = e.touches[0].clientY
        orbitStateRef.current.azimuth -= dx * 0.006
        orbitStateRef.current.pitch = Math.max(
          0.1,
          Math.min(Math.PI / 2 - 0.05, orbitStateRef.current.pitch + dy * 0.006)
        )
        updateCamera()
      }
    }
    domElem.addEventListener('touchstart', onTouchStart)
    domElem.addEventListener('touchmove', onTouchMove)

    // Window Resize Observer
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    // 11. 60fps Animation Loop
    let animTime = 0
    const animate = () => {
      animTime += 0.016

      // Drone auto-orbit rotation
      if (isDroneOrbiting) {
        orbitStateRef.current.azimuth += 0.004
        updateCamera()
      }

      // Animate Haul Trucks moving on spiraling quarry ramp
      if (trucksGroupRef.current) {
        // Truck 1: Hauling up from pit floor
        const t1Angle = (animTime * 0.4) % (Math.PI * 5)
        const t1Radius = 220 * (1 - t1Angle / (Math.PI * 6.2))
        const t1X = Math.cos(t1Angle) * t1Radius
        const t1Z = Math.sin(t1Angle) * (t1Radius * 0.82)
        const t1Y = -((1 - t1Radius / 220) * (activeMine.pitDepth * 0.65 * verticalExaggeration)) + 1
        truck1.position.set(t1X, t1Y, t1Z)
        truck1.rotation.y = -t1Angle + Math.PI / 2

        // Truck 2: Returning empty down to pit
        const t2Angle = (animTime * 0.5 + 2.5) % (Math.PI * 5)
        const t2Radius = 220 * (1 - t2Angle / (Math.PI * 6.2))
        const t2X = Math.cos(t2Angle) * t2Radius
        const t2Z = Math.sin(t2Angle) * (t2Radius * 0.82)
        const t2Y = -((1 - t2Radius / 220) * (activeMine.pitDepth * 0.65 * verticalExaggeration)) + 1
        truck2.position.set(t2X, t2Y, t2Z)
        truck2.rotation.y = -t2Angle - Math.PI / 2

        // Truck 3: Stationed at overburden dump
        truck3.position.set(220, 28 * verticalExaggeration, 190)
        truck3.rotation.y = Math.sin(animTime * 0.5) * 0.1
      }

      // Animate beacon lamp pulses
      if (pillarsGroupRef.current) {
        const pulse = 0.5 + Math.sin(animTime * 6) * 0.5
        pillarsGroupRef.current.children.forEach((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            child.material.color.setRGB(1, 0.2 + pulse * 0.4, 0.2)
          }
        })
      }

      renderer.render(scene, camera)
      animFrameIdRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current)
      window.removeEventListener('resize', handleResize)
      domElem.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      domElem.removeEventListener('wheel', onWheel)
      domElem.removeEventListener('contextmenu', onContextMenu)
      domElem.removeEventListener('touchstart', onTouchStart)
      domElem.removeEventListener('touchmove', onTouchMove)
      renderer.dispose()
    }
  }, [activeMine, shadingMode, verticalExaggeration, isDroneOrbiting, wireframeOverlay])

  // Camera Presets
  const applyCameraPreset = (preset: 'nadir' | 'oblique' | 'pit' | 'reset') => {
    if (!cameraRef.current) return
    const state = orbitStateRef.current
    if (preset === 'nadir') {
      // Top-Down Plan View (90 deg pitch)
      state.pitch = 0.05
      state.azimuth = 0
      state.distance = 550
      state.target.set(0, 0, 0)
    } else if (preset === 'oblique') {
      // 45 deg Oblique Perspective
      state.pitch = 0.8
      state.azimuth = 0.6
      state.distance = 420
      state.target.set(0, -15, 0)
    } else if (preset === 'pit') {
      // Low Pit Bench Inspection (Low Angle looking into excavation floor)
      state.pitch = 1.35
      state.azimuth = 1.2
      state.distance = 280
      state.target.set(0, -(activeMine.pitDepth * 0.5 * verticalExaggeration), 0)
    } else {
      // Reset Default
      state.pitch = 0.85
      state.azimuth = 0.6
      state.distance = 450
      state.target.set(0, -10, 0)
    }

    const x = state.target.x + state.distance * Math.sin(state.pitch) * Math.sin(state.azimuth)
    const y = state.target.y + state.distance * Math.cos(state.pitch)
    const z = state.target.z + state.distance * Math.sin(state.pitch) * Math.cos(state.azimuth)
    cameraRef.current.position.set(x, y, z)
    cameraRef.current.lookAt(state.target)

    setCameraAltitude(Math.round(y))
    setCameraPitch(Math.round((state.pitch * 180) / Math.PI))
    setCameraAzimuth(Math.round(((state.azimuth * 180) / Math.PI) % 360))
  }

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950 font-sans">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* ── Top Header Control HUD ── */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none flex-wrap gap-2">
        {/* Left: Concession Title Badge & 2D Return */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setMapMode('2D')}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900/90 hover:bg-gov-700 text-white rounded-lg border border-slate-700 shadow-xl backdrop-blur-md text-xs font-bold transition-all cursor-pointer group"
            title="Return to 2D Cadastral Map"
          >
            <ArrowLeft size={16} className="text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>2D Map</span>
          </button>

          {/* Active Concession Selector Dropdown */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-1.5 shadow-xl backdrop-blur-md flex items-center gap-2">
            <Mountain size={16} className="text-amber-400 ml-1.5 flex-shrink-0" />
            <select
              value={activeMineIndex}
              onChange={(e) => setActiveMineIndex(Number(e.target.value))}
              className="bg-slate-800 text-white font-bold text-xs rounded px-2.5 py-1.5 border border-slate-600 focus:outline-hidden focus:border-amber-400 cursor-pointer"
            >
              {TELANGANA_3D_MINES.map((mine, idx) => (
                <option key={mine.id} value={idx}>
                  {mine.name} ({mine.mineral.split(' ')[0]}) — {mine.district}
                </option>
              ))}
            </select>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700">
              3D DEM Active
            </span>
          </div>
        </div>

        {/* Right: Quick 3D Shading & Drone Flyover Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Drone Auto-Orbit Toggle */}
          <button
            onClick={() => setIsDroneOrbiting(!isDroneOrbiting)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold shadow-xl border backdrop-blur-md transition-all cursor-pointer',
              isDroneOrbiting
                ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                : 'bg-slate-900/90 text-white border-slate-700 hover:bg-slate-800'
            )}
            title="Continuous 360° Drone Survey Orbit"
          >
            {isDroneOrbiting ? <Pause size={14} /> : <Play size={14} />}
            <span>{isDroneOrbiting ? 'Drone Surveying...' : 'Drone Orbit'}</span>
          </button>

          {/* Shading Mode Tabs */}
          <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-1 shadow-xl backdrop-blur-md flex items-center gap-1">
            <button
              onClick={() => setShadingMode('satellite')}
              className={clsx(
                'px-2.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer',
                shadingMode === 'satellite' ? 'bg-gov-600 text-white' : 'text-slate-300 hover:text-white'
              )}
              title="Drone Satellite Orthophoto Drape"
            >
              Satellite
            </button>
            <button
              onClick={() => setShadingMode('hypsometric')}
              className={clsx(
                'px-2.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer',
                shadingMode === 'hypsometric' ? 'bg-gov-600 text-white' : 'text-slate-300 hover:text-white'
              )}
              title="DEM Elevation Hypsometric Heatmap"
            >
              DEM Elevation
            </button>
            <button
              onClick={() => setShadingMode('strata')}
              className={clsx(
                'px-2.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer',
                shadingMode === 'strata' ? 'bg-gov-600 text-white' : 'text-slate-300 hover:text-white'
              )}
              title="Geological Rock Strata Beds"
            >
              Rock Strata
            </button>
          </div>

          {/* Wireframe TIN Toggle */}
          <button
            onClick={() => setWireframeOverlay(!wireframeOverlay)}
            className={clsx(
              'px-2.5 py-2 rounded-lg text-xs font-bold border backdrop-blur-md shadow-xl transition-all cursor-pointer',
              wireframeOverlay
                ? 'bg-sky-500 text-slate-950 border-sky-400'
                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:text-white'
            )}
            title="Toggle Triangulated Irregular Network (TIN) Wireframe"
          >
            TIN Mesh
          </button>
        </div>
      </div>

      {/* ── Left Quick Camera Presets Dock ── */}
      <div className="absolute top-20 left-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl p-2 shadow-2xl backdrop-blur-md text-xs">
        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 px-1 font-bold">
          Camera Presets
        </span>
        <button
          onClick={() => applyCameraPreset('oblique')}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-left transition-colors cursor-pointer"
        >
          <Crosshair size={14} className="text-amber-400" />
          <span>Oblique 45°</span>
        </button>
        <button
          onClick={() => applyCameraPreset('nadir')}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-left transition-colors cursor-pointer"
        >
          <Maximize2 size={14} className="text-emerald-400" />
          <span>Nadir Top-Down</span>
        </button>
        <button
          onClick={() => applyCameraPreset('pit')}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-left transition-colors cursor-pointer"
        >
          <Mountain size={14} className="text-sky-400" />
          <span>Pit Floor View</span>
        </button>
        <button
          onClick={() => applyCameraPreset('reset')}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-left transition-colors cursor-pointer"
        >
          <RotateCw size={14} className="text-purple-400" />
          <span>Reset Orbit</span>
        </button>

        {/* Vertical Exaggeration Slider */}
        <div className="mt-2 pt-2 border-t border-slate-800 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 px-1">
            <span className="flex items-center gap-1">
              <Sliders size={12} className="text-amber-400" />
              <span>Elevation Exaggeration</span>
            </span>
            <span className="font-mono text-amber-400">{verticalExaggeration.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="3.5"
            step="0.2"
            value={verticalExaggeration}
            onChange={(e) => setVerticalExaggeration(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>
      </div>

      {/* ── Bottom-Right Telemetry & Volumetric HUD ── */}
      <div className="absolute bottom-6 right-4 z-20 max-w-sm w-80 bg-slate-900/95 border border-slate-700/90 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden text-xs text-white">
        {/* Header */}
        <div className="px-3.5 py-2.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass size={16} className="text-emerald-400 animate-spin" style={{ animationDuration: '12s' }} />
            <span className="font-bold text-slate-100">3D Mine Volumetric HUD</span>
          </div>
          <button
            onClick={() => setIsTelemetryOpen(!isTelemetryOpen)}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <Info size={14} />
          </button>
        </div>

        {/* Telemetry Grid */}
        {isTelemetryOpen && (
          <div className="p-3.5 space-y-2.5">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Target Concession</div>
              <div className="font-extrabold text-sm text-emerald-300 truncate">{activeMine.name}</div>
              <div className="text-[11px] text-slate-300">{activeMine.mineral}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[11px]">
              <div className="bg-slate-800/60 p-2 rounded border border-slate-700/50">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Max Pit Depth</span>
                <span className="font-mono font-bold text-amber-400 text-sm">-{activeMine.pitDepth} m</span>
              </div>
              <div className="bg-slate-800/60 p-2 rounded border border-slate-700/50">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Surface MSL</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">+{activeMine.elevationMSL} m</span>
              </div>
              <div className="bg-slate-800/60 p-2 rounded border border-slate-700/50">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Bench Terraces</span>
                <span className="font-mono font-bold text-sky-400 text-sm">{activeMine.benchCount} Levels</span>
              </div>
              <div className="bg-slate-800/60 p-2 rounded border border-slate-700/50">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Slope Safety</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">68° (Safe)</span>
              </div>
            </div>

            {/* Live Camera Coordinates */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-mono text-[10px] text-slate-400">
              <span>Pitch: <strong className="text-slate-200">{cameraPitch}°</strong></span>
              <span>Azimuth: <strong className="text-slate-200">{cameraAzimuth}°</strong></span>
              <span>Cam Alt: <strong className="text-amber-300">{cameraAltitude}m</strong></span>
            </div>

            {/* Haul Fleet in 3D Status */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5">
                <Truck size={13} className="text-emerald-400" />
                <span>Active 3D Haulers:</span>
              </span>
              <span className="font-mono font-bold text-emerald-400">3 Tippers Active</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom-Left Navigation Tip ── */}
      <div className="absolute bottom-6 left-4 z-20 bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-[11px] text-slate-300 shadow-xl backdrop-blur-md flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Left-Drag: <strong>Rotate Orbit</strong></span>
        </span>
        <span className="text-slate-600">|</span>
        <span>Right-Drag: <strong>Pan</strong></span>
        <span className="text-slate-600">|</span>
        <span>Scroll: <strong>Zoom In/Out</strong></span>
      </div>
    </div>
  )
}
