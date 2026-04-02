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

export interface PeakZone {
  from: number
  to: number
  value: number
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

export interface AlterationInterval {
  code: string
  name: string
  intensity: string
  from: number
  to: number
}

export interface AlterationResponse {
  drillhole_id: string
  interval_count: number
  data: AlterationInterval[]
}

export interface GeologySummary {
  hole_id: string
  dominant_lithology: string | null
  lithology_sequence: string[]
  dominant_alteration: string | null
  alteration_sequence: string[]
  interpretation: string | null
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
