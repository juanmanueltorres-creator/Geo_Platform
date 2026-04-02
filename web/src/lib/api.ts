import axios from 'axios'
import type { GeoJSONFeatureCollection, DrillholeSummary, AssayResponse } from '@/types'

const API_URL = import.meta.env.VITE_API_URL || 'https://geo-plataform.onrender.com'

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
})

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
  }
}
