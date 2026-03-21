import { useEffect, useState } from 'react'
import { Trophy, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { api } from '@/lib/api'
import type { DrillholeSummary, Drillhole } from '@/types'

interface TopDrillholesProps {
  drillholes: Drillhole[]
  onSelectDrillhole?: (drillhole: Drillhole) => void
}

interface DrillholesWithSummary {
  drillhole: Drillhole
  summary: DrillholeSummary
}

export function TopDrillholes({ drillholes, onSelectDrillhole }: TopDrillholesProps) {
  const [ranked, setRanked] = useState<DrillholesWithSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSummaries = async () => {
      try {
        setLoading(true)
        const results: DrillholesWithSummary[] = []
        
        for (const dh of drillholes) {
          try {
            const summary = await api.getDrillholeSummary(dh.drillhole_id)
            results.push({ drillhole: dh, summary })
          } catch (err) {
            console.error(`Failed to load summary for ${dh.drillhole}:`, err)
          }
        }

        // Sort by max_au descending
        const sorted = results.sort((a, b) => {
          const auA = a.summary.max_au || 0
          const auB = b.summary.max_au || 0
          return auB - auA
        })

        setRanked(sorted)
      } catch (err) {
        console.error('Error fetching summaries:', err)
      } finally {
        setLoading(false)
      }
    }

    if (drillholes.length > 0) {
      fetchSummaries()
    }
  }, [drillholes])

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-slate-800 dark:to-slate-900 border-amber-200 dark:border-amber-900">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-base">
            <Trophy className="w-5 h-5 text-amber-500" />
            <span>Top Drillholes por Au</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-400">Cargando datos...</p>
        </CardContent>
      </Card>
    )
  }

  if (ranked.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-slate-800 dark:to-slate-900 border-amber-200 dark:border-amber-900">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-base">
            <Trophy className="w-5 h-5 text-amber-500" />
            <span>Top Drillholes por Au</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-400">Sin datos disponibles</p>
        </CardContent>
      </Card>
    )
  }

  const maxAu = Math.max(...ranked.map(r => r.summary.max_au || 0), 1)

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-slate-800 dark:to-slate-900 border-amber-200 dark:border-amber-900">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-base">
          <Trophy className="w-5 h-5 text-amber-500" />
          <span>Top Drillholes por Au 🏆</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ranked.slice(0, 4).map((item, idx) => (
          <div
            key={item.drillhole.drillhole_id}
            onClick={() => onSelectDrillhole?.(item.drillhole)}
            className="space-y-2 p-3 bg-white dark:bg-slate-700/50 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
          >
            {/* Rank + Name */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                  {item.drillhole.drillhole}
                </p>
              </div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {item.summary.max_au?.toFixed(2)} ppb
              </span>
            </div>

            {/* Visual Bar */}
            <div className="space-y-1">
              <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
                  style={{
                    width: `${((item.summary.max_au || 0) / maxAu) * 100}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>{item.summary.total_samples} samples</span>
                <span>Avg: {item.summary.avg_au?.toFixed(2) || '—'} ppb</span>
              </div>
            </div>
          </div>
        ))}

        {/* CTA */}
        <div className="pt-2 border-t border-amber-200 dark:border-amber-900">
          <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center space-x-1">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Haz clic para ver gráficos de profundidad</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
