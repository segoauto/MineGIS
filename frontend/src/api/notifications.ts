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

export const notificationsApi = {
  list: async () => {
    const res = await apiClient.get<Notification[]>('/notifications/')
    return res.data
  },

  getUnreadCount: async () => {
    const res = await apiClient.get<{ count: number }>('/notifications/unread_count/')
    return res.data.count
  },

  markAsRead: async (id: string) => {
    await apiClient.post(`/notifications/${id}/mark_as_read/`)
  },

  markAllAsRead: async () => {
    await apiClient.post('/notifications/mark_all_as_read/')
  }
}
