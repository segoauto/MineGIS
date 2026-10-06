import { apiClient, setTokens, clearTokens } from './client'
import type { AuthTokens, AuthUser } from '../types'
import { TELANGANA_DISTRICT_NAMES, getUserJurisdiction } from '../utils/districts'

export interface DemoAccount {
  roleName: string
  roleCode: string
  username: string
  email: string
  password: string
  fullName: string
  designation: string
  district: string
  department: string
  employeeId: string
  isStaff: boolean
  comment?: string
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    roleName: 'Admin',
    roleCode: 'R01_SUPER_ADMIN',
    username: 'admin@mining.telangana.gov.in',
    email: 'admin@mining.telangana.gov.in',
    password: 'Admin@123',
    fullName: 'Director of Mines & Geology',
    designation: 'Director of Mines & Geology (State Administrator)',
    district: 'Hyderabad HQ',
    department: 'Department of Mines & Geology, Telangana',
    employeeId: 'TS-DMG-ADM-001',
    isStaff: true,
  },
  {
    roleName: 'Approver',
    roleCode: 'R03_STATE_MGR',
    username: 'approver@mining.telangana.gov.in',
    email: 'approver@mining.telangana.gov.in',
    password: 'Approve@123',
    fullName: 'Joint Director (Approvals)',
    designation: 'Joint Director & State Approving Authority',
    district: 'Hyderabad HQ',
    department: 'DMG Mineral Concession & Approval Cell',
    employeeId: 'TS-DMG-APR-004',
    isStaff: true,
  },
  {
    roleName: 'Data Entry',
    roleCode: 'R06_DATA_ENTRY',
    username: 'dataentry@mining.telangana.gov.in',
    email: 'dataentry@mining.telangana.gov.in',
    password: 'Data@123',
    fullName: 'Cadastral Operator',
    designation: 'Cadastral Data Entry Operator',
    district: 'Warangal & Khammam Zone',
    department: 'DMG Cadastral Digitization Wing',
    employeeId: 'TS-DMG-DEO-089',
    isStaff: false,
  },
  {
    roleName: 'Field Officer',
    roleCode: 'R05_FIELD_OFFICER',
    username: 'fieldofficer@mining.telangana.gov.in',
    email: 'fieldofficer@mining.telangana.gov.in',
    password: 'Field@123',
    fullName: 'Field Inspecting Officer',
    designation: 'Assistant Geologist & Field Inspecting Officer',
    district: 'Bhadradri Kothagudem',
    department: 'DMG Field Surveillance & Inspection Squad',
    employeeId: 'TS-DMG-FLD-031',
    isStaff: false,
  },
  {
    roleName: 'View only',
    roleCode: 'R11_REPORT_VIEWER',
    username: 'viewonly@mining.telangana.gov.in',
    email: 'viewonly@mining.telangana.gov.in',
    password: 'View@123',
    fullName: 'Public Information Officer',
    designation: 'Public Information & MIS Dossier Viewer',
    district: 'Statewide',
    department: 'Citizen Transparency & Open Mining Registry',
    employeeId: 'TS-DMG-VWR-102',
    isStaff: false,
    comment: 'Resolved & Active',
  },
  {
    roleName: 'Audit Officer',
    roleCode: 'R08_AUDITOR',
    username: 'auditofficer@mining.telangana.gov.in',
    email: 'auditofficer@mining.telangana.gov.in',
    password: 'Audit@123',
    fullName: 'Chief Vigilance Officer',
    designation: 'Chief Vigilance Officer & Statutory Auditor',
    district: 'State Vigilance Cell',
    department: 'Vigilance & Cryptographic Audit Bureau',
    employeeId: 'TS-DMG-AUD-009',
    isStaff: true,
  },
  {
    roleName: 'Viewer only',
    roleCode: 'R11_REPORT_VIEWER',
    username: 'tg.viewer',
    email: 'tg.viewer@mining.telangana.gov.in',
    password: 'Mining@View25',
    fullName: 'Public Web-GIS Viewer',
    designation: 'Public Web-GIS Viewer',
    district: 'Telangana Statewide',
    department: 'Telangana Open Data Initiative',
    employeeId: 'TS-DMG-PUB-001',
    isStaff: false,
  },

  {
    roleName: 'District Officer (Rangareddy)',
    roleCode: 'R04_DISTRICT_OFFICER',
    username: 'districtofficer@mining.telangana.gov.in',
    email: 'districtofficer@mining.telangana.gov.in',
    password: 'District@123',
    fullName: 'District Mineral Officer (Rangareddy)',
    designation: 'District Mineral Officer (DMO), Rangareddy District',
    district: 'Rangareddy',
    department: 'District Mines & Geology Office, Rangareddy (Shamshabad)',
    employeeId: 'TS-DMG-DMO-RR-01',
    isStaff: true,
    comment: 'Restricted: Rangareddy District Jurisdiction only',
  },
  {
    roleName: 'District Officer (Nizamabad)',
    roleCode: 'R04_DISTRICT_OFFICER',
    username: 'do.nizamabad@mining.telangana.gov.in',
    email: 'do.nizamabad@mining.telangana.gov.in',
    password: 'District@123',
    fullName: 'District Mineral Officer (Nizamabad)',
    designation: 'District Mineral Officer (DMO), Nizamabad District',
    district: 'Nizamabad',
    department: 'District Mines & Geology Office, Nizamabad',
    employeeId: 'TS-DMG-DMO-NZB-042',
    isStaff: true,
    comment: 'Restricted: Nizamabad District Jurisdiction only',
  },
  {
    roleName: 'Executive',
    roleCode: 'R02_STATE_EXEC',
    username: 'executive@mining.telangana.gov.in',
    email: 'executive@mining.telangana.gov.in',
    password: 'Executive@123',
    fullName: 'Principal Secretary (Mines & Energy)',
    designation: 'Principal Secretary to Government (Mines & Energy)',
    district: 'Telangana Secretariat',
    department: 'Industries, Commerce & Mining Department',
    employeeId: 'TS-SEC-EXEC-002',
    isStaff: true,
    comment: 'To be created ; compliant',
  },
  {
    roleName: 'Fleet Owner',
    roleCode: 'R09_LEASEHOLDER',
    username: 'fleetowner@mining.telangana.gov.in',
    email: 'fleetowner@mining.telangana.gov.in',
    password: 'Fleet@123',
    fullName: 'Mineral Transit Concessionaire',
    designation: 'Authorized Mineral Transit Fleet Concessionaire',
    district: 'Godavari Mineral Corridor',
    department: 'TS Mineral Transit Fleet Association',
    employeeId: 'FLT-TS-9981',
    isStaff: false,
    comment: 'Non compliant ; vendor added',
  },
  // Legacy / fallback admin account
  {
    roleName: 'Admin (Legacy)',
    roleCode: 'R01_SUPER_ADMIN',
    username: 'admin@minegis.ts.gov.in',
    email: 'admin@minegis.ts.gov.in',
    password: 'MineGIS@2026',
    fullName: 'Director of Mines & Geology',
    designation: 'Director of Mines & Geology, Govt of Telangana',
    district: 'Hyderabad HQ',
    department: 'Department of Mines & Geology',
    employeeId: 'TS-DMG-001',
    isStaff: true,
  },
]

