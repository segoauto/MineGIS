/**
 * Role-Based Access Control (RBAC) definitions and permissions for MineGIS-TS
 * Department of Mines & Geology, Government of Telangana
 */
import type { PortalTab } from '../components/layout/Sidebar'

export type RoleCode =
  | 'R01_SUPER_ADMIN'     // Director of Mines & Geology (State Administrator)
  | 'R02_STATE_EXEC'      // Principal Secretary (Mines & Energy)
  | 'R03_STATE_MGR'       // Joint Director (Approvals)
  | 'R04_DISTRICT_OFFICER'// District Mineral Officer (DMO)
  | 'R05_FIELD_OFFICER'   // Assistant Geologist & Field Inspecting Officer
  | 'R06_DATA_ENTRY'      // Cadastral Data Entry Operator
  | 'R07_GIS_ANALYST'     // GIS Analyst
  | 'R08_AUDITOR'         // Chief Vigilance Officer & Statutory Auditor
  | 'R09_LEASEHOLDER'     // Authorized Mineral Transit Concessionaire (Fleet Owner)
  | 'R10_HELPDESK'        // Helpdesk Support
  | 'R11_REPORT_VIEWER'   // Public Web-GIS Viewer / Public Information Officer

export interface RolePermissions {
  allowedTabs: PortalTab[]
  canCreateLease: boolean
  canBulkUpload: boolean
  canApproveLease: boolean
  canManageGeofences: boolean
  canDispatchSquad: boolean
  canViewAuditLogs: boolean
  canDrawBoundaries: boolean
  canAccessTelemetryControl: boolean
  isReadOnly: boolean
}

const ROLE_PERMISSIONS_MAP: Record<string, RolePermissions> = {
  R01_SUPER_ADMIN: {
    allowedTabs: ['dashboard', 'map', 'leases', 'fleet', 'geofences', 'alerts', 'reports', 'governance'],
    canCreateLease: true,
    canBulkUpload: true,
    canApproveLease: true,
    canManageGeofences: true,
    canDispatchSquad: true,
    canViewAuditLogs: true,
    canDrawBoundaries: true,
    canAccessTelemetryControl: true,
    isReadOnly: false,
  },
  R02_STATE_EXEC: {
    allowedTabs: ['dashboard', 'map', 'leases', 'fleet', 'geofences', 'alerts', 'reports', 'governance'],
    canCreateLease: false,
    canBulkUpload: false,
    canApproveLease: true,
    canManageGeofences: false,
    canDispatchSquad: true,
    canViewAuditLogs: true,
    canDrawBoundaries: false,
    canAccessTelemetryControl: true,
    isReadOnly: false,
  },
  R03_STATE_MGR: {
    allowedTabs: ['dashboard', 'map', 'leases', 'fleet', 'geofences', 'alerts', 'reports', 'governance'],
    canCreateLease: true,
    canBulkUpload: true,
    canApproveLease: true,
    canManageGeofences: true,
    canDispatchSquad: true,
    canViewAuditLogs: true,
    canDrawBoundaries: true,
    canAccessTelemetryControl: true,
    isReadOnly: false,
  },
  R04_DISTRICT_OFFICER: {
    allowedTabs: ['dashboard', 'map', 'leases', 'fleet', 'geofences', 'alerts', 'reports', 'governance'],
    canCreateLease: true,
    canBulkUpload: true,
    canApproveLease: false,
    canManageGeofences: true,
    canDispatchSquad: true,
    canViewAuditLogs: true,
    canDrawBoundaries: true,
    canAccessTelemetryControl: true,
    isReadOnly: false,
  },
  R05_FIELD_OFFICER: {
    allowedTabs: ['map', 'leases', 'fleet', 'geofences', 'alerts', 'reports'],
    canCreateLease: false,
    canBulkUpload: false,
    canApproveLease: false,
    canManageGeofences: true,
    canDispatchSquad: true,
    canViewAuditLogs: false,
    canDrawBoundaries: true,
    canAccessTelemetryControl: true,
    isReadOnly: false,
  },
  R06_DATA_ENTRY: {
    allowedTabs: ['map', 'leases', 'reports'],
    canCreateLease: true,
    canBulkUpload: true,
    canApproveLease: false,
    canManageGeofences: false,
    canDispatchSquad: false,
    canViewAuditLogs: false,
    canDrawBoundaries: true,
    canAccessTelemetryControl: false,
    isReadOnly: false,
  },
  R07_GIS_ANALYST: {
    allowedTabs: ['dashboard', 'map', 'leases', 'geofences', 'reports'],
    canCreateLease: false,
    canBulkUpload: true,
    canApproveLease: false,
    canManageGeofences: true,
    canDispatchSquad: false,
    canViewAuditLogs: false,
    canDrawBoundaries: true,
    canAccessTelemetryControl: false,
    isReadOnly: false,
  },
  R08_AUDITOR: {
    allowedTabs: ['dashboard', 'leases', 'alerts', 'reports', 'governance'],
    canCreateLease: false,
    canBulkUpload: false,
    canApproveLease: false,
    canManageGeofences: false,
    canDispatchSquad: false,
    canViewAuditLogs: true,
    canDrawBoundaries: false,
    canAccessTelemetryControl: false,
    isReadOnly: true,
  },
  R09_LEASEHOLDER: {
    allowedTabs: ['map', 'fleet', 'geofences', 'alerts', 'reports'],
    canCreateLease: false,
    canBulkUpload: false,
    canApproveLease: false,
    canManageGeofences: false,
    canDispatchSquad: false,
    canViewAuditLogs: false,
    canDrawBoundaries: false,
    canAccessTelemetryControl: true,
    isReadOnly: true,
  },
  R10_HELPDESK: {
    allowedTabs: ['dashboard', 'map', 'leases', 'reports'],
    canCreateLease: false,
    canBulkUpload: false,
    canApproveLease: false,
    canManageGeofences: false,
    canDispatchSquad: false,
    canViewAuditLogs: false,
    canDrawBoundaries: false,
    canAccessTelemetryControl: false,
    isReadOnly: true,
  },
  R11_REPORT_VIEWER: {
    allowedTabs: ['dashboard', 'map', 'leases', 'reports'],
    canCreateLease: false,
    canBulkUpload: false,
    canApproveLease: false,
    canManageGeofences: false,
    canDispatchSquad: false,
    canViewAuditLogs: false,
    canDrawBoundaries: false,
    canAccessTelemetryControl: false,
    isReadOnly: true,
  },
}

const DEFAULT_PERMISSIONS: RolePermissions = {
  allowedTabs: ['dashboard', 'map', 'leases', 'fleet', 'geofences', 'alerts', 'reports'],
  canCreateLease: false,
  canBulkUpload: false,
  canApproveLease: false,
  canManageGeofences: false,
  canDispatchSquad: false,
  canViewAuditLogs: false,
  canDrawBoundaries: false,
  canAccessTelemetryControl: false,
  isReadOnly: true,
}

export function getRolePermissions(roleCode?: string | null): RolePermissions {
  if (!roleCode) return DEFAULT_PERMISSIONS
  return ROLE_PERMISSIONS_MAP[roleCode] || DEFAULT_PERMISSIONS
}

export function isTabAllowed(roleCode: string | undefined | null, tab: PortalTab): boolean {
  const perms = getRolePermissions(roleCode)
  return perms.allowedTabs.includes(tab)
}
