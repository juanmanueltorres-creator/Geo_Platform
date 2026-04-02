export interface Drillhole {
  drillhole_id: string
  hole_id: string
  drillhole: string
  max_depth: number
  geometry?: {
    type: string
    coordinates: [number, number, number?]
  }
}

export interface DrillholeSummary {
  drillhole_id: string
  total_samples: number
  avg_au: number | null
  max_au: number | null
}

export interface Assay {
  sample_id: string
  from: number
  to: number
  interval_length: number
  element: string
  value: number
  unit: string
  below_detection: boolean
}

export interface AssayResponse {
  drillhole_id: string
  assay_count: number
  data: Assay[]
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection"
  count: number
  features: GeoJSONFeature[]
}

export interface GeoJSONFeature {
  type: "Feature"
  properties: Record<string, any>
  geometry: {
    type: string
    coordinates: [number, number] | [number, number, number]
  }
}
