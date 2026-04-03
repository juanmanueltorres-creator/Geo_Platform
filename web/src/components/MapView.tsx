import { useEffect, useState, useCallback, useRef } from 'react'
import { MapContainer, WMSTileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import { api } from '@/lib/api'
import type { Drillhole } from '@/types'
import {
  riversGeoJSON,
  waterBodiesGeoJSON,
  glaciersGeoJSON,
  boundaryGeoJSON,
  minesGeoJSON,
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
  terrain: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin',
    maxZoom: 18,
    label: 'Terrain',
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
      map.fitBounds(L.latLngBounds(points), { padding: [120, 120], maxZoom: 12 })
    }
  }, [drillholes, map])
  return null
}

/**
 * Swap the basemap URL on an existing Leaflet tile layer instead of
 * unmount/remount.  This preserves the WMS overlay z-order.
 */
function DynamicTileLayer({ url, attribution, maxZoom }: { url: string; attribution: string; maxZoom: number }) {
  const map = useMap()
  const layerRef = useRef<L.TileLayer | null>(null)

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
    }
    const tl = L.tileLayer(url, { attribution, maxZoom })
    tl.addTo(map)
    tl.bringToBack()          // keep basemap behind all overlays
    layerRef.current = tl
    return () => { map.removeLayer(tl) }
  }, [url, attribution, maxZoom, map])

  return null
}

