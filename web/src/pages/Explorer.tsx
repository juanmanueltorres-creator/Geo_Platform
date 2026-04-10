
import { DrillholeSummaryCard } from '@/components/DrillholeSummaryCard'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Zap, Globe } from 'lucide-react'
import { MapView } from '@/components/MapView'
import type { Weather } from '@/components/FieldConditions'
import { ThemeToggle } from '@/components/ThemeToggle'
import { TopDrillholes } from '@/components/TopDrillholes'
import { ExplorationRadar } from '@/components/ExplorationRadar'
import { ProjectOverview } from '@/components/ProjectOverview'
import ProjectFilters from '@/components/ProjectFilters'
import { rankProject } from '@/lib/ranking'
import { api } from '@/lib/api'
import type { Drillhole, DrillholeSummary } from '@/types'
import { AssayChart } from '@/components/AssayChart'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card'

// --- AssayChartToggle: mobile-only expand/collapse ---
function AssayChartToggle({ drillholeId, holeName }: { drillholeId: string, holeName: string }) {
  const [show, setShow] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024 // Desktop: visible by default
    }
    return true
  })
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024
  return (
    <div>
      {isMobile && (
        <button
          className="mb-2 px-3 py-1 rounded bg-slate-800 text-slate-100 text-sm font-medium border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
          onClick={() => setShow((v) => !v)}
        >
          {show ? 'Hide analysis' : 'View analysis'}
        </button>
      )}
      {(show || !isMobile) && (
        <AssayChart drillholeId={drillholeId} holeName={holeName} />
      )}
    </div>
  )
}

