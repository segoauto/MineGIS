import { apiClient, setTokens, clearTokens } from './client'
import type { AuthTokens, AuthUser } from '../types'

export const authApi = {
  async login(username: string, password: string): Promise<AuthTokens> {
    const { data } = await apiClient.post<AuthTokens>('/auth/login/', { username, password })
    setTokens(data.access, data.refresh)
    return data
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      await apiClient.post('/auth/logout/', { refresh: refreshToken })
    } finally {
      clearTokens()
    }
  },

  async getMe(): Promise<AuthUser> {
    const { data } = await apiClient.get<AuthUser>('/auth/me/')
    return data
  },

  async refresh(refreshToken: string): Promise<{ access: string }> {
    const { data } = await apiClient.post<{ access: string }>('/auth/refresh/', {
      refresh: refreshToken,
    })
    return data
  },
}
