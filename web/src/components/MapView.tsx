import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import { api } from '@/lib/api'
import type { Drillhole } from '@/types'
import {
  riversGeoJSON,
  outcropsGeoJSON,
  GEOLOGY_LAYERS,
  type GeologyLayerKey,
} from '@/data/geology-layers'
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
  const [visibleLayers, setVisibleLayers] = useState<Record<GeologyLayerKey, boolean>>({
    rivers: true,
    outcrops: true,
  })

  const toggleLayer = useCallback((key: GeologyLayerKey) => {
    setVisibleLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

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

      {/* Geological context layers — real data from IGN Argentina */}
      {visibleLayers.outcrops && (
        <GeoJSON
          key="outcrops"
          data={outcropsGeoJSON}
          style={() => ({
            fillColor: '#a78bfa',
            fillOpacity: 0.15,
            color: '#7c3aed',
            weight: 1.5,
            opacity: 0.5,
          })}
          onEachFeature={(feature, layer) => {
            layer.bindTooltip(
              `<b>${feature.properties.name}</b><br/>Source: ${feature.properties.source}`,
              { sticky: true }
            )
          }}
        />
      )}

      {visibleLayers.rivers && (
        <GeoJSON
          key="rivers"
          data={riversGeoJSON}
          style={(feature) => {
            const kind = feature?.properties?.kind
            return {
              color: '#3b82f6',
              weight: kind === 'perennial' ? 2.5 : 1.5,
              opacity: kind === 'perennial' ? 0.8 : 0.4,
              dashArray: kind === 'intermittent' ? '4 3' : undefined,
            }
          }}
          onEachFeature={(feature, layer) => {
            const name = feature.properties.name
            const kind = feature.properties.kind === 'perennial' ? 'Perennial' : 'Intermittent'
            layer.bindTooltip(
              `<b>${name}</b><br/>${kind} — IGN`,
              { sticky: true }
            )
          }}
        />
      )}

      {/* Geology layer toggle panel */}
      <div
        style={{
          position: 'absolute', top: 50, right: 10, zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.92)',
          borderRadius: 8, padding: '8px 10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column', gap: 4,
          minWidth: 130,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
          Layers
        </span>
        {(Object.keys(GEOLOGY_LAYERS) as GeologyLayerKey[]).map(key => (
          <label
            key={key}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              cursor: 'pointer', fontSize: 12, color: '#e2e8f0',
              padding: '2px 0',
            }}
          >
            <input
              type="checkbox"
              checked={visibleLayers[key]}
              onChange={() => toggleLayer(key)}
              style={{ accentColor: GEOLOGY_LAYERS[key].color, width: 14, height: 14 }}
            />
            <span
              style={{
                width: 10, height: 10, borderRadius: key === 'outcrops' ? 2 : '50%',
                background: GEOLOGY_LAYERS[key].color, opacity: 0.8,
                display: 'inline-block',
              }}
            />
            {GEOLOGY_LAYERS[key].label}
          </label>
        ))}
      </div>
    </MapContainer>
  )
}