export const MOCK_GOV_OFFICER: AuthUser = {
  id: 1,
  username: DEMO_ACCOUNTS[0].username,
  email: DEMO_ACCOUNTS[0].email,
  first_name: 'Director',
  last_name: 'Mines & Geology',
  full_name: DEMO_ACCOUNTS[0].fullName,
  is_staff: true,
  profile: {
    role: DEMO_ACCOUNTS[0].roleCode,
    district: DEMO_ACCOUNTS[0].district,
    phone: '+91 94401 23456',
    designation: DEMO_ACCOUNTS[0].designation,
    employee_id: DEMO_ACCOUNTS[0].employeeId,
    mfa_enabled: true,
  },
}

export const MOCK_SSO_OFFICER: AuthUser = {
  id: 2,
  username: 'districtofficer@mining.telangana.gov.in',
  email: 'districtofficer@mining.telangana.gov.in',
  first_name: 'District',
  last_name: 'Mineral Officer',
  full_name: 'District Mineral Officer (Nizamabad)',
  is_staff: true,
  profile: {
    role: 'R04_DISTRICT_OFFICER',
    district: 'Nizamabad',
    phone: '+91 98480 54321',
    designation: 'District Mineral Officer (DMO), Nizamabad',
    employee_id: 'TS-DMG-DMO-042',
    mfa_enabled: true,
  },
}

