import { transformExtent } from 'ol/proj'

export interface DistrictJurisdiction {
  name: string
  teluguName: string
  center: [number, number] // [lon, lat]
  defaultZoom: number
  minZoom: number
  maxZoom: number
  extent: [number, number, number, number] // [minLon, minLat, maxLon, maxLat] in EPSG:4326
  headquarters: string
  zone: string
}

/**
 * All 33 Districts of Telangana State with official administrative bounds
 */
export const TELANGANA_DISTRICTS: Record<string, DistrictJurisdiction> = {
  Adilabad: {
    name: 'Adilabad',
    teluguName: 'ఆదిలాబాద్',
    center: [78.53, 19.66],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [78.10, 19.20, 79.10, 19.95],
    headquarters: 'Adilabad',
    zone: 'Kumuram Bheem Zone',
  },
  'Bhadradri Kothagudem': {
    name: 'Bhadradri Kothagudem',
    teluguName: 'భద్రాద్రి కొత్తగూడెం',
    center: [80.61, 17.55],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [79.95, 17.10, 81.40, 18.30],
    headquarters: 'Kothagudem',
    zone: 'Bhadradri Zone',
  },
  Hanamkonda: {
    name: 'Hanamkonda',
    teluguName: 'హన్మకొండ',
    center: [79.57, 18.01],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [79.25, 17.80, 79.95, 18.25],
    headquarters: 'Hanamkonda',
    zone: 'Kakatiya Zone',
  },
  Hyderabad: {
    name: 'Hyderabad',
    teluguName: 'హైదరాబాద్',
    center: [78.47, 17.38],
    defaultZoom: 12,
    minZoom: 11,
    maxZoom: 19,
    extent: [78.35, 17.30, 78.58, 17.48],
    headquarters: 'Hyderabad',
    zone: 'Charminar Zone',
  },
  Jagtial: {
    name: 'Jagtial',
    teluguName: 'జగిత్యాల',
    center: [78.91, 18.79],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [78.60, 18.55, 79.35, 19.05],
    headquarters: 'Jagtial',
    zone: 'Basara Zone',
  },
  Jangaon: {
    name: 'Jangaon',
    teluguName: 'జనగామ',
    center: [79.18, 17.72],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [78.85, 17.45, 79.45, 17.95],
    headquarters: 'Jangaon',
    zone: 'Yadadri Zone',
  },
  'Jayashankar Bhupalpally': {
    name: 'Jayashankar Bhupalpally',
    teluguName: 'జయశంకర్ భూపాలపల్లి',
    center: [79.86, 18.43],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [79.50, 18.15, 80.40, 18.85],
    headquarters: 'Bhupalpally',
    zone: 'Kakatiya Zone',
  },
  'Jogulamba Gadwal': {
    name: 'Jogulamba Gadwal',
    teluguName: 'జోగులాంబ గద్వాల',
    center: [77.80, 16.23],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [77.40, 15.90, 78.25, 16.55],
    headquarters: 'Gadwal',
    zone: 'Jogulamba Zone',
  },
  Kamareddy: {
    name: 'Kamareddy',
    teluguName: 'కామారెడ్డి',
    center: [78.34, 18.32],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [77.80, 18.00, 78.65, 18.65],
    headquarters: 'Kamareddy',
    zone: 'Kaleshwaram Zone',
  },
  Karimnagar: {
    name: 'Karimnagar',
    teluguName: 'కరీంనగర్',
    center: [79.13, 18.44],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [78.70, 18.05, 79.75, 18.90],
    headquarters: 'Karimnagar',
    zone: 'Basara Zone',
  },
  Khammam: {
    name: 'Khammam',
    teluguName: 'ఖమ్మం',
    center: [80.15, 17.25],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [79.80, 16.85, 80.65, 17.65],
    headquarters: 'Khammam',
    zone: 'Bhadradri Zone',
  },
  'Kumuram Bheem Asifabad': {
    name: 'Kumuram Bheem Asifabad',
    teluguName: 'కొమరం భీమ్ ఆసిఫాబాద్',
    center: [79.28, 19.36],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [78.80, 19.00, 79.85, 19.75],
    headquarters: 'Asifabad',
    zone: 'Kumuram Bheem Zone',
  },
  Mahabubabad: {
    name: 'Mahabubabad',
    teluguName: 'మహబూబాబాద్',
    center: [80.00, 17.60],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [79.60, 17.25, 80.40, 17.95],
    headquarters: 'Mahabubabad',
    zone: 'Kakatiya Zone',
  },
  Mahabubnagar: {
    name: 'Mahabubnagar',
    teluguName: 'మహబూబ్‌నగర్',
    center: [77.98, 16.74],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [77.60, 16.35, 78.35, 17.05],
    headquarters: 'Mahabubnagar',
    zone: 'Jogulamba Zone',
  },
  Mancherial: {
    name: 'Mancherial',
    teluguName: 'మంచిర్యాల',
    center: [79.46, 18.87],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [79.10, 18.60, 80.00, 19.30],
    headquarters: 'Mancherial',
    zone: 'Kumuram Bheem Zone',
  },
  Medak: {
    name: 'Medak',
    teluguName: 'మెదక్',
    center: [78.26, 18.04],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [77.85, 17.75, 78.60, 18.35],
    headquarters: 'Medak',
    zone: 'Kaleshwaram Zone',
  },
  'Medchal-Malkajgiri': {
    name: 'Medchal-Malkajgiri',
    teluguName: 'మేడ్చల్-మల్కాజిగిరి',
    center: [78.58, 17.55],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [78.35, 17.40, 78.80, 17.75],
    headquarters: 'Shamirpet',
    zone: 'Charminar Zone',
  },
  Mulugu: {
    name: 'Mulugu',
    teluguName: 'ములుగు',
    center: [80.20, 18.20],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [79.80, 17.85, 80.70, 18.65],
    headquarters: 'Mulugu',
    zone: 'Kakatiya Zone',
  },
  Nagarkurnool: {
    name: 'Nagarkurnool',
    teluguName: 'నాగర్‌కర్నూల్',
    center: [78.31, 16.48],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [77.90, 16.05, 79.10, 16.90],
    headquarters: 'Nagarkurnool',
    zone: 'Jogulamba Zone',
  },
  Nalgonda: {
    name: 'Nalgonda',
    teluguName: 'నల్గొండ',
    center: [79.27, 17.05],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [78.80, 16.50, 79.85, 17.35],
    headquarters: 'Nalgonda',
    zone: 'Yadadri Zone',
  },
  Narayanpet: {
    name: 'Narayanpet',
    teluguName: 'నారాయణపేట',
    center: [77.50, 16.73],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [77.15, 16.35, 77.85, 17.00],
    headquarters: 'Narayanpet',
    zone: 'Jogulamba Zone',
  },
  Nirmal: {
    name: 'Nirmal',
    teluguName: 'నిర్మల్',
    center: [78.34, 19.09],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [78.00, 18.80, 78.95, 19.40],
    headquarters: 'Nirmal',
    zone: 'Basara Zone',
  },
  Nizamabad: {
    name: 'Nizamabad',
    teluguName: 'నిజామాబాద్',
    center: [78.10, 18.67],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [77.55, 18.35, 78.60, 19.15],
    headquarters: 'Nizamabad',
    zone: 'Kaleshwaram Zone',
  },
  Peddapalli: {
    name: 'Peddapalli',
    teluguName: 'పెద్దపల్లి',
    center: [79.38, 18.61],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [79.10, 18.40, 79.85, 18.95],
    headquarters: 'Peddapalli',
    zone: 'Basara Zone',
  },
  'Rajanna Sircilla': {
    name: 'Rajanna Sircilla',
    teluguName: 'రాజన్న సిరిసిల్ల',
    center: [78.80, 18.38],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [78.50, 18.15, 79.10, 18.65],
    headquarters: 'Sircilla',
    zone: 'Basara Zone',
  },
  Rangareddy: {
    name: 'Rangareddy',
    teluguName: 'రంగా రెడ్డి',
    center: [78.48, 17.25],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [77.90, 16.80, 78.95, 17.70],
    headquarters: 'Shamshabad / Rajendranagar',
    zone: 'Charminar Zone',
  },
  Sangareddy: {
    name: 'Sangareddy',
    teluguName: 'సంగారెడ్డి',
    center: [78.08, 17.62],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [77.60, 17.30, 78.35, 18.00],
    headquarters: 'Sangareddy',
    zone: 'Kaleshwaram Zone',
  },
  Siddipet: {
    name: 'Siddipet',
    teluguName: 'సిద్దిపేట',
    center: [78.85, 18.10],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [78.50, 17.80, 79.25, 18.40],
    headquarters: 'Siddipet',
    zone: 'Kaleshwaram Zone',
  },
  Suryapet: {
    name: 'Suryapet',
    teluguName: 'సూర్యాపేట',
    center: [79.62, 17.14],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [79.25, 16.80, 80.05, 17.45],
    headquarters: 'Suryapet',
    zone: 'Yadadri Zone',
  },
  Vikarabad: {
    name: 'Vikarabad',
    teluguName: 'వికారాబాద్',
    center: [77.70, 17.34],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [77.30, 17.00, 78.30, 17.75],
    headquarters: 'Vikarabad',
    zone: 'Jogulamba Zone',
  },
  Wanaparthy: {
    name: 'Wanaparthy',
    teluguName: 'వనపర్తి',
    center: [78.06, 16.36],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [77.80, 16.10, 78.35, 16.65],
    headquarters: 'Wanaparthy',
    zone: 'Jogulamba Zone',
  },
  Warangal: {
    name: 'Warangal',
    teluguName: 'వరంగల్',
    center: [79.60, 17.97],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [79.35, 17.65, 80.00, 18.15],
    headquarters: 'Warangal',
    zone: 'Kakatiya Zone',
  },
  'Yadadri Bhuvanagiri': {
    name: 'Yadadri Bhuvanagiri',
    teluguName: 'యాదాద్రి భువనగిరి',
    center: [78.95, 17.51],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [78.60, 17.20, 79.35, 17.85],
    headquarters: 'Bhuvanagiri',
    zone: 'Yadadri Zone',
  },
}

