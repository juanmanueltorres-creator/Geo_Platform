import { useEffect, useState } from 'react'
import { Trophy, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { api } from '@/lib/api'
import type { DrillholeSummary, Drillhole } from '@/types'

interface TopDrillholesProps {
  drillholes: Drillhole[]
  onSelectDrillhole?: (drillhole: Drillhole) => void
  selectedDrillholeId?: string | null
  searchTerm?: string
}

interface DrillholesWithSummary {
  drillhole: Drillhole
  summary: DrillholeSummary
}

export function TopDrillholes({ drillholes, onSelectDrillhole, selectedDrillholeId, searchTerm = '' }: TopDrillholesProps) {
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
      <Card className="border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Drillholes by Au</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="h-3.5 w-3.5 border-2 border-slate-600 border-t-amber-400 rounded-full animate-spin" />
            Loading summaries...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (ranked.length === 0) {
    return (
      <Card className="border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Drillholes by Au</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">No data available</p>
        </CardContent>
      </Card>
    )
  }

  const maxAu = Math.max(...ranked.map(r => r.summary.max_au || 0), 1)

  const filtered = searchTerm
    ? ranked.filter(r => r.drillhole.drillhole.toLowerCase().includes(searchTerm.toLowerCase()))
    : ranked

  return (
    <Card className="border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center space-x-2 text-xl font-extrabold text-white tracking-tight drop-shadow-sm">
          <Trophy className="w-5 h-5 text-amber-500" />
          <span>Top Drillholes</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {filtered.length === 0 && searchTerm ? (
          <p className="text-sm text-slate-500 py-2 text-center">
            No matches for "{searchTerm}"
          </p>
        ) : (
          filtered.slice(0, 4).map((item, idx) => (
          <div
            key={item.drillhole.drillhole_id}
            onClick={() => onSelectDrillhole?.(item.drillhole)}
            className={`space-y-1.5 p-2.5 rounded-lg cursor-pointer transition-all ${
              item.drillhole.drillhole_id === selectedDrillholeId
                ? 'bg-amber-900/30 ring-1 ring-amber-500'
                : 'bg-slate-800/50 hover:bg-slate-700/60'
            }`}
          >
            {/* Rank + Name */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {idx + 1}
                </div>
                <p className="font-bold text-slate-100 text-[16px] leading-tight">
                  {item.drillhole.drillhole}
                </p>
              </div>
              <span className="text-xs font-bold text-amber-300 drop-shadow-sm">
                {item.summary.max_au?.toFixed(2)} ppm
              </span>
            </div>

            {/* Visual Bar */}
            <div className="space-y-0.5">
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
                  style={{
                    width: `${((item.summary.max_au || 0) / maxAu) * 100}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 opacity-80">
                <span>{item.summary.total_samples} samples</span>
                <span>Avg: {item.summary.avg_au?.toFixed(2) || '—'} ppm</span>
              </div>
            </div>
          </div>
        ))
        )}

        {/* CTA */}
        <div className="pt-1.5 border-t border-slate-700">
          <p className="text-[11px] text-slate-500 flex items-center space-x-1">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Click a drillhole for depth profile</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
