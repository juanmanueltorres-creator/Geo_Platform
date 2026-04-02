import { useEffect, useState } from 'react'
import { Activity, FlaskConical, Layers, Mountain } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { api } from '@/lib/api'
import type { DrillholeSummary, GeologySummary } from '@/types'

interface DrillholeSummaryProps {
  drillholeId: string
  holeName: string
  maxDepth?: number
}

type GradeClass = 'HIGH GRADE' | 'ANOMALOUS' | 'BACKGROUND'

function classifyGrade(maxAu: number | null, avgAu: number | null): GradeClass {
  if (maxAu != null && maxAu >= 1.0) return 'HIGH GRADE'
  if ((maxAu != null && maxAu >= 0.1) || (avgAu != null && avgAu >= 0.05)) return 'ANOMALOUS'
  return 'BACKGROUND'
}

const badgeStyles: Record<GradeClass, string> = {
  'HIGH GRADE': 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  'ANOMALOUS': 'bg-sky-500/20 text-sky-400 border-sky-500/40',
  'BACKGROUND': 'bg-slate-500/20 text-slate-400 border-slate-500/40',
}

const badgeIcons: Record<GradeClass, string> = {
  'HIGH GRADE': '🔥',
  'ANOMALOUS': '⚡',
  'BACKGROUND': '—',
}

const ALT_COLORS: Record<string, string> = {
  ARG: 'bg-yellow-500',
  PHY: 'bg-emerald-500',
  POT: 'bg-rose-500',
  PRO: 'bg-slate-500',
}

const LITH_COLORS: Record<string, string> = {
  TUF: 'bg-orange-400',
  AND: 'bg-violet-500',
  BRX: 'bg-red-500',
  DIO: 'bg-blue-500',
}

