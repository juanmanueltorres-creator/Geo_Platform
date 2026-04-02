import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { api } from '@/lib/api'
import type { Drillhole } from '@/types'
import 'leaflet/dist/leaflet.css'

const TILE_LAYERS = {
  esri: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
    label: 'Satellite',
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    label: 'Street',
  },
} as const

type TileLayerKey = keyof typeof TILE_LAYERS

/** Auto-fit map bounds when drillholes load */
function FitBounds({ drillholes }: { drillholes: Drillhole[] }) {
  const map = useMap()
  useEffect(() => {
    if (drillholes.length === 0) return
    const points = drillholes
      .filter(h => h.geometry?.coordinates)
      .map(h => {
        const c = h.geometry!.coordinates as [number, number]
        return [c[1], c[0]] as [number, number]
      })
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [30, 30] })
    }
  }, [drillholes, map])
  return null
}

interface MapViewProps {
  onDrillholeSelect?: (drillhole: Drillhole) => void
  onDrillholesLoaded?: (drillholes: Drillhole[]) => void
  selectedDrillholeId?: string | null
}

export function MapView({ onDrillholeSelect, onDrillholesLoaded, selectedDrillholeId }: MapViewProps) {
  const [drillholes, setDrillholes] = useState<Drillhole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tileLayer, setTileLayer] = useState<TileLayerKey>('esri')

  useEffect(() => {
    const fetchDrillholes = async () => {
      try {
        setLoading(true)
        const data = await api.getDrillholeLocations()
        const holes = data.features.map(feature => ({
          drillhole_id: feature.properties.hole_id,
          hole_id: feature.properties.hole_id,
          drillhole: feature.properties.name,
          max_depth: feature.properties.max_depth ?? 0,
          geometry: feature.geometry
        }))
        setDrillholes(holes)
        onDrillholesLoaded?.(holes)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading map')
        console.error('Error fetching drillholes:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDrillholes()
  }, [])

  // Fallback center — overridden by FitBounds once data loads
  const defaultCenter = [-30.18, -69.35] as [number, number]

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-lg">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <div className="h-8 w-8 border-4 border-slate-300 border-t-geo-primary dark:border-slate-700 dark:border-t-geo-primary rounded-full" />
          </div>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Loading map...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50 dark:bg-red-950 rounded-lg">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
      className="z-0"
    >
      <FitBounds drillholes={drillholes} />
      <TileLayer
        key={tileLayer}
        url={TILE_LAYERS[tileLayer].url}
        attribution={TILE_LAYERS[tileLayer].attribution}
        maxZoom={TILE_LAYERS[tileLayer].maxZoom}
      />

      {/* Layer switcher button */}
      <div
        style={{
          position: 'absolute', top: 10, right: 10, zIndex: 1000,
          display: 'flex', gap: 4, background: 'rgba(255,255,255,0.9)',
          borderRadius: 6, padding: 3, boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        }}
      >
        {(Object.keys(TILE_LAYERS) as TileLayerKey[]).map(key => (
          <button
            key={key}
            onClick={() => setTileLayer(key)}
            style={{
              padding: '4px 10px', fontSize: 12, fontWeight: 600,
              border: 'none', borderRadius: 4, cursor: 'pointer',
              background: tileLayer === key ? '#f59e0b' : 'transparent',
              color: tileLayer === key ? '#fff' : '#333',
            }}
          >
            {TILE_LAYERS[key].label}
          </button>
        ))}
      </div>

      {drillholes.map(hole => {
        const coords = hole.geometry?.coordinates as [number, number]
        if (!coords) return null
        const isSelected = hole.drillhole_id === selectedDrillholeId

        return (
          <CircleMarker
            key={hole.drillhole_id}
            center={[coords[1], coords[0]]}
            radius={isSelected ? 12 : 8}
            pathOptions={{
              fillColor: isSelected ? '#facc15' : '#ff7800',
              color: isSelected ? '#b45309' : '#1f77b4',
              weight: isSelected ? 3 : 2,
              opacity: 1,
              fillOpacity: isSelected ? 1 : 0.8,
            }}
            eventHandlers={{
              click: () => onDrillholeSelect?.(hole)
            }}
          >
            <Popup>
              <div className="text-sm">
                <h4 className="font-bold text-geo-primary mb-2">{hole.drillhole}</h4>
                <table className="mb-2">
                  <tbody>
                    <tr>
                      <td className="font-semibold pr-2">Hole ID:</td>
                      <td>{hole.hole_id}</td>
                    </tr>
                    <tr>
                      <td className="font-semibold pr-2">Max Depth:</td>
                      <td>{hole.max_depth != null ? hole.max_depth.toFixed(1) : 'N/A'} m</td>
                    </tr>
                    <tr>
                      <td className="font-semibold pr-2">Coord:</td>
                      <td className="text-xs">
                        {coords[1].toFixed(4)}, {coords[0].toFixed(4)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
