import { useEffect, useState } from 'react'
import { Crosshair, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { api } from '@/lib/api'
import type { Assay, Drillhole } from '@/types'

const AU_CUTOFF = 0.1 // ppm — intervals below this are excluded from GT

interface ExplorationRadarProps {
  drillholes: Drillhole[]
  onSelectDrillhole?: (drillhole: Drillhole) => void
}

type GradeClass = 'SIGNIFICANT' | 'ANOMALOUS' | 'SUB-ECONOMIC'

interface HoleAnalysis {
  drillhole: Drillhole
  gt: number           // grade × thickness (ppm·m) above cutoff
  minThickness: number // total meters above cutoff
  avgGrade: number     // weighted average grade in mineralized intervals
  intervals: number    // count of intervals above cutoff
}

/** Compute GT (grade × thickness) from raw assays above a cutoff */
function computeGT(assays: Assay[], cutoff: number): { gt: number; thickness: number; intervals: number } {
  let gt = 0
  let thickness = 0
  let intervals = 0
  for (const a of assays) {
    if (a.value >= cutoff) {
      const len = a.to - a.from
      gt += a.value * len
      thickness += len
      intervals++
    }
  }
  return { gt: Math.round(gt * 100) / 100, thickness: Math.round(thickness * 10) / 10, intervals }
}

/** Classify by GT — thresholds for a Cu-Au epithermal/porphyry system */
function classify(gt: number): GradeClass {
  if (gt >= 10) return 'SIGNIFICANT'   // e.g. 1 ppm × 10m, or 0.5 ppm × 20m
  if (gt >= 1) return 'ANOMALOUS'      // detectable but not yet economic
  return 'SUB-ECONOMIC'
}

const GRADE_META: Record<GradeClass, { color: string; label: string }> = {
  SIGNIFICANT: { color: 'bg-amber-500', label: 'Significant' },
  ANOMALOUS: { color: 'bg-sky-500', label: 'Anomalous' },
  'SUB-ECONOMIC': { color: 'bg-slate-600', label: 'Sub-economic' },
}

function generateInsight(analyses: HoleAnalysis[]): string {
  if (analyses.length === 0) return 'Insufficient data for project-level interpretation.'

  const significant = analyses.filter(a => classify(a.gt) === 'SIGNIFICANT')
  const anomalous = analyses.filter(a => classify(a.gt) === 'ANOMALOUS')
  const total = analyses.length
  const sigPct = Math.round((significant.length / total) * 100)

  const best = [...analyses].sort((a, b) => b.gt - a.gt)[0]
  const bestLabel = `GT ${best.gt.toFixed(1)} ppm·m over ${best.minThickness}m in ${best.drillhole.drillhole}`

  // Depth-grade relationship: do deeper holes carry more GT?
  let depthStr = ''
  if (significant.length >= 2) {
    const avgDepth = analyses.reduce((s, a) => s + a.drillhole.max_depth, 0) / total
    const deepSig = significant.filter(a => a.drillhole.max_depth > avgDepth).length
    const shallowSig = significant.length - deepSig
    if (deepSig > shallowSig) {
      depthStr = 'GT increases with hole depth — system potentially open at depth.'
    } else if (shallowSig > deepSig) {
      depthStr = 'Strongest GT in shallower holes — near-surface enrichment.'
    }
  }

  if (sigPct >= 30) {
    return `Strong footprint: ${sigPct}% of holes have GT ≥ 10 ppm·m. Best intercept ${bestLabel}. ${depthStr}`
  }
  if (significant.length + anomalous.length > total / 2) {
    return `Encouraging: ${significant.length + anomalous.length}/${total} holes anomalous+. Best: ${bestLabel}. ${depthStr}`
  }
  return `Early-stage: best intercept ${bestLabel}. ${anomalous.length} anomalous holes. Expand coverage at cutoff ${AU_CUTOFF} ppm.`
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
            const res = await api.getAssays(dh.drillhole_id, 'Au')
            const { gt, thickness, intervals } = computeGT(res.data, AU_CUTOFF)
            results.push({
              drillhole: dh,
              gt,
              minThickness: thickness,
              avgGrade: thickness > 0 ? Math.round((gt / thickness) * 100) / 100 : 0,
              intervals,
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
            Computing GT across all holes...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (analyses.length === 0) return null

  const totalDrilled = Math.round(analyses.reduce((s, a) => s + a.drillhole.max_depth, 0))
  const totalMineralized = analyses.reduce((s, a) => s + a.minThickness, 0)
  const projectGT = analyses.reduce((s, a) => s + a.gt, 0)

  const gradeGroups: Record<GradeClass, HoleAnalysis[]> = {
    SIGNIFICANT: analyses.filter(a => classify(a.gt) === 'SIGNIFICANT'),
    ANOMALOUS: analyses.filter(a => classify(a.gt) === 'ANOMALOUS'),
    'SUB-ECONOMIC': analyses.filter(a => classify(a.gt) === 'SUB-ECONOMIC'),
  }

  const priorities = [...analyses]
    .sort((a, b) => b.gt - a.gt)
    .filter(a => classify(a.gt) === 'SIGNIFICANT')
    .slice(0, 3)

  const insight = generateInsight(analyses)

  return (
    <Card className="border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-amber-500" />
          Exploration Radar
          <span className="text-[10px] text-slate-600 font-normal ml-auto">
            cutoff {AU_CUTOFF} ppm
          </span>
        </CardTitle>
        <p className="text-[11px] text-slate-500">
          {analyses.length} holes · {totalDrilled.toLocaleString()} m drilled ·{' '}
          {totalMineralized.toFixed(0)} m mineralized · GT {projectGT.toFixed(1)} ppm·m
        </p>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* GT distribution bars */}
        <div className="space-y-1.5">
          {(['SIGNIFICANT', 'ANOMALOUS', 'SUB-ECONOMIC'] as GradeClass[]).map(grade => {
            const count = gradeGroups[grade].length
            const pct = Math.round((count / analyses.length) * 100)
            return (
              <div key={grade} className="flex items-center gap-2">
                <div className="w-[76px] text-[10px] text-slate-400 text-right shrink-0">
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

        {/* Priority targets — sorted by GT */}
        {priorities.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5">
            <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-1.5">
              Priority Targets (GT ≥ 10)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {priorities.map(p => (
                <button
                  key={p.drillhole.drillhole_id}
                  onClick={() => onSelectDrillhole?.(p.drillhole)}
                  className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
                >
                  {p.drillhole.drillhole} · GT {p.gt.toFixed(1)} · {p.minThickness}m @ {p.avgGrade} ppm
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Project interpretation */}
        <div className="bg-slate-800/30 rounded-lg p-2.5 border border-slate-700/30">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Interpretation
          </p>
          <p className="text-xs text-slate-300 leading-relaxed italic">
            {insight}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
