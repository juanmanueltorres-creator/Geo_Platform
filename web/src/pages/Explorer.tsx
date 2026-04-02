import { useState } from 'react'
import { TrendingUp, Zap } from 'lucide-react'
import { MapView } from '@/components/MapView'
import { DrillholeSummaryCard } from '@/components/DrillholeSummaryCard'
import { AssayChart } from '@/components/AssayChart'
import { ThemeToggle } from '@/components/ThemeToggle'
import { HeroSection } from '@/components/HeroSection'
import { SearchFilter } from '@/components/SearchFilter'
import { TopDrillholes } from '@/components/TopDrillholes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import type { Drillhole, PeakZone } from '@/types'

export function Explorer() {
  const [selectedDrillhole, setSelectedDrillhole] = useState<Drillhole | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [allDrillholes, setAllDrillholes] = useState<Drillhole[]>([])
  const [peakZone, setPeakZone] = useState<PeakZone | null>(null)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-geo-primary to-geo-accent rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">🌍 GeoPlatform</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Mineral Exploration Explorer v3.0</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <HeroSection />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <Card className="h-[600px]">
              <MapView 
                onDrillholeSelect={setSelectedDrillhole}
                onDrillholesLoaded={setAllDrillholes}
                selectedDrillholeId={selectedDrillhole?.drillhole_id ?? null}
              />
            </Card>
            
            {/* Assay Chart */}
            {selectedDrillhole && (
              <div className="mt-6">
                <AssayChart 
                  drillholeId={selectedDrillhole.drillhole_id}
                  holeName={selectedDrillhole.drillhole}
                  onPeakComputed={setPeakZone}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Search & Filter */}
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />

            {/* Top Drillholes (Premium Feature) */}
            <TopDrillholes
              drillholes={allDrillholes}
              onSelectDrillhole={setSelectedDrillhole}
              selectedDrillholeId={selectedDrillhole?.drillhole_id ?? null}
              searchTerm={searchTerm}
            />

            {/* Selected Drillhole Summary */}
            {selectedDrillhole ? (
              <DrillholeSummaryCard
                drillholeId={selectedDrillhole.drillhole_id}
                holeName={selectedDrillhole.drillhole}
                maxDepth={selectedDrillhole.max_depth}
                peakZone={peakZone}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-slate-400" />
                    <span>Quick Info</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">API Status</p>
                    <p className="font-semibold text-green-600 dark:text-green-400 flex items-center space-x-2">
                      <span className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full" />
                      <span>Connected</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Usa el buscador para encontrar perforaciones o haz clic en el mapa para ver detalles.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>GEO-PLATFORM v3.0 | Built with React, Vite & Shadcn/ui</p>
        </div>
      </footer>
    </div>
  )
}
