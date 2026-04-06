import { useEffect, useState } from 'react'
import { Thermometer, Wind, CloudRain, Cloud, Droplet, Sun } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card'
import { api } from '@/lib/api'
import { msToKmh, degToCardinal } from '@/lib/windUtils'

export type Weather = any

export function FieldConditions({ project, onWeather }: { project?: any; onWeather?: (weather: any) => void } = {}) {
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

  return (
    <Card className="bg-white/30 border border-black/10 shadow-[0_2px_8px_0_rgba(0,0,0,0.08)] p-1 px-1.5 backdrop-blur-sm">
      <CardHeader className="pb-1 px-1.5">
        <div className="flex items-center">
          <CardTitle className="text-[15px] font-semibold text-slate-200 mb-0.5">{project ? project.name : 'Field Conditions'}</CardTitle>
        </div>
        {weather && (
          <div className="text-[11px] text-slate-500 mt-0.5">{new Date(weather.fetched_at).toLocaleString()}{weather.stale ? ' · Last known' : ''}</div>
        )}
      </CardHeader>

      <CardContent className="pt-1 pb-2 px-2">
        {loading ? (
          <div className="text-xs text-slate-400">Loading…</div>
        ) : error ? (
          <div className="text-xs text-rose-400">{error}</div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              <div>
                <div className="text-[11px] text-slate-400">Temperature</div>
                <div className="font-medium text-slate-200">{fmt(cur?.temperature_c, ' °C')}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-sky-400" style={cur?.wind_dir_deg != null && !isNaN(cur.wind_dir_deg) ? { transform: `rotate(${cur.wind_dir_deg}deg)` } : {}} />
              <div>
                <div className="text-[11px] text-slate-400">Wind</div>
                <div className="font-medium text-slate-200">
                  {msToKmh(cur?.wind_speed_ms)} km/h
                  {(() => {
                    const dir = cur?.wind_dir_deg ?? cur?.wind_direction_deg;
                    if (dir != null && !isNaN(dir)) {
                      return <span style={{ color: '#38bdf8', fontWeight: 600, marginLeft: 8 }}>{degToCardinal(dir)}</span>;
                    }
                    return null;
                  })()}
                </div>
                {cur?.wind_gust_ms != null && !isNaN(cur.wind_gust_ms) && (
                  <div className="text-[11px] text-slate-400 mt-0.5">Gusts {msToKmh(cur.wind_gust_ms)} km/h</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-slate-500" />
              <div>
                <div className="text-[11px] text-slate-400">Cloud Cover</div>
                <div className="font-medium text-slate-200">{cur?.cloud_cover_percent ?? '—'}%</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Droplet className="w-3.5 h-3.5 text-blue-400" />
              <div>
                <div className="text-[11px] text-slate-400">Humidity</div>
                <div className="font-medium text-slate-200">{cur?.humidity_percent ?? '—'}%</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <CloudRain className="w-3.5 h-3.5 text-emerald-400" />
              <div>
                <div className="text-[11px] text-slate-400">Precipitation</div>
                <div className="font-medium text-slate-200">{fmt(cur?.precipitation_mm, ' mm')}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-300" />
              <div>
                <div className="text-[11px] text-slate-400">Sun</div>
                <div className="font-medium text-slate-200">{cur?.sunrise ? new Date(cur.sunrise).toLocaleTimeString() + ' / ' + new Date(cur.sunset).toLocaleTimeString() : '—'}</div>
              </div>
            </div>

            <div className="col-span-2 text-[11px] text-slate-500 mt-1">Local time: {cur?.time ?? '—'}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default FieldConditions
