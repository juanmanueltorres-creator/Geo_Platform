import { useEffect, useState } from 'react'
import { Thermometer, Wind, CloudRain, Cloud, Droplet, Sun } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card'
import { api } from '@/lib/api'
import { msToKmh, degToCardinal } from '@/lib/windUtils'

export type Weather = any

export function FieldConditions({ onWeather }: { onWeather?: (weather: any) => void } = {}) {
  const [weather, setWeather] = useState<Weather | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    console.log("[weather] fetching current weather", new Date().toISOString());
    api.getProjectWeatherCurrent()
      .then((d) => {
        if (!mounted) return
        setWeather(d)
        setError(null)
        if (onWeather) onWeather(d)
      })
      .catch((err) => {
        if (!mounted) return
        // If backend returned structured 503 (weather_unavailable), show friendly message
        const resp = err?.response
        if (resp && resp.data && resp.data.error === 'weather_unavailable') {
          setError('Weather temporarily unavailable')
        } else {
          setError('Unable to fetch weather')
        }
        if (onWeather) onWeather(null)
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })
    return () => { mounted = false }
  }, [onWeather])

  const cur = weather?.current
  if (cur) {
    // TEMP: log current weather for gust field inspection
    console.log('weather current:', cur)
  }

  const fmt = (v: number | null | undefined, unit = '') =>
    v === null || v === undefined ? '—' : `${Number(v).toFixed(1)}${unit}`

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Field Conditions</CardTitle>
            <CardDescription>
              {weather ? (
                `${new Date(weather.fetched_at).toLocaleString()}${weather.stale ? ' · Using last known conditions' : ''}`
              ) : (
                'Filo del Sol'
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : error ? (
          <div className="text-sm text-rose-400">{error}</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-xs text-slate-400">Temperature</div>
                <div className="font-medium">{fmt(cur?.temperature_c, ' °C')}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-sky-400" style={cur?.wind_dir_deg != null && !isNaN(cur.wind_dir_deg) ? { transform: `rotate(${cur.wind_dir_deg}deg)` } : {}} />
              <div>
                <div className="text-xs text-slate-400">Wind</div>
                <div className="font-medium">
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
                  <div className="text-xs text-slate-400 mt-0.5">Gusts {msToKmh(cur.wind_gust_ms)} km/h</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-slate-500" />
              <div>
                <div className="text-xs text-slate-400">Cloud Cover</div>
                <div className="font-medium">{cur?.cloud_cover_percent ?? '—'}%</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Droplet className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-xs text-slate-400">Humidity</div>
                <div className="font-medium">{cur?.humidity_percent ?? '—'}%</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs text-slate-400">Precipitation</div>
                <div className="font-medium">{fmt(cur?.precipitation_mm, ' mm')}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-300" />
              <div>
                <div className="text-xs text-slate-400">Sun</div>
                <div className="font-medium">{cur?.sunrise ? new Date(cur.sunrise).toLocaleTimeString() + ' / ' + new Date(cur.sunset).toLocaleTimeString() : '—'}</div>
              </div>
            </div>

            <div className="col-span-2 text-xs text-slate-400 mt-2">Local time: {cur?.time ?? '—'}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default FieldConditions
