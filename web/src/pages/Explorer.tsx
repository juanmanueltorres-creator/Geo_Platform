import { useState, useRef, useEffect, useCallback } from 'react'
import { Zap, Globe } from 'lucide-react'
import { MapView } from '@/components/MapView'
import type { Weather } from '@/components/FieldConditions'
import { AssayChart } from '@/components/AssayChart'
import { ThemeToggle } from '@/components/ThemeToggle'
import { FieldConditions } from '@/components/FieldConditions'

import { TopDrillholes } from '@/components/TopDrillholes'
import { ExplorationRadar } from '@/components/ExplorationRadar'
import { Card } from '@/components/ui/Card'
import { ProjectOverview } from '@/components/ProjectOverview'
import type { Drillhole } from '@/types'

export function Explorer() {
  const [weather, setWeather] = useState<Weather | null>(null)
  // Weather handler for FieldConditions
  const handleWeather = useCallback((w: Weather | null) => setWeather(w), [])
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<any | null>(null)
  const [selectedDrillhole, setSelectedDrillhole] = useState<Drillhole | null>(null)
  const [allDrillholes, setAllDrillholes] = useState<Drillhole[]>([])
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
                const p = projects.find(pr => pr.slug === slug) || null
                setSelectedProject(p)
              }}
            >
              {projects.map(p => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
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
            <Card className="h-[800px] mt-2">
              <MapView
                onDrillholeSelect={setSelectedDrillhole}
                onDrillholesLoaded={setAllDrillholes}
                selectedDrillholeId={selectedDrillhole?.drillhole_id ?? null}
                onLoadingChange={setMapLoading}
                weather={(() => { console.log('[Explorer] passing weather to MapView:', weather); return weather })()}
                project={selectedProject}
                projects={projects}
                onProjectSelect={setSelectedProject}
              />
            </Card>

            {/* Assay Chart */}
            {selectedDrillhole && (
              <div className="mt-6">
                <AssayChart 
                  drillholeId={selectedDrillhole.drillhole_id}
                  holeName={selectedDrillhole.drillhole}
                />
              </div>
            )}
          </div>

          {/* Sidebar: only FieldConditions, ExplorationRadar, TopDrillholes */}
          <div className="space-y-8">
            <FieldConditions project={selectedProject} onWeather={handleWeather} />
            <ExplorationRadar
              drillholes={allDrillholes}
              onSelectDrillhole={setSelectedDrillhole}
            />
            <TopDrillholes
              drillholes={allDrillholes}
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
