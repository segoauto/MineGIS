import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'

const API_URL = import.meta.env?.VITE_API_URL ?? '/api'

// ─── Token management ─────────────────────────────────────────────────────────

const getAccessToken = (): string | null => localStorage.getItem('access_token')
const getRefreshToken = (): string | null => localStorage.getItem('refresh_token')
const setTokens = (access: string, refresh: string): void => {
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}
export const clearTokens = (): void => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

// ─── Axios instance ───────────────────────────────────────────────────────────

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// Attach Bearer token to every request
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Auto-refresh on 401
let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(apiClient(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refresh = getRefreshToken()
        if (!refresh) throw new Error('No refresh token')

        const response = await axios.post(`${API_URL}/auth/refresh/`, { refresh })
        const { access } = response.data
        setTokens(access, refresh)

        refreshQueue.forEach((cb) => cb(access))
        refreshQueue = []

        originalRequest.headers.Authorization = `Bearer ${access}`
        return apiClient(originalRequest)
      } catch {
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export { setTokens, getAccessToken }
