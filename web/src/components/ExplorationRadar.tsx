import { useEffect, useState } from 'react'
import { Crosshair, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { api } from '@/lib/api'
import type { Drillhole, DrillholeSummary } from '@/types'

interface ExplorationRadarProps {
  drillholes: Drillhole[]
  onSelectDrillhole?: (drillhole: Drillhole) => void
}

type GradeClass = 'HIGH GRADE' | 'ANOMALOUS' | 'BACKGROUND'

interface HoleAnalysis {
  drillhole: Drillhole
  summary: DrillholeSummary
  grade: GradeClass
}

function classify(maxAu: number | null, avgAu: number | null): GradeClass {
  if (maxAu != null && maxAu >= 1.0) return 'HIGH GRADE'
  if ((maxAu != null && maxAu >= 0.1) || (avgAu != null && avgAu >= 0.05)) return 'ANOMALOUS'
  return 'BACKGROUND'
}

const GRADE_META: Record<GradeClass, { color: string; label: string }> = {
  'HIGH GRADE': { color: 'bg-amber-500', label: 'High Grade' },
  'ANOMALOUS': { color: 'bg-sky-500', label: 'Anomalous' },
  'BACKGROUND': { color: 'bg-slate-600', label: 'Background' },
}

function generateInsight(analyses: HoleAnalysis[]): string {
  if (analyses.length === 0) return 'Insufficient data for project-level interpretation.'

  const highGrade = analyses.filter(a => a.grade === 'HIGH GRADE')
  const anomalous = analyses.filter(a => a.grade === 'ANOMALOUS')
  const total = analyses.length
  const highPct = Math.round((highGrade.length / total) * 100)
  const anomPct = Math.round((anomalous.length / total) * 100)

  const best = [...analyses].sort(
    (a, b) => (b.summary.max_au ?? 0) - (a.summary.max_au ?? 0)
  )[0]

  // Depth-grade relationship — compare grade tiers against average depth
  let depthStr = ''
  if (highGrade.length >= 2) {
    const avgDepth =
      analyses.reduce((s, a) => s + a.drillhole.max_depth, 0) / total
    const deepHigh = highGrade.filter(a => a.drillhole.max_depth > avgDepth).length
    const shallowHigh = highGrade.filter(a => a.drillhole.max_depth <= avgDepth).length

    if (deepHigh > shallowHigh) {
      depthStr =
        'High-grade intercepts favor deeper holes — system potentially open at depth.'
    } else if (shallowHigh > deepHigh) {
      depthStr =
        'Strongest intercepts in shallower holes — near-surface enrichment zone identified.'
    } else {
      depthStr = 'Mineralization distributed across depth range — multiple horizons possible.'
    }
  }

  const bestLabel = `${best.summary.max_au?.toFixed(2)} ppm in ${best.drillhole.drillhole}`

  if (highPct >= 30) {
    return `Robust mineralization footprint: ${highPct}% of holes carry high-grade Au (≥1 ppm), best intercept ${bestLabel}. ${depthStr}`
  }
  if (highPct + anomPct >= 50) {
    return `Encouraging system: ${highPct + anomPct}% of holes anomalous or better. Best vector at ${bestLabel}. ${depthStr}`
  }
  return `Early-stage signal: ${anomPct}% anomalous. Best intercept ${bestLabel}. Expand reconnaissance coverage.`
}

export function ExplorationRadar({ drillholes, onSelectDrillhole }: ExplorationRadarProps) {
  const [analyses, setAnalyses] = useState<HoleAnalysis[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true)
        const results: HoleAnalysis[] = []
        for (const dh of drillholes) {
          try {
            const summary = await api.getDrillholeSummary(dh.drillhole_id)
            results.push({
              drillhole: dh,
              summary,
              grade: classify(summary.max_au, summary.avg_au),
            })
          } catch {
            /* skip failed holes */
          }
        }
        setAnalyses(results)
      } finally {
        setLoading(false)
      }
    }

    if (drillholes.length > 0) fetchAll()
  }, [drillholes])

  if (loading) {
    return (
      <Card className="border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-amber-500 animate-pulse" />
            Exploration Radar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="h-3.5 w-3.5 border-2 border-slate-600 border-t-amber-400 rounded-full animate-spin" />
            Analyzing project...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (analyses.length === 0) return null

  const totalMeters = Math.round(
    analyses.reduce((s, a) => s + a.drillhole.max_depth, 0)
  )
  const totalSamples = analyses.reduce((s, a) => s + a.summary.total_samples, 0)

  const gradeGroups: Record<GradeClass, HoleAnalysis[]> = {
    'HIGH GRADE': analyses.filter(a => a.grade === 'HIGH GRADE'),
    ANOMALOUS: analyses.filter(a => a.grade === 'ANOMALOUS'),
    BACKGROUND: analyses.filter(a => a.grade === 'BACKGROUND'),
  }

  const priorities = [...analyses]
    .sort((a, b) => (b.summary.max_au ?? 0) - (a.summary.max_au ?? 0))
    .filter(a => a.grade === 'HIGH GRADE')
    .slice(0, 3)

  const insight = generateInsight(analyses)

  return (
    <Card className="border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-amber-500" />
          Exploration Radar
        </CardTitle>
        <p className="text-[11px] text-slate-500">
          {analyses.length} holes · {totalMeters.toLocaleString()} m drilled ·{' '}
          {totalSamples.toLocaleString()} samples
        </p>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Grade distribution bars */}
        <div className="space-y-1.5">
          {(['HIGH GRADE', 'ANOMALOUS', 'BACKGROUND'] as GradeClass[]).map(grade => {
            const count = gradeGroups[grade].length
            const pct = Math.round((count / analyses.length) * 100)
            return (
              <div key={grade} className="flex items-center gap-2">
                <div className="w-[68px] text-[10px] text-slate-400 text-right shrink-0">
                  {GRADE_META[grade].label}
                </div>
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${GRADE_META[grade].color} transition-all duration-700`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 w-14 shrink-0">
                  {count} ({pct}%)
                </span>
              </div>
            )
          })}
        </div>

        {/* Priority targets */}
        {priorities.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5">
            <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-1.5">
              🔥 Priority Targets
            </p>
            <div className="flex flex-wrap gap-1.5">
              {priorities.map(p => (
                <button
                  key={p.drillhole.drillhole_id}
                  onClick={() => onSelectDrillhole?.(p.drillhole)}
                  className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
                >
                  {p.drillhole.drillhole} · {p.summary.max_au?.toFixed(2)} ppm
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Project interpretation */}
        <div className="bg-slate-800/30 rounded-lg p-2.5 border border-slate-700/30">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Project Interpretation
          </p>
          <p className="text-xs text-slate-300 leading-relaxed italic">
            {insight}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
