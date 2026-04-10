import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'

type Props = { mapRef: React.MutableRefObject<L.Map | null> }

export default function MapMeasurementTools({ mapRef }: Props) {
  const [active, setActive] = useState(false)
  const [polylineMode, setPolylineMode] = useState(false)
  const [, setTick] = useState(0)
  const pointsRef = useRef<L.LatLng[]>([])
  const polylineRef = useRef<L.Polyline | null>(null)
  const markersRef = useRef<L.Layer[]>([])
  const labelRef = useRef<L.Marker | null>(null)
  const clickHandlerRef = useRef<((e: L.LeafletMouseEvent) => void) | null>(null)

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const onClick = (e: L.LeafletMouseEvent) => {
      // Avoid intercepting clicks on markers, controls or popups
      try {
        const target = (e.originalEvent && (e.originalEvent.target as HTMLElement)) || null
        if (target && target.closest && target.closest('.leaflet-marker-icon, .leaflet-control, .leaflet-popup, .leaflet-control-container, button, input')) {
          return
        }
      } catch (_) {
        // ignore DOM check errors
      }

      const latlng = e.latlng
      const pts = pointsRef.current

      if (!polylineMode) {
        // existing 2-point behavior (unchanged)
        if (pts.length === 0) {
          pts.push(latlng)
          const m = L.circleMarker(latlng, { radius: 6, color: '#f59e0b', weight: 2, fillColor: '#fffbeb', fillOpacity: 0.95 }).addTo(map)
          markersRef.current.push(m)
          setTick(t => t + 1)
        } else if (pts.length === 1) {
          pts.push(latlng)
          const p = L.polyline([pts[0], pts[1]], { color: '#f59e0b', weight: 3 }).addTo(map)
          polylineRef.current = p
          const m2 = L.circleMarker(latlng, { radius: 6, color: '#f59e0b', weight: 2, fillColor: '#fffbeb', fillOpacity: 0.95 }).addTo(map)
          markersRef.current.push(m2)

          const mid = L.latLng((pts[0].lat + pts[1].lat) / 2, (pts[0].lng + pts[1].lng) / 2)
          const meters = pts[0].distanceTo(pts[1])
          // Use non-breaking space between value and unit to keep them attached visually
          const distanceStr = meters >= 1000 ? `${(meters / 1000).toFixed(2)}\u00A0km` : `${meters.toFixed(1)}\u00A0m`
          const az = computeBearing(pts[0].lat, pts[0].lng, pts[1].lat, pts[1].lng)
          // Floating label: primary line = large value+unit; secondary line = azimuth
          const html = `<div style="background: rgba(2,6,23,0.9); color: #fff; padding:10px 14px; border-radius:8px; font-size:13px; min-width:160px; max-width:260px; box-shadow:0 8px 20px rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; gap:6px; box-sizing:border-box; text-align:center;">` +
            `<div style="font-weight:800; font-size:16px; line-height:1.25; padding:2px 0; white-space:nowrap">${distanceStr}</div>` +
            `<div style="font-size:12px; color: rgba(255,255,255,0.92); line-height:1.3">Azimuth: ${az.toFixed(1)}°</div>` +
            `</div>`
          const icon = L.divIcon({ className: 'measure-label', html, iconSize: undefined })
          const label = L.marker(mid, { icon, interactive: false }).addTo(map)
          labelRef.current = label
          setTick(t => t + 1)
        } else {
          // ignore extra clicks until reset in single-line mode
        }
      } else {
        // polyline (multi-point) mode: accumulate points and extend polyline
        pts.push(latlng)
        const m = L.circleMarker(latlng, { radius: 5.5, color: '#f59e0b', weight: 1.5, fillColor: '#fffbeb', fillOpacity: 0.95 }).addTo(map)
        markersRef.current.push(m)

        if (!polylineRef.current) {
          const p = L.polyline(pts, { color: '#f59e0b', weight: 3 }).addTo(map)
          polylineRef.current = p
        } else {
          polylineRef.current.addLatLng(latlng)
        }

        // compute total distance across all legs
        let total = 0
        for (let i = 1; i < pts.length; i++) {
          total += pts[i - 1].distanceTo(pts[i])
        }
        const distanceStr = total >= 1000 ? `${(total / 1000).toFixed(2)}\u00A0km` : `${total.toFixed(1)}\u00A0m`

        // azimuth of the last segment (if available)
        let az: number | null = null
        if (pts.length >= 2) {
          az = computeBearing(pts[pts.length - 2].lat, pts[pts.length - 2].lng, pts[pts.length - 1].lat, pts[pts.length - 1].lng)
        }

        // update floating label at midpoint of last segment
        if (labelRef.current && map) {
          map.removeLayer(labelRef.current)
          labelRef.current = null
        }
        if (pts.length >= 2) {
          const lastMid = L.latLng((pts[pts.length - 2].lat + pts[pts.length - 1].lat) / 2, (pts[pts.length - 2].lng + pts[pts.length - 1].lng) / 2)
          const html = `<div style="background: rgba(2,6,23,0.9); color: #fff; padding:10px 14px; border-radius:8px; font-size:13px; min-width:160px; max-width:280px; box-shadow:0 8px 20px rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; gap:6px; box-sizing:border-box; text-align:center;">` +
            `<div style="font-weight:800; font-size:16px; line-height:1.25; padding:2px 0; white-space:nowrap">${distanceStr}</div>` +
            `${az !== null ? `<div style="font-size:12px; color: rgba(255,255,255,0.92); line-height:1.3">Azimuth: ${az.toFixed(1)}°</div>` : ''}` +
            `</div>`
          const icon = L.divIcon({ className: 'measure-label', html, iconSize: undefined })
          const label = L.marker(lastMid, { icon, interactive: false }).addTo(map)
          labelRef.current = label
        }
        setTick(t => t + 1)
      }
    }

    // store stable reference so cleanup can always remove the same handler
    clickHandlerRef.current = onClick
    if (active) {
      map.on('click', onClick)
    }
    return () => {
      if (clickHandlerRef.current && map) {
        map.off('click', clickHandlerRef.current)
        clickHandlerRef.current = null
      }
    }
  }, [active, mapRef, polylineMode])

  useEffect(() => {
    if (!active) {
      clearMeasurement()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  function computeBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (d: number) => d * Math.PI / 180
    const toDeg = (r: number) => r * 180 / Math.PI
    const φ1 = toRad(lat1)
    const φ2 = toRad(lat2)
    const Δλ = toRad(lon2 - lon1)
    const y = Math.sin(Δλ) * Math.cos(φ2)
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
    let brng = Math.atan2(y, x)
    brng = toDeg(brng)
    brng = (brng + 360) % 360
    return brng
  }

  function clearMeasurement() {
    const map = mapRef.current
    pointsRef.current = []
    if (polylineRef.current && map) {
      map.removeLayer(polylineRef.current)
      polylineRef.current = null
    }
    markersRef.current.forEach(m => { if (map) map.removeLayer(m) })
    markersRef.current = []
    if (labelRef.current && map) {
      map.removeLayer(labelRef.current)
      labelRef.current = null
    }
    setTick(t => t + 1)
  }

  function handleReset() {
    clearMeasurement()
    setActive(true)
  }
  function handleClose() {
    clearMeasurement()
    setActive(false)
  }

  const pts = pointsRef.current
  let statusText = 'Click to place point A'
  let distanceText = ''
  let azimuthText = ''
  if (!polylineMode) {
    if (pts.length === 1) statusText = 'Click to place point B'
    if (pts.length === 2) {
      const meters = pts[0].distanceTo(pts[1])
      // keep unit attached to value using non-breaking space
      distanceText = meters >= 1000 ? `${(meters / 1000).toFixed(2)}\u00A0km` : `${meters.toFixed(1)}\u00A0m`
      azimuthText = `${computeBearing(pts[0].lat, pts[0].lng, pts[1].lat, pts[1].lng).toFixed(1)}°`
      statusText = 'Measurement ready'
    }
  } else {
    if (pts.length === 0) statusText = 'Click to place first point'
    else if (pts.length === 1) statusText = 'Click to add next point'
    if (pts.length >= 2) {
      // compute total distance for polyline
      let total = 0
      for (let i = 1; i < pts.length; i++) total += pts[i - 1].distanceTo(pts[i])
      distanceText = total >= 1000 ? `${(total / 1000).toFixed(2)}\u00A0km` : `${total.toFixed(1)}\u00A0m`
      azimuthText = `${computeBearing(pts[pts.length - 2].lat, pts[pts.length - 2].lng, pts[pts.length - 1].lat, pts[pts.length - 1].lng).toFixed(1)}°`
      statusText = 'Measurement ready'
    }
  }

  return (
    <div>
      <div style={{ position: 'absolute', top: 150, left: 16, zIndex: 1400 }}>
        <button
          onClick={() => setActive(v => !v)}
          title={active ? 'Exit measurement mode' : 'Enter measurement mode'}
          style={{
            background: active ? 'rgba(251,191,36,0.92)' : 'rgba(15,23,42,0.60)',
            color: active ? '#1e293b' : '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '10px 18px', borderRadius: 12, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(15,23,42,0.18)',
            backdropFilter: 'blur(10px)',
            fontSize: 15,
            transition: 'background 0.18s, box-shadow 0.18s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = active ? 'rgba(251,191,36,1)' : 'rgba(30,41,59,0.72)')}
          onMouseLeave={e => (e.currentTarget.style.background = active ? 'rgba(251,191,36,0.92)' : 'rgba(15,23,42,0.60)')}
        >
          {active ? 'Measuring…' : 'Measure'}
        </button>
      </div>

      {active && (
        <div style={{ position: 'absolute', top: 150, left: 90, zIndex: 1400 }}>
          <div style={{
            background: 'rgba(15,23,42,0.60)',
            color: '#fff',
            padding: '16px 18px',
            borderRadius: 14,
            minWidth: 200,
            boxShadow: '0 4px 24px rgba(15,23,42,0.18)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxSizing: 'border-box',
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, lineHeight: 1.3 }}>{statusText}</div>
              <div style={{ marginBottom: 10 }}>
                <button
                  onClick={() => { clearMeasurement(); setPolylineMode(p => !p); setActive(true) }}
                  title={polylineMode ? 'Polyline mode: ON' : 'Polyline mode: OFF'}
                  style={{
                    padding: '8px 14px', borderRadius: 8, fontWeight: 700, cursor: 'pointer',
                    background: polylineMode ? 'rgba(251,191,36,0.92)' : 'rgba(255,255,255,0.08)',
                    color: polylineMode ? '#1e293b' : '#fff', border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 2px 8px rgba(15,23,42,0.10)',
                    transition: 'background 0.18s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = polylineMode ? 'rgba(251,191,36,1)' : 'rgba(30,41,59,0.18)')}
                  onMouseLeave={e => (e.currentTarget.style.background = polylineMode ? 'rgba(251,191,36,0.92)' : 'rgba(255,255,255,0.08)')}
                >
                  {polylineMode ? 'Path: ON' : 'Path: OFF'}
                </button>
              </div>
            </div>
            {distanceText && <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8, lineHeight: 1.2 }}>{`Distance: ${distanceText}`}</div>}
            {azimuthText && <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.92)', lineHeight: 1.3 }}>{`Azimuth: ${azimuthText}`}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleReset} style={{ flex: 1, padding: '10px 12px', borderRadius: 8, background: '#0ea5e9', color: '#fff', border: 'none', cursor: 'pointer', fontWeight:700, boxShadow: '0 2px 8px rgba(15,23,42,0.10)', transition: 'background 0.18s' }}>Reset</button>
              <button onClick={handleClose} style={{ padding: '10px 12px', borderRadius: 8, background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight:700, boxShadow: '0 2px 8px rgba(15,23,42,0.10)', transition: 'background 0.18s' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