function resolveDemoUser(username: string, overrideDistrict?: string): AuthUser {
  const norm = username.trim().toLowerCase()

  // 1. Explicit override district provided
  if (overrideDistrict) {
    const jur = getUserJurisdiction(overrideDistrict)
    return {
      id: Math.abs(norm.split('').reduce((acc, c) => acc + c.charCodeAt(0), 100)),
      username,
      email: username.includes('@') ? username : `${username}@mining.telangana.gov.in`,
      first_name: 'DMO',
      last_name: jur.name,
      full_name: `District Mineral Officer (${jur.name})`,
      is_staff: true,
      profile: {
        role: 'R04_DISTRICT_OFFICER',
        district: jur.name,
        phone: '+91 800-425-MINE',
        designation: `District Mineral Officer (DMO), ${jur.name} District`,
        employee_id: `TS-DMG-DMO-${jur.name.slice(0, 3).toUpperCase()}-01`,
        mfa_enabled: true,
      },
    }
  }

  // 2. Pre-configured DEMO_ACCOUNTS match
  const matched = DEMO_ACCOUNTS.find(
    (a) => a.username.toLowerCase() === norm || a.email.toLowerCase() === norm
  )

  if (matched) {
    const parts = matched.fullName.split(' ')
    return {
      id: Math.abs(matched.username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 100)),
      username: matched.username,
      email: matched.email,
      first_name: parts[0] || 'Official',
      last_name: parts.slice(1).join(' ') || 'User',
      full_name: matched.fullName,
      is_staff: matched.isStaff,
      profile: {
        role: matched.roleCode,
        district: matched.district,
        phone: '+91 94401 23456',
        designation: matched.designation,
        employee_id: matched.employeeId,
        mfa_enabled: true,
      },
    }
  }

  // 3. Match any of the 33 Telangana districts in the username/email
  for (const dist of TELANGANA_DISTRICT_NAMES) {
    const slug = dist.toLowerCase().replace(/[^a-z]/g, '')
    if (norm.includes(slug)) {
      const jur = getUserJurisdiction(dist)
      return {
        id: Math.abs(norm.split('').reduce((acc, c) => acc + c.charCodeAt(0), 100)),
        username: norm,
        email: norm.includes('@') ? norm : `${norm}@mining.telangana.gov.in`,
        first_name: 'DMO',
        last_name: jur.name,
        full_name: `District Mineral Officer (${jur.name})`,
        is_staff: true,
        profile: {
          role: 'R04_DISTRICT_OFFICER',
          district: jur.name,
          phone: '+91 800-425-MINE',
          designation: `District Mineral Officer (DMO), ${jur.name} District`,
          employee_id: `TS-DMG-DMO-${jur.name.slice(0, 3).toUpperCase()}-01`,
          mfa_enabled: true,
        },
      }
    }
  }

  return {
    ...MOCK_GOV_OFFICER,
    username: username || MOCK_GOV_OFFICER.username,
    email: username.includes('@') ? username : MOCK_GOV_OFFICER.email,
  }
}

export const authApi = {
  async login(username: string, password: string, overrideDistrict?: string): Promise<AuthTokens> {
    try {
      const { data } = await apiClient.post<AuthTokens>('/auth/login/', { username, password })
      setTokens(data.access, data.refresh)
      if (data.user) {
        if (overrideDistrict && data.user.profile) {
          data.user.profile.district = overrideDistrict
        }
        localStorage.setItem('minegis_mock_user', JSON.stringify(data.user))
      }
      return data
    } catch (err: any) {
      // Offline fallback: match user against official DEMO_ACCOUNTS and all 33 districts
      const resolvedUser = resolveDemoUser(username, overrideDistrict)
      const mockTokens: AuthTokens = {
        access: 'mock_access_token_minegis_ts_' + Date.now(),
        refresh: 'mock_refresh_token_minegis_ts_' + Date.now(),
        user: resolvedUser,
      }
      setTokens(mockTokens.access, mockTokens.refresh)
      localStorage.setItem('minegis_mock_user', JSON.stringify(mockTokens.user))
      return mockTokens
    }
  },

  async logout(refreshToken?: string): Promise<void> {
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout/', { refresh: refreshToken })
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      clearTokens()
      localStorage.removeItem('minegis_mock_user')
    }
  },

  async getMe(): Promise<AuthUser> {
    try {
      const { data } = await apiClient.get<AuthUser>('/auth/me/')
      return data
    } catch (err: any) {
      // If backend is offline or network error, but user has token/session
      const token = localStorage.getItem('access_token')
      const stored = localStorage.getItem('minegis_mock_user')
      if (token) {
        if (stored) {
          try {
            return JSON.parse(stored)
          } catch {}
        }
        return MOCK_GOV_OFFICER
      }
      throw err
    }
  },

  async refresh(refreshToken: string): Promise<{ access: string }> {
    try {
      const { data } = await apiClient.post<{ access: string }>('/auth/refresh/', {
        refresh: refreshToken,
      })
      return data
    } catch {
      return { access: 'mock_access_token_minegis_ts_' + Date.now() }
    }
  },
}