export function Explorer() {
  const [weather, setWeather] = useState<Weather | null>(null)
  // Weather handler for FieldConditions
  const handleWeather = useCallback((w: Weather | null) => setWeather(w), [])
  const [isMobileFromMap, setIsMobileFromMap] = useState<boolean>(false)
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<any | null>(null)
  const [selectedDrillhole, setSelectedDrillhole] = useState<Drillhole | null>(null)
  const [allDrillholes, setAllDrillholes] = useState<Drillhole[]>([])
  // Filtering state
  const [auThreshold, setAuThreshold] = useState<number | null>(null)
  const [minDepthFilter, setMinDepthFilter] = useState<number | null>(null)
  const [topN, setTopN] = useState<number | null>(null)
  const [summaries, setSummaries] = useState<Record<string, DrillholeSummary>>({})
  // Project-level filters (kept in Explorer)
  const [projectFilters, setProjectFilters] = useState<{
    commodities: string[]
    stage: string
    priority: '' | 'HIGH' | 'MEDIUM' | 'LOW'
    region: string
  }>({
    commodities: [],
    stage: '',
    priority: '',
    region: ''
  })
  const [summariesLoading, setSummariesLoading] = useState(false)
  // Warm-up banner state
  const [mapLoading, setMapLoading] = useState(true)
  const [showWarmup, setShowWarmup] = useState(false)
  const warmupTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (mapLoading) {
      // Only show banner if loading lasts >2s
      warmupTimer.current = setTimeout(() => setShowWarmup(true), 2000)
    } else {
      setShowWarmup(false)
      if (warmupTimer.current) clearTimeout(warmupTimer.current)
    }
    return () => { if (warmupTimer.current) clearTimeout(warmupTimer.current) }
  }, [mapLoading])

  // Fetch projects list and set default to Filo del Sol
  useEffect(() => {
    let mounted = true
    import('@/lib/api').then(({ api }) => {
      api.getProjects()
        .then((p: any[]) => {
          if (!mounted) return
          setProjects(p)
          const filo = p.find(x => x.slug === 'filo-del-sol') || p[0] || null
          setSelectedProject(filo)
        })
        .catch((err: any) => {
          console.error('Failed to fetch projects', err)
        })
    }).catch((e) => console.error('Dynamic import failed', e))
    return () => { mounted = false }
  }, [])
  
  // Project filter options derived from loaded projects
  const projectOptions = useMemo(() => {
    const commoditiesSet = new Set<string>()
    const stagesSet = new Set<string>()
    const regionsSet = new Set<string>()
    projects.forEach((p: any) => {
      if (p.commodity) {
        String(p.commodity).split(/[\s,\/\-]+/).map((s: string) => s.trim()).filter(Boolean).forEach((t: string) => commoditiesSet.add(t))
      }
      if (p.stage) stagesSet.add(p.stage)
      if (p.jurisdiction) regionsSet.add(p.jurisdiction)
    })
    return {
      commodities: Array.from(commoditiesSet).sort(),
      stages: Array.from(stagesSet).sort(),
      regions: Array.from(regionsSet).sort()
    }
  }, [projects])

  // Compute filtered projects based on projectFilters (frontend-only)
  const filteredProjects = useMemo(() => {
    const f = projectFilters
    return projects.filter((p: any) => {
      // commodity (multi-select supported internally, v1 UI uses single-select)
      if (f.commodities && f.commodities.length > 0) {
        const tokens = String(p.commodity || '').split(/[\s,\/\-]+/).map((s: string) => s.trim().toLowerCase()).filter(Boolean)
        const match = f.commodities.some((c) => tokens.includes(c.toLowerCase()))
        if (!match) return false
      }
      // stage (exact normalized match)
      if (f.stage) {
        if ((p.stage || '').toLowerCase() !== f.stage.toLowerCase()) return false
      }
      // priority (derived)
      if (f.priority) {
        if (rankProject(p).priority !== f.priority) return false
      }
      // region -> jurisdiction (exact normalized match)
      if (f.region) {
        if ((p.jurisdiction || '').toLowerCase() !== f.region.toLowerCase()) return false
      }
      return true
    })
  }, [projects, projectFilters])

  // Ensure currently-selected project remains visible even if filtered-out
  const shownProjects = useMemo(() => {
    if (!selectedProject) return filteredProjects
    if (filteredProjects.some(p => p.slug === selectedProject.slug)) return filteredProjects
    return [selectedProject, ...filteredProjects.filter((p: any) => p.slug !== selectedProject.slug)]
  }, [filteredProjects, selectedProject])

  // Counts for UX clarity
  const totalCount = projects.length
  const filteredCount = filteredProjects.length
  const shownCount = shownProjects.length
  const selectedKeptVisible = !!selectedProject && !filteredProjects.some(p => p.slug === selectedProject.slug)

  // Are any project filters active?
  const filtersActive = useMemo(() => {
    const f = projectFilters
    return Boolean(f.stage || f.priority || f.region || (f.commodities && f.commodities.length > 0))
  }, [projectFilters])

  

  // Auto-select rules when filters are active and there are matches
  useEffect(() => {
    if (!filtersActive) return
    if (filteredProjects.length === 0) {
      // keep current selection temporarily
      return
    }
    // If there are matches and selected project does not match, auto-select first
    if (!selectedProject) {
      setSelectedProject(filteredProjects[0])
      return
    }
    const matches = filteredProjects.some(p => p.slug === selectedProject.slug)
    if (!matches) {
      setSelectedProject(filteredProjects[0])
    }
  }, [filtersActive, filteredProjects])

  // Fetch summaries for drillholes (used by Au filter / ranking)
  useEffect(() => {
    let mounted = true
    const fetchSummaries = async () => {
      if (allDrillholes.length === 0) return
      try {
        setSummariesLoading(true)
        const out: Record<string, DrillholeSummary> = {}
        for (const dh of allDrillholes) {
          try {
            const s = await api.getDrillholeSummary(dh.drillhole_id)
            if (!mounted) return
            out[dh.drillhole_id] = s
          } catch (err) {
            // skip failures
          }
        }
        if (mounted) setSummaries(out)
      } finally {
        if (mounted) setSummariesLoading(false)
      }
    }
    fetchSummaries()
    return () => { mounted = false }
  }, [allDrillholes])

  // Compute filtered drillholes derived from allDrillholes + summaries + filters
  // NOTE: keep this stable w.r.t. `selectedDrillhole` so sidebar widgets
  // that depend on `drillholes` don't re-run their effects when selection changes.
  const filteredDrillholes = useMemo(() => {
    let list = allDrillholes.slice()
    if (minDepthFilter != null) {
      list = list.filter(h => (h.max_depth ?? 0) >= minDepthFilter)
    }
    if (auThreshold != null) {
      list = list.filter(h => {
        const s = summaries[h.drillhole_id]
        return s && (s.max_au ?? 0) >= auThreshold
      })
    }
    if (topN != null) {
      list = list.slice().sort((a, b) => (summaries[b.drillhole_id]?.max_au ?? 0) - (summaries[a.drillhole_id]?.max_au ?? 0)).slice(0, topN)
    }
    return list
  }, [allDrillholes, summaries, auThreshold, minDepthFilter, topN])

  // Provide a separate list for the map that will include the currently-selected
  // drillhole if it's currently filtered out. This keeps `filteredDrillholes`
  // identity stable for sidebars while ensuring the map still shows the selection.
  const visibleDrillholes = useMemo(() => {
    if (!selectedDrillhole) return filteredDrillholes
    if (filteredDrillholes.some(h => h.drillhole_id === selectedDrillhole.drillhole_id)) return filteredDrillholes
    return [selectedDrillhole, ...filteredDrillholes]
  }, [filteredDrillholes, selectedDrillhole])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">GeoPlatform</h1>
              <p className="text-xs text-slate-500">Mineral Exploration Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="text-sm rounded border px-2 py-1 bg-white dark:bg-slate-900"
              value={selectedProject?.slug ?? ''}
              onChange={(e) => {
                const slug = e.target.value
                const p = shownProjects.find(pr => pr.slug === slug) || null
                setSelectedProject(p)
              }}
            >
              {shownProjects.map(p => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
            <span className="text-xs text-slate-400 ml-2">Showing {shownCount} of {totalCount} projects</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Hero Section removed: now dynamic ProjectOverview is the main header */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Section: ProjectOverview + Map */}
          <div className="lg:col-span-2 flex flex-col">
            {/* Project Overview as contextual header */}
            <ProjectOverview project={selectedProject} />

            {/* Warm-up Banner */}
            {showWarmup && (
              <div
                className="mb-3 flex items-center gap-3 px-4 py-2.5 rounded-lg border border-amber-400/60 bg-slate-900/80 shadow-sm animate-fade-in"
                style={{ minHeight: 44, borderWidth: 1.5, boxShadow: '0 2px 8px rgba(252,211,77,0.07)' }}
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-gradient-to-br from-amber-400/80 to-blue-400/80">
                  <Globe className="w-4 h-4 text-white drop-shadow" />
                </span>
                <div className="flex-1">
                  <div className="font-semibold text-amber-200 text-sm tracking-tight flex items-center gap-2">
                    <span className="animate-pulse">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" strokeOpacity=".5" />
                        <path d="M12 6v6l4 2" stroke="#fbbf24" strokeLinecap="round" />
                      </svg>
                    </span>
                    Warming up exploration services...
                  </div>
                  <div className="text-xs text-slate-300/80 mt-0.5">First load may take up to ~60 seconds while the backend wakes up.</div>
                </div>
                <span className="ml-3 px-2 py-0.5 rounded text-xs font-medium bg-slate-800/80 text-amber-300 border border-amber-400/30">Render free tier</span>
                {/* Progress shimmer */}
                <div className="absolute left-0 bottom-0 w-full h-1 overflow-hidden rounded-b-lg">
                  <div className="h-full bg-gradient-to-r from-amber-400/60 via-blue-400/40 to-amber-400/60 animate-shimmer" style={{ width: '60%' }} />
                </div>
              </div>
            )}

            {/* Map Section — visually dominant */}

            <div
              className="relative mt-2"
              style={{
                minHeight: isMobileFromMap ? '100dvh' : '800px',
              }}
            >
              <MapView
                onDrillholeSelect={setSelectedDrillhole}
                onDrillholesLoaded={setAllDrillholes}
                selectedDrillholeId={selectedDrillhole?.drillhole_id ?? null}
                visibleDrillholes={visibleDrillholes}
                onLoadingChange={setMapLoading}
                weather={(() => { console.log('[Explorer] passing weather to MapView:', weather); return weather })()}
                project={selectedProject}
                projects={shownProjects}
                onProjectSelect={setSelectedProject}
                onWeather={handleWeather}
                onIsMobileChange={setIsMobileFromMap}
              />
            </div>

            {/* Drillhole Analysis Panel and Assay Chart */}
            {selectedDrillhole && (
              <>
                <div className="mt-6">
                  <DrillholeSummaryCard
                    drillholeId={selectedDrillhole.drillhole_id}
                    holeName={selectedDrillhole.drillhole}
                    maxDepth={selectedDrillhole.max_depth}
                    isMobile={isMobileFromMap}
                  />
                </div>
                <div
                  className="mt-4 w-full"
                  style={{
                    maxWidth: '420px', // Desktop: constrain width
                    minHeight: window.innerWidth >= 1024 ? '340px' : undefined, // Desktop: taller chart
                    marginLeft: window.innerWidth >= 1024 ? 'auto' : undefined,
                    marginRight: window.innerWidth >= 1024 ? 'auto' : undefined,
                  }}
                >
                  <AssayChartToggle drillholeId={selectedDrillhole.drillhole_id} holeName={selectedDrillhole.drillhole} />
                </div>
              </>
            )}
          </div>
          {/* Sidebar: ExplorationRadar, TopDrillholes */}
          <div className="space-y-8">
            <ProjectFilters
              filters={projectFilters}
              options={{
                commodities: projectOptions.commodities,
                stages: projectOptions.stages,
                priorities: ['HIGH', 'MEDIUM', 'LOW'],
                regions: projectOptions.regions,
              }}
              onChange={(newFilters) => setProjectFilters(newFilters)}
              onReset={() => setProjectFilters({ commodities: [], stage: '', priority: '', region: '' })}
              totalCount={totalCount}
              filteredCount={filteredCount}
              selectedKeptVisible={selectedKeptVisible}
            />
            {/* Filters panel */}
            <Card className="border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Drillhole Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-slate-400">Au threshold (ppm)</div>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  placeholder="e.g. 0.5"
                  value={auThreshold ?? ''}
                  onChange={(e) => setAuThreshold(e.target.value === '' ? null : Number(e.target.value))}
                  className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-sm"
                />

                <div className="text-xs text-slate-400">Min depth (m)</div>
                <input
                  type="number"
                  step="1"
                  min={0}
                  value={minDepthFilter ?? ''}
                  onChange={(e) => setMinDepthFilter(e.target.value === '' ? null : Number(e.target.value))}
                  className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-sm"
                />

                <div className="text-xs text-slate-400">Top N (by max Au)</div>
                <select
                  value={topN ?? ''}
                  onChange={(e) => setTopN(e.target.value === '' ? null : Number(e.target.value))}
                  className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-sm"
                >
                  <option value="">All</option>
                  <option value="5">Top 5</option>
                  <option value="10">Top 10</option>
                  <option value="20">Top 20</option>
                </select>

                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={() => { setAuThreshold(null); setMinDepthFilter(null); setTopN(null) }}
                    className="px-3 py-1 rounded bg-slate-700 text-sm text-slate-200"
                  >Reset</button>
                  <div className="text-[11px] text-slate-400">
                    {summariesLoading
                      ? 'Loading summaries…'
                      : `Showing ${filteredDrillholes.length} / ${allDrillholes.length} drillholes`}
                  </div>
                </div>
              </CardContent>
            </Card>

            <ExplorationRadar
              drillholes={filteredDrillholes}
              onSelectDrillhole={setSelectedDrillhole}
            />
            <TopDrillholes
              drillholes={filteredDrillholes}
              onSelectDrillhole={setSelectedDrillhole}
              selectedDrillholeId={selectedDrillhole?.drillhole_id ?? null}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-slate-500 dark:text-slate-600">
          <p>GeoPlatform · Mineral Exploration Dashboard · React + Vite + FastAPI</p>
        </div>
      </footer>
    </div>
  )
}

export default Explorer;
