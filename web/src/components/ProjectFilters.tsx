import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card'

type Filters = {
  commodities: string[]
  stage: string
  priority: '' | 'HIGH' | 'MEDIUM' | 'LOW'
  region: string
}

type Options = {
  commodities: string[]
  stages: string[]
  priorities: string[]
  regions: string[]
}

interface Props {
  filters: Filters
  options: Options
  onChange: (f: Filters) => void
  onReset: () => void
  totalCount: number
  filteredCount: number
  selectedKeptVisible?: boolean
  noMatches?: boolean
}

export default function ProjectFilters({ filters, options, onChange, onReset, totalCount, filteredCount, selectedKeptVisible, noMatches }: Props) {
  const selectedCommodity = filters.commodities && filters.commodities.length > 0 ? filters.commodities[0] : ''

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-base font-semibold tracking-tight">Project Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-1">
        <div>
          <div className="text-xs text-slate-400/80 font-medium mb-1">Commodity</div>
          <select
            value={selectedCommodity}
            onChange={(e) => onChange({ ...filters, commodities: e.target.value ? [e.target.value] : [] })}
            className="w-full px-3 py-2 rounded-md bg-slate-900/60 border border-white/10 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all duration-200"
          >
            <option value="">All</option>
            {options.commodities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-xs text-slate-400/80 font-medium mb-1">Stage</div>
          <select
            value={filters.stage}
            onChange={(e) => onChange({ ...filters, stage: e.target.value })}
            className="w-full px-3 py-2 rounded-md bg-slate-900/60 border border-white/10 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all duration-200"
          >
            <option value="">All</option>
            {options.stages.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-xs text-slate-400/80 font-medium mb-1">Priority</div>
          <select
            value={filters.priority}
            onChange={(e) => onChange({ ...filters, priority: e.target.value as any })}
            className="w-full px-3 py-2 rounded-md bg-slate-900/60 border border-white/10 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all duration-200"
          >
            <option value="">Any</option>
            {options.priorities.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-xs text-slate-400/80 font-medium mb-1">Region</div>
          <select
            value={filters.region}
            onChange={(e) => onChange({ ...filters, region: e.target.value })}
            className="w-full px-3 py-2 rounded-md bg-slate-900/60 border border-white/10 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all duration-200"
          >
            <option value="">All</option>
            {options.regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="text-xs text-slate-400 mt-2">Showing {filteredCount} of {totalCount} projects</div>
        {noMatches && (
          <>
            <div className="text-xs text-amber-300 mt-1">No projects match the active filters</div>
            {selectedKeptVisible && (
              <div className="text-xs text-amber-300 mt-1">Current selection is still shown</div>
            )}
          </>
        )}
        <div className="flex justify-end mt-2">
          <button
            onClick={onReset}
            className="text-sm text-slate-400 hover:text-slate-100 border border-white/10 px-3 py-1.5 rounded-md transition-all duration-200 hover:border-amber-400/40 hover:brightness-110"
          >
            Reset filters
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