export const TELANGANA_DISTRICT_NAMES = Object.keys(TELANGANA_DISTRICTS).sort()

export const STATEWIDE_JURISDICTION: DistrictJurisdiction = {
  name: 'Statewide',
  teluguName: 'తెలంగాణ రాష్ట్రం',
  center: [79.0, 17.8],
  defaultZoom: 8,
  minZoom: 6,
  maxZoom: 20,
  extent: [76.5, 15.5, 82.5, 20.2],
  headquarters: 'Hyderabad (State HQ)',
  zone: 'Statewide Directorate',
}

/**
 * Normalizes district query string to match official names
 */
function cleanDistrictString(str: string): string {
  return str
    .toLowerCase()
    .replace(/district|dmo|office|zone|collectorate/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim()
}

/**
 * Resolve district spatial jurisdiction based on user profile.
 * Strictly locks officers to their assigned district.
 */
export function getUserJurisdiction(districtName?: string | null): DistrictJurisdiction {
  if (!districtName) return STATEWIDE_JURISDICTION
  
  const raw = districtName.trim()
  const cleaned = cleanDistrictString(raw)

  if (
    !cleaned ||
    cleaned === 'statewide' ||
    cleaned.includes('hq') ||
    cleaned.includes('state') ||
    cleaned.includes('all') ||
    cleaned.includes('secretariat') ||
    cleaned.includes('vigilance')
  ) {
    return STATEWIDE_JURISDICTION
  }

  // Exact match first
  for (const [key, config] of Object.entries(TELANGANA_DISTRICTS)) {
    if (key.toLowerCase() === raw.toLowerCase()) {
      return config
    }
  }

  // Cleaned substring/fuzzy match
  for (const [key, config] of Object.entries(TELANGANA_DISTRICTS)) {
    const keyCleaned = cleanDistrictString(key)
    if (cleaned.includes(keyCleaned) || keyCleaned.includes(cleaned)) {
      return config
    }
  }

  // If a district name was provided that is not found, construct a restricted boundary
  // around the Telangana center so they are still locked and cannot roam statewide.
  return {
    name: raw,
    teluguName: raw,
    center: [78.8, 17.8],
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 19,
    extent: [78.4, 17.4, 79.2, 18.2],
    headquarters: `${raw} HQ`,
    zone: 'District Jurisdiction',
  }
}

/**
 * Check if coordinate [lon, lat] is within jurisdiction envelope
 */
export function isCoordinateInJurisdiction(
  coord: [number, number],
  jurisdiction: DistrictJurisdiction
): boolean {
  const [lon, lat] = coord
  const [minLon, minLat, maxLon, maxLat] = jurisdiction.extent
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat
}

/**
 * Get EPSG:3857 extent for OpenLayers view
 */
export function getJurisdiction3857Extent(jurisdiction: DistrictJurisdiction): number[] {
  return transformExtent(jurisdiction.extent, 'EPSG:4326', 'EPSG:3857')
}
