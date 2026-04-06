import axios from 'axios'
import type { GeoJSONFeatureCollection, DrillholeSummary, AssayResponse, AlterationResponse, GeologySummary } from '@/types'

const API_URL = import.meta.env.VITE_API_URL || 'https://geo-plataform.onrender.com'

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 55000,
})

// Auto-retry on timeout / network error — handles Render free-tier cold start (~30s)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as (typeof error.config & { __retryCount?: number })
    if (!config) return Promise.reject(error)
    const retryCount = config.__retryCount ?? 0
    const isRetryable =
      error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      !error.response
    if (!isRetryable || retryCount >= 2) return Promise.reject(error)
    config.__retryCount = retryCount + 1
    await new Promise(resolve => setTimeout(resolve, 1500 * config.__retryCount!))
    return apiClient(config)
  }
)

export const api = {
  // Get all drillhole locations (extended GeoJSON with depth + geometry)
  getDrillholeLocations: async (): Promise<GeoJSONFeatureCollection> => {
    const response = await apiClient.get('/geospatial/drillholes-geojson')
    console.log('[api] drillholes-geojson response:', response.data)
    return response.data
  },

  // Get summary stats for a drillhole
  getDrillholeSummary: async (drillholeId: string): Promise<DrillholeSummary> => {
    const response = await apiClient.get(`/drillholes/${drillholeId}/summary`)
    return response.data
  },

  // Get assays for a drillhole
  getAssays: async (
    drillholeId: string,
    element?: string,
    fromDepth?: number,
    toDepth?: number
  ): Promise<AssayResponse> => {
    const params = new URLSearchParams()
    if (element) params.append('element', element)
    if (fromDepth !== undefined) params.append('from_depth', fromDepth.toString())
    if (toDepth !== undefined) params.append('to_depth', toDepth.toString())

    const response = await apiClient.get(`/drillholes/${drillholeId}/assays`, { params })
    return response.data
  },

  // Get lithology data
  getLithology: async (
    drillholeId: string,
    fromDepth?: number,
    toDepth?: number
  ) => {
    const params = new URLSearchParams()
    if (fromDepth !== undefined) params.append('from_depth', fromDepth.toString())
    if (toDepth !== undefined) params.append('to_depth', toDepth.toString())

    const response = await apiClient.get(`/drillholes/${drillholeId}/lithology`, { params })
    return response.data
  },

  // Get alteration zonation
  getAlteration: async (drillholeId: string): Promise<AlterationResponse> => {
    const response = await apiClient.get(`/drillholes/${drillholeId}/alteration`)
    return response.data
  },

  // Get compact geology summary (lithology + alteration)
  getGeologySummary: async (drillholeId: string): Promise<GeologySummary> => {
    const response = await apiClient.get(`/drillholes/${drillholeId}/geology-summary`)
    return response.data
  },

  // Project-scoped current weather for the Filo del Sol project
  getProjectWeatherCurrent: async (): Promise<any> => {
    const response = await apiClient.get('/project/weather/current')
    return response.data
  },
  // Get list of available projects (static for now)
  getProjects: async (): Promise<any[]> => {
    const response = await apiClient.get('/projects')
    return response.data
  },

  // Get project-scoped weather by project slug
  getProjectWeatherCurrentBySlug: async (slug: string): Promise<any> => {
    const response = await apiClient.get(`/projects/${slug}/weather/current`)
    return response.data
  },
}