export function DrillholeSummaryCard({ drillholeId, holeName, maxDepth }: DrillholeSummaryProps) {
  const [summary, setSummary] = useState<DrillholeSummary | null>(null)
  const [geology, setGeology] = useState<GeologySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [summaryData, geoData] = await Promise.all([
          api.getDrillholeSummary(drillholeId),
          api.getGeologySummary(drillholeId).catch(() => null),
        ])
        setSummary(summaryData)
        setGeology(geoData)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading summary')
        console.error('Error fetching summary:', err)
      } finally {
        setLoading(false)
      }
    }

    if (drillholeId) fetchData()
  }, [drillholeId])

  if (loading) {
    return (
      <Card className="border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Activity className="w-4 h-4 text-slate-400 animate-pulse" />
            <span>{holeName}</span>
          </CardTitle>
          <p className="text-sm text-slate-400">Loading analysis...</p>
        </CardHeader>
      </Card>
    )
  }

  if (error || !summary) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-lg">{holeName}</CardTitle>
          <p className="text-sm text-red-600 dark:text-red-400">
            {error || 'No data available'}
          </p>
        </CardHeader>
      </Card>
    )
  }

  const grade = classifyGrade(summary.max_au, summary.avg_au)

  return (
    <Card className="border-slate-700">
      {/* Header — hole identity + grade badge */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <FlaskConical className="w-5 h-5 text-amber-500" />
            <span>{holeName}</span>
          </CardTitle>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${badgeStyles[grade]}`}>
            {badgeIcons[grade]} {grade}
          </span>
        </div>
        {maxDepth != null && (
          <p className="text-xs text-slate-500 mt-0.5">
            {maxDepth.toFixed(0)} m total depth · {summary.total_samples} samples
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Primary metric — Peak Au */}
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Peak Au</p>
              <p className="text-2xl font-bold text-amber-400">
                {summary.max_au != null ? summary.max_au.toFixed(3) : 'N/A'}
                <span className="text-xs font-normal text-slate-500 ml-1">ppm</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Avg Au</p>
              <p className="text-lg font-semibold text-slate-300">
                {summary.avg_au != null ? summary.avg_au.toFixed(3) : 'N/A'}
                <span className="text-xs font-normal text-slate-500 ml-1">ppm</span>
              </p>
            </div>
          </div>

          {/* Grade bar */}
          {summary.max_au != null && (
            <div className="mt-2">
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    grade === 'HIGH GRADE'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                      : grade === 'ANOMALOUS'
                      ? 'bg-gradient-to-r from-sky-600 to-sky-400'
                      : 'bg-slate-500'
                  }`}
                  style={{ width: `${Math.min((summary.max_au / 2.0) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[10px] text-slate-600">0</span>
                <span className="text-[10px] text-slate-600">0.1</span>
                <span className="text-[10px] text-slate-600">1.0</span>
                <span className="text-[10px] text-slate-600">2.0+</span>
              </div>
            </div>
          )}
        </div>

        {/* Insight block — signal quality */}
        <div className="bg-slate-800/30 rounded-lg p-2.5 border border-slate-700/30">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Signal Insight</p>
          <p className="text-xs text-slate-300 leading-relaxed">
            {grade === 'HIGH GRADE'
              ? `Peak ${summary.max_au!.toFixed(2)} ppm Au with avg ${summary.avg_au!.toFixed(3)} ppm across ${summary.total_samples} samples — strong sustained signal.`
              : grade === 'ANOMALOUS'
              ? `Peak ${summary.max_au?.toFixed(2) ?? '?'} ppm Au — anomalous signal worth follow-up, ${summary.total_samples} samples logged.`
              : `Background gold values across ${summary.total_samples} samples — low exploration priority.`
            }
          </p>
        </div>

        {/* Geological context — lithology + alteration from geology-summary */}
        {geology && (
          <div className="bg-slate-800/30 rounded-lg p-2.5 border border-slate-700/30 space-y-2.5">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3" /> Geological Context
            </p>

            {/* Lithology row */}
            {geology.lithology_sequence.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Mountain className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] text-slate-400 uppercase">Lithology</span>
                </div>
                {/* Color bar */}
                <div className="flex h-3 rounded-full overflow-hidden mb-1.5">
                  {geology.lithology_sequence.map((code, i) => (
                    <div
                      key={i}
                      className={`${LITH_COLORS[code] ?? 'bg-slate-400'}`}
                      style={{ width: `${100 / geology.lithology_sequence.length}%` }}
                      title={code}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {geology.lithology_sequence.map(code => (
                    <span key={code} className="flex items-center gap-1 text-[10px] text-slate-400">
                      <span className={`w-2 h-2 rounded-full inline-block ${LITH_COLORS[code] ?? 'bg-slate-400'}`} />
                      {code}
                    </span>
                  ))}
                </div>
                {geology.dominant_lithology && (
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Dominant: {geology.dominant_lithology}
                  </p>
                )}
              </div>
            )}

            {/* Divider */}
            {geology.lithology_sequence.length > 0 && geology.alteration_sequence.length > 0 && (
              <div className="border-t border-slate-700/40" />
            )}

            {/* Alteration row */}
            {geology.alteration_sequence.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Layers className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] text-slate-400 uppercase">Alteration</span>
                </div>
                {/* Color bar */}
                <div className="flex h-3 rounded-full overflow-hidden mb-1.5">
                  {geology.alteration_sequence.map((code, i) => (
                    <div
                      key={i}
                      className={`${ALT_COLORS[code] ?? 'bg-slate-400'}`}
                      style={{ width: `${100 / geology.alteration_sequence.length}%` }}
                      title={code}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {geology.alteration_sequence.map(code => (
                    <span key={code} className="flex items-center gap-1 text-[10px] text-slate-400">
                      <span className={`w-2 h-2 rounded-full inline-block ${ALT_COLORS[code] ?? 'bg-slate-400'}`} />
                      {code}
                    </span>
                  ))}
                </div>
                {geology.dominant_alteration && (
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Dominant: {geology.dominant_alteration}
                  </p>
                )}
              </div>
            )}

            {/* Interpretation */}
            {geology.interpretation && (
              <>
                <div className="border-t border-slate-700/40" />
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  {geology.interpretation}
                </p>
              </>
            )}
          </div>
        )}

        {/* Scroll hint */}
        <p className="text-[10px] text-slate-600 text-center">
          ↓ Assay depth profile below
        </p>
      </CardContent>
    </Card>
  )
}
