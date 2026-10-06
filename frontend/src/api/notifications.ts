import { apiClient } from './client'
import type { PaginatedResponse } from '../types'

export interface Notification {
  id: string
  title: string
  message: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  severity_display: string
  is_read: boolean
  link?: string
  module?: string
  created_at: string
  created_at_relative: string
}

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    title: 'Mineral Transit Route Alert',
    message: 'Vehicle TS-08-UA-4021 diverted from NH-365 approved transit corridor.',
    severity: 'WARNING',
    severity_display: 'Warning',
    is_read: false,
    link: '/#vehicles',
    module: 'Vehicle Tracking',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    created_at_relative: '30 mins ago',
  },
  {
    id: 'notif-2',
    title: 'Cadastral DGPS Pillar Survey Validated',
    message: '8 ETS boundary pillars verified for Singareni OCP-IV lease boundary.',
    severity: 'INFO',
    severity_display: 'Notice',
    is_read: false,
    link: '/#leases',
    module: 'Cadastral GIS',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    created_at_relative: '2 hours ago',
  },
  {
    id: 'notif-3',
    title: 'Cryptographic Audit Block Sealed',
    message: 'Quarterly state mining audit ledger block TS-BLK-8819 validated.',
    severity: 'INFO',
    severity_display: 'Notice',
    is_read: true,
    link: '/governance',
    module: 'Governance',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    created_at_relative: '1 day ago',
  },
]

export const notificationsApi = {
  list: async () => {
    try {
      const res = await apiClient.get<Notification[]>('/notifications/')
      return res.data
    } catch {
      return MOCK_NOTIFICATIONS
    }
  },

  getUnreadCount: async () => {
    try {
      const res = await apiClient.get<{ count: number }>('/notifications/unread_count/')
      return res.data.count
    } catch {
      return MOCK_NOTIFICATIONS.filter((n) => !n.is_read).length
    }
  },

  markAsRead: async (id: string) => {
    try {
      await apiClient.post(`/notifications/${id}/mark_as_read/`)
    } catch {
      const notif = MOCK_NOTIFICATIONS.find((n) => n.id === id)
      if (notif) notif.is_read = true
    }
  },

  markAllAsRead: async () => {
    try {
      await apiClient.post('/notifications/mark_all_as_read/')
    } catch {
      MOCK_NOTIFICATIONS.forEach((n) => (n.is_read = true))
    }
  }
}
