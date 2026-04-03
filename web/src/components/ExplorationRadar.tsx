import { useEffect, useState } from 'react'
import { Crosshair, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { api } from '@/lib/api'
import type { Assay, Drillhole } from '@/types'

const AU_CUTOFF = 0.1 // ppm — intervals below this break an intercept

interface ExplorationRadarProps {
  drillholes: Drillhole[]
  onSelectDrillhole?: (drillhole: Drillhole) => void
}

type GradeClass = 'SIGNIFICANT' | 'ANOMALOUS' | 'SUB-ECONOMIC'

/** A continuous mineralized intercept (consecutive samples above cutoff) */
interface Intercept {
  from: number   // top depth (m)
  to: number     // bottom depth (m)
  thickness: number
  avgGrade: number // length-weighted average Au (ppm)
  gt: number       // grade × thickness (ppm·m)
}

interface HoleAnalysis {
  drillhole: Drillhole
  intercepts: Intercept[]
  bestIntercept: Intercept | null // highest GT intercept
  totalGT: number                 // sum of all intercept GTs
}

/**
 * Detect continuous mineralized intercepts from sorted assays.
 * Groups consecutive samples with Au >= cutoff into intercepts.
 */
function detectIntercepts(assays: Assay[], cutoff: number): Intercept[] {
  const sorted = [...assays].sort((a, b) => a.from - b.from)
  const intercepts: Intercept[] = []
  let current: Assay[] = []

  const flush = () => {
    if (current.length === 0) return
    const from = current[0].from
    const to = current[current.length - 1].to
    const thickness = to - from
    let gt = 0
    for (const a of current) {
      gt += a.value * (a.to - a.from)
    }
    intercepts.push({
      from,
      to,
      thickness: Math.round(thickness * 10) / 10,
      avgGrade: Math.round((gt / thickness) * 100) / 100,
      gt: Math.round(gt * 100) / 100,
    })
    current = []
  }

  for (const a of sorted) {
    if (a.value >= cutoff) {
      current.push(a)
    } else {
      flush()
    }
  }
  flush()
  return intercepts
}

/** Classify by best intercept GT */
function classify(gt: number): GradeClass {
  if (gt >= 10) return 'SIGNIFICANT'
  if (gt >= 1) return 'ANOMALOUS'
  return 'SUB-ECONOMIC'
}

const GRADE_META: Record<GradeClass, { color: string; label: string }> = {
  SIGNIFICANT: { color: 'bg-amber-500', label: 'Significant' },
  ANOMALOUS: { color: 'bg-sky-500', label: 'Anomalous' },
  'SUB-ECONOMIC': { color: 'bg-slate-600', label: 'Sub-economic' },
}

function generateInsight(analyses: HoleAnalysis[]): string {
  if (analyses.length === 0) return 'Insufficient data.'

  const withIntercepts = analyses.filter(a => a.bestIntercept)
  if (withIntercepts.length === 0) return `No intercepts above ${AU_CUTOFF} ppm detected.`

  const significant = withIntercepts.filter(a => classify(a.bestIntercept!.gt) === 'SIGNIFICANT')
  const total = analyses.length
  const sigPct = Math.round((significant.length / total) * 100)

  const best = [...withIntercepts].sort((a, b) => b.bestIntercept!.gt - a.bestIntercept!.gt)[0]
  const bi = best.bestIntercept!
  const bestLabel = `${bi.thickness}m @ ${bi.avgGrade} ppm (GT ${bi.gt}) in ${best.drillhole.drillhole}`

  // Detect if multiple holes share a similar intercept depth range (±20m window)
  let depthCluster = ''
  if (significant.length >= 2) {
    const midpoints = significant.map(a => (a.bestIntercept!.from + a.bestIntercept!.to) / 2)
    midpoints.sort((a, b) => a - b)
    const median = midpoints[Math.floor(midpoints.length / 2)]
    const nearby = midpoints.filter(m => Math.abs(m - median) <= 20).length
    if (nearby >= 2) {
      depthCluster = `${nearby} holes show significant intercepts near ${Math.round(median)}m depth — potential mineralized horizon.`
    }
  }

  if (sigPct >= 30) {
    return `Strong footprint: ${sigPct}% of holes have intercepts with GT ≥ 10. Best: ${bestLabel}. ${depthCluster}`
  }
  if (withIntercepts.length > total / 2) {
    return `Encouraging: ${withIntercepts.length}/${total} holes mineralized. Best: ${bestLabel}. ${depthCluster}`
  }
  return `Early-stage: best intercept ${bestLabel}. ${depthCluster}`
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
            const intercepts = detectIntercepts(res.data, AU_CUTOFF)
            const best = intercepts.length > 0
              ? intercepts.reduce((a, b) => (b.gt > a.gt ? b : a))
              : null
            results.push({
              drillhole: dh,
              intercepts,
              bestIntercept: best,
              totalGT: intercepts.reduce((s, i) => s + i.gt, 0),
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
            Detecting intercepts across all holes...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (analyses.length === 0) return null

  const totalDrilled = Math.round(analyses.reduce((s, a) => s + a.drillhole.max_depth, 0))
  const totalIntercepts = analyses.reduce((s, a) => s + a.intercepts.length, 0)
  const projectGT = analyses.reduce((s, a) => s + a.totalGT, 0)

  // Classify by best intercept GT (holes with no intercepts → SUB-ECONOMIC)
  const classifyHole = (a: HoleAnalysis) => classify(a.bestIntercept?.gt ?? 0)

  const gradeGroups: Record<GradeClass, HoleAnalysis[]> = {
    SIGNIFICANT: analyses.filter(a => classifyHole(a) === 'SIGNIFICANT'),
    ANOMALOUS: analyses.filter(a => classifyHole(a) === 'ANOMALOUS'),
    'SUB-ECONOMIC': analyses.filter(a => classifyHole(a) === 'SUB-ECONOMIC'),
  }

  const priorities = [...analyses]
    .filter(a => a.bestIntercept && classify(a.bestIntercept.gt) === 'SIGNIFICANT')
    .sort((a, b) => b.bestIntercept!.gt - a.bestIntercept!.gt)
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
          {totalIntercepts} intercepts · GT {projectGT.toFixed(1)} ppm·m
        </p>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Distribution bars — by best intercept GT */}
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

        {/* Priority targets — best intercept per hole */}
        {priorities.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5">
            <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-1.5">
              Priority Intercepts (GT ≥ 10)
            </p>
            <div className="flex flex-col gap-1.5">
              {priorities.map(p => {
                const bi = p.bestIntercept!
                return (
                  <button
                    key={p.drillhole.drillhole_id}
                    onClick={() => onSelectDrillhole?.(p.drillhole)}
                    className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer text-left"
                  >
                    <span className="font-medium">{p.drillhole.drillhole}</span>
                    {' · '}{bi.thickness}m @ {bi.avgGrade} ppm Au
                    {' · '}GT {bi.gt}
                    <span className="text-slate-500 ml-1">({bi.from}–{bi.to}m)</span>
                  </button>
                )
              })}
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
