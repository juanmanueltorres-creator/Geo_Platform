import { useEffect, useState } from 'react'
import { Thermometer, Wind, CloudRain, Cloud, Droplet, Sun } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'
import { Badge } from './ui/Badge'
import { api } from '@/lib/api'
import { msToKmh, degToCardinal } from '@/lib/windUtils'

export type Weather = any

export function FieldConditions({ project, onWeather, expanded = true, title }: { project?: any; onWeather?: (weather: any) => void; expanded?: boolean; title?: string } = {}) {
    if (!expanded) return null
  const [weather, setWeather] = useState<Weather | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    console.log("[weather] fetching current weather", new Date().toISOString());

    const fetchFn = project && project.slug
      ? api.getProjectWeatherCurrentBySlug.bind(null, project.slug)
      : api.getProjectWeatherCurrent

    fetchFn()
      .then((data: any) => {
        if (!mounted) return
        setWeather(data)
        setError(null)
        if (onWeather) onWeather(data)
      })
      .catch((err: any) => {
        if (!mounted) return
        setError(err?.message || 'Failed to fetch weather')
        setWeather(null)
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })
    return () => { mounted = false }
  }, [onWeather, project?.slug])

  const cur = weather?.current
  if (cur) {
    // TEMP: log current weather for gust field inspection
    console.log('weather current:', cur)
  }

  const fmt = (v: number | null | undefined, unit = '') =>
    v === null || v === undefined ? '—' : `${Number(v).toFixed(1)}${unit}`

  // Advisory rule engine (simple, deterministic, readable)
  const advisories: string[] = (() => {
    const out: string[] = []
    if (!cur) return out

    const temp = cur?.temperature_c
    const windMs = cur?.wind_speed_ms
    const windKmh = windMs != null && !isNaN(windMs) ? msToKmh(Number(windMs)) : null
    const humidity = cur?.humidity_percent

    // Wind rule: high wind advisory if > 40 km/h
    if (windKmh != null && windKmh > 40) out.push('High wind advisory')

    // Temperature rules
    if (temp != null && !isNaN(temp)) {
      if (Number(temp) < 0) out.push('Freezing conditions')
      else if (Number(temp) > 35) out.push('High temperature')
    }

    // Humidity rule
    if (humidity != null && !isNaN(humidity) && Number(humidity) > 85) out.push('High humidity')

    // Visibility (optional): check common fields if present
    const visibility = cur?.visibility ?? cur?.visibility_km ?? null
    if (visibility != null && !isNaN(visibility) && Number(visibility) < 2) out.push('Reduced visibility')

    return out
  })()

  return (
    <Card className="bg-[rgba(23,37,84,0.48)] border border-white/20 shadow-[0_6px_24px_0_rgba(0,0,0,0.18)] rounded-lg p-3 px-4 backdrop-blur-xl text-white">
      <CardHeader className="pb-2 px-2">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-[15px] font-semibold text-white tracking-tight leading-tight">{typeof title === 'string' && title.length > 0 ? title : 'Weather'}</CardTitle>
          <span className="text-[12px] text-blue-100 font-semibold">Current conditions</span>
        </div>
        {weather && (
          <div className="text-[11px] text-blue-200 mt-0.5 font-medium">{new Date(weather.fetched_at).toLocaleString()}{weather.stale ? ' · Last known' : ''}</div>
        )}
      </CardHeader>

      <CardContent className="pt-2 pb-2 px-2 flex flex-col gap-2">
        {loading ? (
          <div className="text-xs text-white/70">Loading…</div>
        ) : error ? (
          <div className="text-xs text-rose-400">{error}</div>
        ) : (
          <>
            {/* Hero metric: temperatura */}
            <div className="flex items-center gap-2.5 justify-center border-b border-white/10 pb-2 mb-1">
              <Thermometer className="w-5 h-5 text-amber-400" />
              <div className="text-[2rem] leading-none font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.18)]">{fmt(cur?.temperature_c, '°C')}</div>
            </div>

            {/* Métricas principales */}
            <div className="grid grid-cols-3 gap-x-3 gap-y-2 items-end">
              <div className="flex flex-col items-center gap-1.5">
                <Wind className="w-4 h-4 text-sky-400 mb-0.5" style={cur?.wind_dir_deg != null && !isNaN(cur.wind_dir_deg) ? { transform: `rotate(${cur.wind_dir_deg}deg)` } : {}} />
                <span className="text-[11px] text-blue-100 font-semibold">Wind</span>
                <span className="font-semibold text-white text-[14px]">
                  {msToKmh(cur?.wind_speed_ms)} km/h
                  {(() => {
                    const dir = cur?.wind_dir_deg ?? cur?.wind_direction_deg;
                    if (dir != null && !isNaN(dir)) {
                      return <span style={{ color: '#38bdf8', fontWeight: 700, marginLeft: 4 }}>{degToCardinal(dir)}</span>;
                    }
                    return null;
                  })()}
                </span>
                {cur?.wind_gust_ms != null && !isNaN(cur.wind_gust_ms) && (
                  <span className="text-[11px] text-blue-200 mt-0.5">Gusts {msToKmh(cur.wind_gust_ms)} km/h</span>
                )}
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Droplet className="w-4 h-4 text-blue-300 mb-0.5" />
                <span className="text-[11px] text-blue-100 font-semibold">Humidity</span>
                <span className="font-semibold text-white text-[14px]">{cur?.humidity_percent ?? '—'}%</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Cloud className="w-4 h-4 text-blue-100 mb-0.5" />
                <span className="text-[11px] text-blue-100 font-semibold">Clouds</span>
                <span className="font-semibold text-white text-[14px]">{cur?.cloud_cover_percent ?? '—'}%</span>
              </div>
            </div>

            {/* Métricas secundarias */}
            <div className="flex flex-row items-center justify-between gap-3 border-t border-white/10 pt-2 mt-1">
              <div className="flex flex-col items-center flex-1 gap-1.5">
                <CloudRain className="w-4 h-4 text-emerald-300 mb-0.5" />
                <span className="text-[11px] text-blue-100 font-semibold">Precip</span>
                <span className="font-semibold text-white text-[14px]">{fmt(cur?.precipitation_mm, ' mm')}</span>
              </div>
              <div className="flex flex-col items-center flex-1 gap-1.5 min-w-0">
                <Sun className="w-4 h-4 text-amber-200 mb-0.5" />
                <span className="text-[11px] text-blue-100 font-semibold">Sunrise</span>
                <div className="flex flex-col gap-0.5 items-center w-full min-w-0 justify-center">
                  <span className="font-semibold text-white text-[14px] text-center block">{cur?.sunrise ? new Date(cur.sunrise).toLocaleTimeString() : '—'}</span>
                  <span className="text-[12px] text-blue-200 font-medium text-center block">{cur?.sunset ? new Date(cur.sunset).toLocaleTimeString() : ''}</span>
                </div>
              </div>
            </div>
          </>
        )}
        {/* Field Advisory */}
        {!loading && !error && (
          <div className="pt-2 mt-2 border-t border-white/10">
            <div className="text-[12px] text-blue-100 font-semibold mb-1 text-center">Field Advisory</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {advisories.length === 0 ? (
                <Badge color="amber-soft">Conditions normal</Badge>
              ) : (
                advisories.map((a, i) => (
                  <Badge key={i} color="amber">{a}</Badge>
                ))
              )}
            </div>
          </div>
        )}

        {/* Footer: local time */}
        {!loading && !error && (
          <div className="pt-2 mt-1 border-t border-white/10 text-[12px] text-blue-200 text-center font-semibold">
            Local time: <span className="font-bold">{cur?.time ?? '—'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default FieldConditions