/** Simple fullscreen toggle — uses the Fullscreen API on the map container */
function FullscreenToggle() {
  const map = useMap()
  const [isFs, setIsFs] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = useCallback(() => {
    const el = map.getContainer().closest('.leaflet-container') as HTMLElement | null
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setTimeout(() => map.invalidateSize(), 200))
    } else {
      document.exitFullscreen().then(() => setTimeout(() => map.invalidateSize(), 200))
    }
  }, [map])

  return (
    <button
      onClick={toggle}
      aria-label={isFs ? 'Exit fullscreen' : 'Expand map'}
      title={isFs ? 'Exit fullscreen' : 'Expand map'}
      style={{
        position: 'absolute', bottom: 16, right: 16, zIndex: 1000,
        width: 36, height: 36, border: '2px solid rgba(255,255,255,0.8)',
        borderRadius: 8, cursor: 'pointer',
        background: 'rgba(30,30,30,0.85)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17, color: '#fff', backdropFilter: 'blur(4px)',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(60,60,60,0.95)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(30,30,30,0.85)')}
    >
      {isFs ? '✕' : '⛶'}
    </button>
  )
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
    waterBodies: true,
    glaciers: true,
    boundary: true,
    mines: true,
  })

  // SEGEMAR WMS geological overlay state
  const [showGeologyWMS, setShowGeologyWMS] = useState(true)
  const [showFaultsWMS, setShowFaultsWMS] = useState(true)
  const [wmsOpacity, setWmsOpacity] = useState(0.35)

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

  // Fallback center — Filo del Sol project, overridden by FitBounds once data loads
  const defaultCenter = [-28.49, -69.66] as [number, number]

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
      <DynamicTileLayer
        url={TILE_LAYERS[tileLayer].url}
        attribution={TILE_LAYERS[tileLayer].attribution}
        maxZoom={TILE_LAYERS[tileLayer].maxZoom}
      />
      <FullscreenToggle />

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

      {/* SEGEMAR WMS — 1:500K surface geology (border zone map) */}
      {showGeologyWMS && (
        <WMSTileLayer
          url="https://sigam.segemar.gov.ar/geoserver/ows"
          params={{
            layers: 'GeoFront500:Mapa_frontera_unidad_geologica_500K',
            format: 'image/png',
            transparent: true,
            version: '1.1.1',
          }}
          opacity={wmsOpacity}
        />
      )}
      {showFaultsWMS && (
        <WMSTileLayer
          url="https://sigam.segemar.gov.ar/geoserver/ows"
          params={{
            layers: 'GeoFront500:Mapa_frontera_fallas_500K',
            format: 'image/png',
            transparent: true,
            version: '1.1.1',
          }}
          opacity={Math.min(wmsOpacity + 0.2, 1)}
        />
      )}

      {drillholes.map(hole => {
        const coords = hole.geometry?.coordinates as [number, number]
        if (!coords) return null
        const isSelected = hole.drillhole_id === selectedDrillholeId
        const size = isSelected ? 18 : 12
        const color = isSelected ? '#facc15' : '#e11d48'
        const border = isSelected ? '#92400e' : '#fff'

        const icon = L.divIcon({
          className: '',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24">
            <polygon points="12,2 22,12 12,22 2,12" fill="${color}" stroke="${border}" stroke-width="2"/>
          </svg>`,
        })

        return (
          <Marker
            key={hole.drillhole_id}
            position={[coords[1], coords[0]]}
            icon={icon}
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
          </Marker>
        )
      })}

      {/* Geological context layers — real data from IGN Argentina */}
      {visibleLayers.waterBodies && (
        <GeoJSON
          key="waterBodies"
          data={waterBodiesGeoJSON}
          style={(feature) => {
            const kind = feature?.properties?.kind
            return {
              fillColor: kind === 'perennial' ? '#0ea5e9' : '#67e8f9',
              fillOpacity: kind === 'perennial' ? 0.5 : 0.3,
              color: '#0284c7',
              weight: 1,
              opacity: 0.6,
              dashArray: kind === 'intermittent' ? '4 3' : undefined,
            }
          }}
          onEachFeature={(feature, layer) => {
            const { name, kind } = feature.properties
            const label = kind === 'perennial' ? 'Perennial' : 'Intermittent'
            layer.bindTooltip(`<b>💧 ${name}</b><br/>${label}`, { sticky: true })
          }}
        />
      )}

      {visibleLayers.glaciers && glaciersGeoJSON.features.length > 0 && (
        <GeoJSON
          key="glaciers"
          data={glaciersGeoJSON}
          pointToLayer={(_feature, latlng) =>
            L.circleMarker(latlng, {
              radius: 8,
              fillColor: '#a5f3fc',
              color: '#0e7490',
              weight: 2,
              fillOpacity: 0.8,
            })
          }
          onEachFeature={(feature, layer) => {
            layer.bindTooltip(
              `<b>❄️ ${feature.properties.name}</b>`,
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

      {visibleLayers.boundary && boundaryGeoJSON.features.length > 0 && (
        <GeoJSON
          key="boundary"
          data={boundaryGeoJSON}
          style={() => ({
            color: '#dc2626',
            weight: 2,
            opacity: 0.7,
            dashArray: '8 4',
          })}
          onEachFeature={(feature, layer) => {
            layer.bindTooltip(
              `<b>🇦🇷 ${feature.properties.name} 🇨🇱</b>`,
              { sticky: true }
            )
          }}
        />
      )}

      {visibleLayers.mines && minesGeoJSON.features.length > 0 && (
        <GeoJSON
          key="mines"
          data={minesGeoJSON}
          pointToLayer={(_feature, latlng) =>
            L.circleMarker(latlng, {
              radius: 5,
              fillColor: '#f59e0b',
              color: '#92400e',
              weight: 1.5,
              fillOpacity: 0.9,
            })
          }
          onEachFeature={(feature, layer) => {
            layer.bindTooltip(
              `<b>⛏ ${feature.properties.name}</b><br/>Source: ${feature.properties.source}`,
              { sticky: true }
            )
          }}
        />
      )}

      {/* Interaction hint — shown when no drillhole is selected */}
      {!selectedDrillholeId && drillholes.length > 0 && (
        <div
          style={{
            position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1000, background: 'rgba(15, 23, 42, 0.88)',
            borderRadius: 8, padding: '6px 14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', gap: 8,
            pointerEvents: 'none',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24">
            <polygon points="12,2 22,12 12,22 2,12" fill="#e11d48" stroke="#fff" strokeWidth="2" />
          </svg>
          <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500 }}>
            Click a diamond marker to inspect drillhole assays & geology
          </span>
        </div>
      )}

      {/* Geology layer toggle panel */}
      <div
        style={{
          position: 'absolute', top: 50, right: 10, zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.92)',
          borderRadius: 8, padding: '8px 10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column', gap: 4,
          minWidth: 140,
        }}
      >
        {/* SEGEMAR WMS geology section */}
        <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: 1 }}>
          Geology (SEGEMAR)
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#e2e8f0', padding: '2px 0' }}>
          <input type="checkbox" checked={showGeologyWMS} onChange={() => setShowGeologyWMS(v => !v)} style={{ accentColor: '#d97706', width: 14, height: 14 }} />
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#d97706', opacity: 0.8, display: 'inline-block' }} />
          Surface Units
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#e2e8f0', padding: '2px 0' }}>
          <input type="checkbox" checked={showFaultsWMS} onChange={() => setShowFaultsWMS(v => !v)} style={{ accentColor: '#ef4444', width: 14, height: 14 }} />
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444', opacity: 0.8, display: 'inline-block' }} />
          Faults
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
          <span style={{ fontSize: 10, color: '#94a3b8', minWidth: 46 }}>Opacity</span>
          <input
            type="range" min={0} max={100} value={Math.round(wmsOpacity * 100)}
            onChange={e => setWmsOpacity(Number(e.target.value) / 100)}
            style={{ width: 70, height: 4, accentColor: '#d97706' }}
          />
          <span style={{ fontSize: 10, color: '#94a3b8', minWidth: 26 }}>{Math.round(wmsOpacity * 100)}%</span>
        </div>

        {/* Separator */}
        <div style={{ borderTop: '1px solid rgba(148,163,184,0.3)', margin: '2px 0' }} />

        <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
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
                width: 10, height: 10,
                borderRadius: key === 'waterBodies' ? 2 : '50%',
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
