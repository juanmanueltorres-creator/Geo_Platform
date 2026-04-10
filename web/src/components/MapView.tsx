// Minimal Project type for local use
type Project = {
  lat: number;
  lon: number;
  slug: string;
  name: string;
  commodity?: string;
  stage?: string;
  marker_color?: string;
  icon?: string;
  detail_level?: string;
  zoom_default?: number;
}

// --- WeatherPanelOverlay: minimal collapsible weather panel ---
function WeatherPanelOverlay({ project, onWeather }: { project?: any, onWeather?: (w: any) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ width: open ? 170 : 'auto', transition: 'width 0.18s' }}>
      {!open && (
        <button
          aria-label="Show weather panel"
          title="Show weather panel"
          className="flex items-center gap-2"
          style={{
            background: 'rgba(15,23,42,0.92)',
            border: '1px solid rgba(148,163,184,0.3)',
            borderRadius: 6,
            padding: '5px 9px',
            cursor: 'pointer',
            color: '#e2e8f0',
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            justifyContent: 'flex-start',
            marginTop: 8,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,41,59,0.98)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(15,23,42,0.92)')}
          onClick={() => setOpen(true)}
        >
          <span role="img" aria-label="weather" style={{ fontSize: 17, color: '#f59e0b', fontWeight: 700 }}>☀️</span>
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Weather</span>
        </button>
      )}
      {open && (
        <div className="relative" style={{ marginTop: 8 }}>
          <FieldConditions
            project={project}
            onWeather={onWeather}
            expanded={true}
          />
          <button
            aria-label="Close weather panel"
            title="Close weather panel"
            className="absolute top-1 right-1 w-6 h-6 rounded bg-slate-800/80 text-slate-100 hover:bg-amber-700/80 flex items-center justify-center border border-slate-700"
            style={{ fontSize: 15, lineHeight: 1, padding: 0 }}
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
import { useEffect, useState, useCallback, useRef } from 'react'
import { MapContainer, WMSTileLayer, Marker, Popup, GeoJSON, useMap, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { LeafletScaleControl } from './LeafletScaleControl'
import { FieldConditions } from './FieldConditions'
import MapMeasurementTools from './MapMeasurementTools'
import { api } from '@/lib/api'
import type { Drillhole } from '@/types'
import type { Weather } from './FieldConditions'

// Helper to safely capture map instance in ref
function MapInstanceBridge({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap()
  useEffect(() => {
    mapRef.current = map
  }, [map, mapRef])
  return null
}

// import { WindOverlay } from './WindOverlay'
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
function FitBounds({ drillholes, projectSlug }: { drillholes: Drillhole[]; projectSlug?: string | null }) {
  const map = useMap()
  useEffect(() => {
    // Only auto-fit bounds for the flagship project (Filo del Sol).
    // If a regional project is selected, we prefer explicit recentering.
    if (projectSlug && projectSlug !== 'filo-del-sol') return
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

/** Recenter map when the selected project changes */
function Recenter({ center, zoom }: { center?: [number, number] | undefined; zoom?: number | undefined }) {
  const map = useMap()
  useEffect(() => {
    if (!center) return
    try {
      map.setView(center, zoom ?? map.getZoom(), { animate: true })
    } catch (e) {
      // ignore map errors
    }
  }, [center?.[0], center?.[1], zoom, map])
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

/** Fullscreen toggle — native Fullscreen API on desktop, CSS fixed positioning fallback on iOS Safari */
function FullscreenToggle({ onMobileToggle, isMobileFs }: { onMobileToggle: () => void; isMobileFs: boolean }) {
  const map = useMap()
  const [isNativeFs, setIsNativeFs] = useState(false)

  useEffect(() => {
    const onChange = () => setIsNativeFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const isFs = document.fullscreenEnabled ? isNativeFs : isMobileFs

  const toggle = useCallback(() => {
    if (document.fullscreenEnabled) {
      const el = map.getContainer().closest('.leaflet-container') as HTMLElement | null
      if (!el) return
      if (!document.fullscreenElement) {
        el.requestFullscreen().then(() => setTimeout(() => map.invalidateSize(), 200))
      } else {
        document.exitFullscreen().then(() => setTimeout(() => map.invalidateSize(), 200))
      }
    } else {
      // iOS Safari / mobile fallback: CSS-based pseudo-fullscreen
      onMobileToggle()
      setTimeout(() => map.invalidateSize(), 200)
    }
  }, [map, onMobileToggle])

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
  /** Optional: externally-provided subset of drillholes to display */
  visibleDrillholes?: Drillhole[] | null
  onLoadingChange?: (loading: boolean) => void
  weather?: Weather | null
  project?: Project | null
  projects?: Project[]
  onProjectSelect?: (project: Project) => void
  onWeather?: (w: any) => void
}

export function MapView({ onDrillholeSelect, onDrillholesLoaded, selectedDrillholeId, visibleDrillholes, onLoadingChange, weather, project, projects = [], onProjectSelect, onWeather }: MapViewProps) {
  const [drillholes, setDrillholes] = useState<Drillhole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Render all project markers, highlight the selected one
  function renderProjectMarkers() {
    if (!projects || projects.length === 0) return null
    return projects.map((p) => {
      const isSelected = project && p.slug === project.slug
      const size = isSelected ? 32 : 22
      const iconHtml = `<svg width="${size}" height="${size}" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="13" fill="${p.marker_color || (isSelected ? '#2563eb' : '#64748b')}" stroke="#fff" stroke-width="3" />
        <text x="16" y="21" text-anchor="middle" font-size="16" fill="#fff">★</text>
      </svg>`
      const leafletIcon = L.divIcon({
        className: isSelected ? 'selected-project-marker' : 'project-marker',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        html: iconHtml,
      })
      return (
        <Marker
          key={p.slug}
          position={[p.lat, p.lon]}
          icon={leafletIcon}
          zIndexOffset={isSelected ? 1000 : 500}
          eventHandlers={{
            click: () => onProjectSelect && onProjectSelect(p)
          }}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-bold text-geo-primary mb-1">{p.name}</div>
              <div className="text-xs mb-1">{p.lat.toFixed(5)}, {p.lon.toFixed(5)}</div>
              <div className="text-xs">{p.commodity} &middot; {p.stage}</div>
            </div>
          </Popup>
        </Marker>
      )
    })
  }
  const [tileLayer, setTileLayer] = useState<TileLayerKey>('terrain')
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
  const [showHillshade, setShowHillshade] = useState(false)
  // Departamentos overlay (San Juan) — thin boundary-only lines, no fill.
  // Place a clean GeoJSON file at `public/data/san_juan_departamentos.geojson`.
  const [showDepartamentos, setShowDepartamentos] = useState(false)
  const [departamentosGeoJSON, setDepartamentosGeoJSON] = useState<any | null>(null)
  // Rutas overlay (San Juan) — road network lines from `public/data/san_juan_rutas.geojson`.
  const [showRutas, setShowRutas] = useState(false)
  const [rutasGeoJSON, setRutasGeoJSON] = useState<any | null>(null)

  const toggleLayer = useCallback((key: GeologyLayerKey) => {
    setVisibleLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  // Load local GeoJSON for San Juan departamentos (served from `public/data/`).
  // This is intentionally silent if the file is missing; add a clean san_juan_departamentos.geojson
  // to `web/public/data/` and the overlay will appear when toggled.
  useEffect(() => {
    let mounted = true
    fetch('/data/san_juan_departamentos.geojson')
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch departamentos geojson')
        return r.json()
      })
      .then(j => { if (mounted) setDepartamentosGeoJSON(j) })
      .catch(() => { /* keep quiet; file may not be present in this environment */ })
    return () => { mounted = false }
  }, [])

  // Load local GeoJSON for San Juan rutas (roads). Served from `public/data/`.
  useEffect(() => {
    let mounted = true
    fetch('/data/san_juan_rutas.geojson')
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch rutas geojson')
        return r.json()
      })
      .then(j => { if (mounted) setRutasGeoJSON(j) })
      .catch(() => { /* keep quiet; file may not be present in this environment */ })
    return () => { mounted = false }
  }, [])

  const [layerPanelOpen, setLayerPanelOpen] = useState(false)
  const [isMobileFs, setIsMobileFs] = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)
  const GEOLOGY_WMS_BASE = 'https://sigam.segemar.gov.ar/geoserver/ows'
  const GEOLOGY_WMS_LAYER = 'GeoFront500:Mapa_frontera_unidad_geologica_500K'
  const GEOLOGY_LEGEND_URL = `${GEOLOGY_WMS_BASE}?service=WMS&request=GetLegendGraphic&format=image/png&version=1.1.1&transparent=false&LEGEND_OPTIONS=forceLabels:on&layer=${encodeURIComponent(GEOLOGY_WMS_LAYER)}`

  // Leaflet map instance reference so we can imperatively set view on project change
  const mapRef = useRef<L.Map | null>(null)
  // Map-local coordinate bar refs (presentation-only, do NOT lift state)
  const coordBarRef = useRef<HTMLDivElement | null>(null)
  const copyTimerRef = useRef<number | null>(null)

  // Download helper for data URLs
  const downloadDataUrl = (dataUrl: string, filename: string) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  // Capture the map container using a client-side DOM-to-image library if available.
  const captureMap = async () => {
    const map = mapRef.current
    if (!map) {
      alert('Map not ready')
      return
    }
    const container = map.getContainer() as HTMLElement
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `map_${ts}.png`

    try {
      const w = window as any
      // Try html-to-image API
      if (w.htmlToImage && typeof w.htmlToImage.toPng === 'function') {
        const dataUrl = await w.htmlToImage.toPng(container)
        downloadDataUrl(dataUrl, filename)
        return
      }
      // Try dom-to-image
      if (w.domtoimage && typeof w.domtoimage.toPng === 'function') {
        const dataUrl = await w.domtoimage.toPng(container)
        downloadDataUrl(dataUrl, filename)
        return
      }
      // Try html2canvas
      if (w.html2canvas && typeof w.html2canvas === 'function') {
        const canvas = await w.html2canvas(container)
        const dataUrl = canvas.toDataURL('image/png')
        downloadDataUrl(dataUrl, filename)
        return
      }

      throw new Error('No client-side capture library found')
    } catch (err) {
      console.warn('Screenshot failed', err)
      // Fallback: inform user to use manual capture
      alert('Screenshot not supported in this browser. Use manual capture.')
    }
  }

  const fetchDrillholes = useCallback(async () => {
    try {
      setLoading(true)
      onLoadingChange?.(true)
      setError(null)
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
    } catch (err) {
      setError('Could not reach the server. The API may be starting up.')
      console.error('Error fetching drillholes:', err)
    } finally {
      setLoading(false)
      onLoadingChange?.(false)
    }
  }, [onDrillholesLoaded, onLoadingChange])

  useEffect(() => {
    fetchDrillholes()
  }, [fetchDrillholes])


  // Fallback center and zoom — use selected project if available, else Filo del Sol
  const defaultProject = project || (projects && projects.length > 0 ? projects[0] : null)
  const defaultCenter = defaultProject ? [defaultProject.lat, defaultProject.lon] as [number, number] : [-28.49, -69.66] as [number, number]

  // Compute project center/zoom when a project is selected
  const projectCenter = project ? [project.lat, project.lon] as [number, number] : defaultCenter
  const projectZoom = project && typeof project.zoom_default === 'number'
    ? project.zoom_default
    : 18

  // Recenter imperatively when the selected project changes — use the project's `zoom_default` when provided.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !project) return
    const targetZoom = project.zoom_default !== undefined ? project.zoom_default : (project.detail_level === 'full' ? 12 : 9)
    try {
      map.setView([project.lat, project.lon], targetZoom)
    } catch (e) {
      // ignore map errors in exotic environments
    }
  }, [project?.lat, project?.lon, project?.zoom_default, project?.detail_level])

  // Map-local coordinate UI: show live cursor coords and copy-on-click for empty-map clicks.
  // All state and DOM updates are local here to avoid any parent re-renders.
  useEffect(() => {
    let mounted = true
    let retryTimer: number | null = null
    let cleanup: (() => void) | null = null

    const attach = () => {
      const map = mapRef.current
      if (!map) {
        // Map instance may not be ready yet; retry briefly (small, bounded attempts)
        retryTimer = window.setTimeout(() => { if (mounted) attach() }, 60)
        return
      }

      const coordEl = coordBarRef.current
      const updateCoord = (lat: number, lng: number) => {
        if (!coordEl) return
        coordEl.textContent = `Lat ${lat.toFixed(5)} | Lon ${lng.toFixed(5)}`
      }
      const clearCoord = () => { if (coordEl) coordEl.textContent = '' }

      const onMouseMove = (e: L.LeafletMouseEvent) => {
        updateCoord(e.latlng.lat, e.latlng.lng)
      }
      const onMouseOut = () => {
        clearCoord()
      }

      const onClick = async (e: L.LeafletMouseEvent) => {
        try {
          if (!e || !e.originalEvent) return
          const target = (e.originalEvent.target as HTMLElement) || null
          // Ignore clicks on markers, controls, popups, buttons, inputs
          if (target && target.closest && target.closest('.leaflet-marker-icon, .leaflet-control, .leaflet-popup, .leaflet-control-container, button, input')) {
            return
          }
        } catch (_) {
          return
        }

        // If measurement mode appears active (measurement UI or labels exist), do not copy
        if (document.querySelector('button[title="Exit measurement mode"], .measure-label')) return

        const lat = e.latlng.lat
        const lng = e.latlng.lng
        const latStr = lat.toFixed(5)
        const lngStr = lng.toFixed(5)
        const payload = `${latStr}, ${lngStr}`

        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(payload)
          } else {
            const ta = document.createElement('textarea')
            ta.value = payload
            ta.style.position = 'fixed'
            ta.style.left = '-9999px'
            document.body.appendChild(ta)
            ta.select()
            document.execCommand('copy')
            document.body.removeChild(ta)
          }

          // show subtle temporary feedback in the same coord bar
          if (coordEl) {
            const prev = coordEl.textContent || ''
            coordEl.textContent = `Copied: ${payload}`
            if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
            copyTimerRef.current = window.setTimeout(() => {
              if (coordEl) coordEl.textContent = prev
              copyTimerRef.current = null
            }, 1500)
          }
        } catch (_) {
          // silent failure — do not disturb map interaction
        }
      }

      map.on('mousemove', onMouseMove)
      map.on('mouseout', onMouseOut)
      map.on('click', onClick)

      cleanup = () => {
        map.off('mousemove', onMouseMove)
        map.off('mouseout', onMouseOut)
        map.off('click', onClick)
      }
    }

    attach()

    return () => {
      mounted = false
      if (retryTimer) window.clearTimeout(retryTimer)
      if (cleanup) cleanup()
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current)
        copyTimerRef.current = null
      }
    }
  }, [mapRef])

  // If a filtered subset is provided by the parent, render that instead of the full list
  const renderedDrillholes = visibleDrillholes ?? drillholes


  // Recenter map when a drillhole is selected
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedDrillholeId) return

    const hole = drillholes.find(h => h.drillhole_id === selectedDrillholeId || h.hole_id === selectedDrillholeId)
    if (!hole) return
    const coords = hole.geometry?.coordinates as [number, number] | undefined
    if (!coords) return

    const target: [number, number] = [coords[1], coords[0]]
    const currentZoom = map.getZoom()
    // reasonable zoom for inspection: not too close, not too far
    const targetZoom = Math.max(12, Math.min(16, currentZoom < 13 ? 14 : Math.max(currentZoom, 15)))

    try {
      // prefer smooth animated flyTo when available
      map.flyTo(target, targetZoom, { animate: true, duration: 1.0 })
    } catch (e) {
      try { map.setView(target, targetZoom, { animate: true }) } catch (e) { /* ignore */ }
    }
  }, [selectedDrillholeId, drillholes])

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
        <div className="text-center space-y-3">
          <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Free-tier API may take ~30s to wake up.</p>
          <button
            onClick={fetchDrillholes}
            className="px-4 py-2 bg-geo-primary text-white rounded-lg text-sm hover:bg-geo-primary/80 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  console.log('[MapView] received weather prop:', weather);
  return (
    <div style={isMobileFs
      ? { position: 'fixed', inset: 0, zIndex: 9999 }
      : { width: '100%', height: '100%', position: 'relative' }
    }>
    <MapContainer
      center={projectCenter}
      zoom={projectZoom}
      style={{ width: '100%', height: '100%', borderRadius: '0.5rem', position: 'relative' }}
      className="z-0"
    >
      {/* Right-side control stack: basemap, Layers */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1200, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch', minWidth: 120 }}>
        {/* Basemap selector */}
        <div
          style={{
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
      </div>
      {/* Geology legend (collapsed) */}
      <div style={{ position: 'absolute', top: 190, left: 12, zIndex: 1400 }}>
        <button
          onClick={() => setLegendOpen(v => !v)}
          aria-label={legendOpen ? 'Hide geology legend' : 'Show geology legend'}
          title={legendOpen ? 'Hide geology legend' : 'Show geology legend'}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(148,163,184,0.3)',
            borderRadius: '8px 8px 0 0', padding: '5px 9px', cursor: 'pointer',
            color: '#e2e8f0', fontSize: 11, fontWeight: 600,
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,41,59,0.98)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(15,23,42,0.92)')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5h18M3 12h18M3 19h18" />
          </svg>
          Geology Legend
        </button>
        {legendOpen && (
          <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1300, marginTop: -1, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(15, 23, 42, 0.96)', borderRadius: '0 0 8px 8px', padding: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', color: '#e2e8f0', minWidth: 180, maxHeight: 240, overflowY: 'auto' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: 1 }}>Geology Legend</div>
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 18, height: 12, background: '#f6e7c3', borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Qal</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Quaternary alluvium</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 18, height: 12, background: '#c68a3d', borderRadius: 2 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>OMiv</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Volcanic / volcaniclastic unit</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 18, height: 12, background: '#e9d6ad', borderRadius: 2 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>PIQs</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Ignimbrite / pyroclastic unit</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 18, height: 12, background: '#d1d5d9', borderRadius: 2 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>PTrg</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Granite / intrusive unit</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '100%', height: 2, background: '#000', borderRadius: 1 }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Faults</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '100%', height: 2, background: '#6b7280', borderRadius: 1 }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Rutas</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* WeatherPanelOverlay centrado arriba */}
      <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 1300 }}>
        <WeatherPanelOverlay project={project} onWeather={onWeather} />
      </div>
      <MapInstanceBridge mapRef={mapRef} />
      <MapMeasurementTools mapRef={mapRef} />
      <FitBounds drillholes={renderedDrillholes} />
      <Recenter center={projectCenter} zoom={projectZoom} />
        {/* Project markers */}
        {renderProjectMarkers()}
      <DynamicTileLayer
        url={TILE_LAYERS[tileLayer].url}
        attribution={TILE_LAYERS[tileLayer].attribution}
        maxZoom={TILE_LAYERS[tileLayer].maxZoom}
      />
      {showHillshade && (
          <TileLayer
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}"
            opacity={0.3}
          />
      )}
      {/* Leaflet metric scale control (bottom-right, unobtrusive) */}
      <LeafletScaleControl />
      <FullscreenToggle onMobileToggle={() => setIsMobileFs(v => !v)} isMobileFs={isMobileFs} />

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
        // Note: this WMS returns raster tiles; color cannot be recolored client-side.
        // To render faults in a different color the WMS must expose a server-side style (use `styles` param).
        <WMSTileLayer
          url="https://sigam.segemar.gov.ar/geoserver/ows"
          params={{
            layers: 'GeoFront500:Mapa_frontera_fallas_500K',
            format: 'image/png',
            transparent: true,
            version: '1.1.1',
          }}
          opacity={Math.min(wmsOpacity + 0.35, 1)}
        />
      )}

      {renderedDrillholes.map(hole => {
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

      {/* Departamentos (San Juan) — boundary-only, very subtle styling */}
      {showDepartamentos && departamentosGeoJSON && (
        <GeoJSON
          key="departamentos"
          data={departamentosGeoJSON}
          style={() => ({
            color: '#5f6b7a',
            weight: 1,
            opacity: 0.65,
            fillOpacity: 0,
          })}
          onEachFeature={(feature, layer) => {
            const name = feature?.properties?.name ?? feature?.properties?.NOMBRE ?? 'Departamento'
            layer.bindTooltip(`<strong>${name}</strong>`, { sticky: true })
          }}
        />
      )}

      {/* Rutas (San Juan) — road network overlay from local GeoJSON */}
      {showRutas && rutasGeoJSON && (
        <GeoJSON
          key="rutas"
          data={rutasGeoJSON}
          style={(feature: any) => {
            const props = feature?.properties ?? {}
            const jurisd = String(props.jurisdicci ?? '').toLowerCase()
            const objeto = String(props.objeto ?? '').toLowerCase()

            if (objeto === 'huella') {
              const z = mapRef.current?.getZoom() ?? 8
              let weight = 0.8
              let opacity = 0.35
              if (z >= 13) { weight = 1.6; opacity = 0.8 }
              else if (z >= 11) { weight = 1.2; opacity = 0.6 }
              else if (z >= 9) { weight = 1.0; opacity = 0.5 }
              return { color: '#9ca3af', weight, opacity, lineCap: 'round', lineJoin: 'round' }
            }

            if (jurisd.includes('nacional')) {
              return { color: '#374151', weight: 1.6, opacity: 0.8 }
            }

            if (jurisd.includes('provincial')) {
              return { color: '#6b7280', weight: 1.2, opacity: 0.6 }
            }

            return { color: '#9ca3af', weight: 1, opacity: 0.4 }
          }}
          onEachFeature={(feature, layer) => {
            const label =
              feature?.properties?.rtn ??
              feature?.properties?.ref ??
              feature?.properties?.name ??
              'Ruta'
            const displayLabel = (/^ruta\b/i.test(String(label)) ? label : `Ruta ${label}`)
            layer.bindTooltip(`<strong>${displayLabel}</strong>`, { sticky: true })
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
      {!selectedDrillholeId && renderedDrillholes.length > 0 && (
        <div
          style={{
            position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1400, background: 'rgba(15, 23, 42, 0.88)',
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

      {/* Cursor coordinate bar (map-local, presentation-only, non-interactive) */}
      <div
        ref={coordBarRef}
        aria-hidden
        style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          bottom: 12, zIndex: 1000,
          pointerEvents: 'none',
          background: 'rgba(2,6,23,0.78)', color: '#fff',
          padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
          minWidth: 220, textAlign: 'center', boxShadow: '0 6px 18px rgba(0,0,0,0.18)'
        }}
      />

      {/* Collapsible layer panel */}
      <div style={{ position: 'absolute', top: 50, right: 10, zIndex: 1301 }}>
        {/* Toggle button — always visible */}
        <button
          onClick={() => setLayerPanelOpen(v => !v)}
          aria-label={layerPanelOpen ? 'Hide layers' : 'Show layers'}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(148,163,184,0.3)',
            borderRadius: 6, padding: '5px 9px', cursor: 'pointer',
            color: '#e2e8f0', fontSize: 11, fontWeight: 600,
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)', width: '100%',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,41,59,0.98)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(15,23,42,0.92)')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          Layers {layerPanelOpen ? '▲' : '▼'}
        </button>

        {/* Panel content — collapsible */}
        {layerPanelOpen && (
          <div
            style={{
              marginTop: 4,
              background: 'rgba(15, 23, 42, 0.92)',
              borderRadius: 8, padding: '8px 10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              display: 'flex', flexDirection: 'column', gap: 4,
              minWidth: 140,
            }}
          >
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

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#e2e8f0', padding: '2px 0' }}>
                  <input type="checkbox" checked={showHillshade} onChange={() => setShowHillshade(v => !v)} style={{ accentColor: '#94a3b8', width: 14, height: 14 }} />
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#94a3b8', opacity: 0.7, display: 'inline-block' }} />
                  Terrain (Hillshade)
                </label>

                <div style={{ marginTop: 6 }}>
                  <button
                    onClick={captureMap}
                    disabled={!mapRef.current}
                    title={!mapRef.current ? 'Map not ready' : 'Capture map as PNG'}
                    style={{
                      padding: '6px 8px', fontSize: 12, background: 'rgba(30,41,59,0.95)', color: '#e2e8f0',
                      borderRadius: 6, border: '1px solid rgba(148,163,184,0.12)', cursor: 'pointer'
                    }}
                  >
                    Capture Map
                  </button>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#e2e8f0', padding: '2px 0' }}>
                  <input type="checkbox" checked={showDepartamentos} onChange={() => setShowDepartamentos(v => !v)} style={{ accentColor: '#5f6b7a', width: 14, height: 14 }} />
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#5f6b7a', opacity: 0.35, display: 'inline-block' }} />
                  Departamentos (San Juan)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#e2e8f0', padding: '2px 0' }}>
                  <input type="checkbox" checked={showRutas} onChange={() => setShowRutas(v => !v)} style={{ accentColor: '#f59e0b', width: 14, height: 14 }} />
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b', opacity: 0.9, display: 'inline-block' }} />
                  Rutas (San Juan)
                </label>

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
        )}
      </div>
    </MapContainer>
    </div>
  )
}
