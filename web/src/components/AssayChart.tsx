import { useEffect, useState } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { api } from '@/lib/api'
import type { Assay } from '@/types'

interface AssayChartProps {
  drillholeId: string
  holeName: string
}

interface DepthRow {
  midDepth: number
  fromDepth: number
  toDepth: number
  au: number | null
  cu: number | null
}

/** Pivot raw assay rows into one row per depth interval with both elements */
function pivotByDepth(rows: Assay[]): DepthRow[] {
  const map = new Map<number, DepthRow>()
  for (const r of rows) {
    const key = r.from
    if (!map.has(key)) {
      map.set(key, {
        midDepth: (r.from + r.to) / 2,
        fromDepth: r.from,
        toDepth: r.to,
        au: null,
        cu: null,
      })
    }
    const entry = map.get(key)!
    const el = r.element.toUpperCase()
    if (el === 'AU') entry.au = r.value
    else if (el === 'CU') entry.cu = r.value
  }
  return Array.from(map.values()).sort((a, b) => a.midDepth - b.midDepth)
}

export function AssayChart({ drillholeId, holeName }: AssayChartProps) {
  const [data, setData] = useState<DepthRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAssays = async () => {
      try {
        setLoading(true)
        const response = await api.getAssays(drillholeId)
        setData(pivotByDepth(response.data))
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading assays')
        console.error('Error fetching assays:', err)
      } finally {
        setLoading(false)
      }
    }

    if (drillholeId) fetchAssays()
  }, [drillholeId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assay Profile - {holeName}</CardTitle>
          <CardDescription>Loading chart...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error || data.length === 0) {
    return (
      <Card className="border-yellow-200 dark:border-yellow-800">
        <CardHeader>
          <CardTitle className="text-lg">Assay Profile - {holeName}</CardTitle>
          <CardDescription className="text-yellow-600 dark:text-yellow-400">
            {error || 'No assay data available'}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const hasCu = data.some(d => d.cu !== null && d.cu > 0)
  const maxDepth = Math.max(...data.map(d => d.toDepth))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Assay Profile - {holeName}</CardTitle>
        <CardDescription>
          Depth profile: Au (ppm){hasCu ? ' + Cu (%)' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={500}>
          <ComposedChart
            layout="vertical"
            data={data}
            margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" strokeOpacity={0.25} />

            {/* Depth axis (Y) — reversed so surface is at top */}
            <YAxis
              dataKey="midDepth"
              type="number"
              domain={[0, maxDepth]}
              reversed
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{
                value: 'Depth (m)',
                angle: -90,
                position: 'insideLeft',
                offset: 0,
                style: { fill: '#94a3b8', fontSize: 12 },
              }}
              width={55}
            />

            {/* Au axis (bottom X) */}
            <XAxis
              xAxisId="au"
              type="number"
              orientation="bottom"
              tick={{ fill: '#f59e0b', fontSize: 10 }}
              label={{
                value: 'Au (ppm)',
                position: 'insideBottom',
                offset: -5,
                style: { fill: '#f59e0b', fontSize: 12 },
              }}
            />

            {/* Cu axis (top X) */}
            {hasCu && (
              <XAxis
                xAxisId="cu"
                type="number"
                orientation="top"
                tick={{ fill: '#22d3ee', fontSize: 10 }}
                label={{
                  value: 'Cu (%)',
                  position: 'insideTop',
                  offset: -5,
                  style: { fill: '#22d3ee', fontSize: 12 },
                }}
              />
            )}

            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: 12,
              }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const row = payload[0]?.payload as DepthRow | undefined
                if (!row || row.fromDepth == null) return null
                return (
                  <div style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: '#f1f5f9',
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {row.fromDepth?.toFixed(1) ?? '?'} – {row.toDepth?.toFixed(1) ?? '?'} m
                    </div>
                    {row.au != null && (
                      <div><span style={{ color: '#f59e0b' }}>Au:</span> {row.au.toFixed(3)} ppm</div>
                    )}
                    {row.cu != null && (
                      <div><span style={{ color: '#22d3ee' }}>Cu:</span> {row.cu.toFixed(3)} %</div>
                    )}
                  </div>
                )
              }}
            />

            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
              verticalAlign="bottom"
            />

            {/* 0.1 ppm Au background threshold — vertical reference */}
            <ReferenceLine
              xAxisId="au"
              x={0.1}
              stroke="#f59e0b"
              strokeDasharray="6 3"
              strokeOpacity={0.4}
              label={{ value: '0.1', position: 'top', fill: '#f59e0b', fontSize: 9 }}
            />

            {/* Au line */}
            <Line
              xAxisId="au"
              type="monotone"
              dataKey="au"
              stroke="#f59e0b"
              strokeWidth={2}
              name="Au (ppm)"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />

            {/* Cu line */}
            {hasCu && (
              <Line
                xAxisId="cu"
                type="monotone"
                dataKey="cu"
                stroke="#22d3ee"
                strokeWidth={1.5}
                name="Cu (%)"
                dot={false}
                strokeDasharray="5 3"
                isAnimationActive={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
