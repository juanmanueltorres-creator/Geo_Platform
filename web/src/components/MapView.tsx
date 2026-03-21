import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { api } from '@/lib/api'
import type { Drillhole } from '@/types'
import 'leaflet/dist/leaflet.css'

interface MapViewProps {
  onDrillholeSelect?: (drillhole: Drillhole) => void
  onDrillholesLoaded?: (drillholes: Drillhole[]) => void
}

export function MapView({ onDrillholeSelect, onDrillholesLoaded }: MapViewProps) {
  const [drillholes, setDrillholes] = useState<Drillhole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDrillholes = async () => {
      try {
        setLoading(true)
        const data = await api.getDrillholeLocations()
        const holes = data.features.map(feature => ({
          drillhole_id: feature.properties.drillhole_id,
          hole_id: feature.properties.hole_id,
          drillhole: feature.properties.drillhole,
          max_depth: feature.properties.max_depth,
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

  // Default center (Andean Argentina)
  const defaultCenter = [-31.534, -68.536] as [number, number]

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
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
        maxZoom={19}
      />

      {drillholes.map(hole => {
        const coords = hole.geometry?.coordinates as [number, number]
        if (!coords) return null

        return (
          <CircleMarker
            key={hole.drillhole_id}
            center={[coords[1], coords[0]]}
            radius={8}
            fillColor="#ff7800"
            color="#1f77b4"
            weight={2}
            opacity={0.9}
            fillOpacity={0.8}
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
                      <td>{hole.max_depth.toFixed(1)} m</td>
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
