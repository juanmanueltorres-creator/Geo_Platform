import { MapPin, TrendingUp, BarChart3, Activity } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export function HeroSection() {
  return (
    <div className="mb-8 space-y-4">
      {/* Main Hero */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 border-slate-700 overflow-hidden">
        <div className="p-8">
          <h2 className="text-3xl font-bold text-white mb-3">
            🌍 Explora Datos de Perforaciones en Tiempo Real
          </h2>
          <p className="text-lg text-slate-200 mb-6">
            Una plataforma interactiva donde geólogos exploran datos de perforaciones (drillholes), 
            muestras y ensayos de oro. Mapa interactivo + gráficos + estadísticas.
          </p>
          
          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3 p-3 bg-slate-800/50 rounded-lg">
              <MapPin className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white text-sm">Ver Perforaciones</p>
                <p className="text-xs text-slate-300">Visualiza todos los drillholes en el mapa</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-slate-800/50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white text-sm">Resultados de Oro</p>
                <p className="text-xs text-slate-300">Revisa Au ppb por pozo de perforación</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-slate-800/50 rounded-lg">
              <BarChart3 className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white text-sm">Patrones de Minerales</p>
                <p className="text-xs text-slate-300">Analiza distribución de elementos</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-slate-800/50 rounded-lg">
              <Activity className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white text-sm">Profundidad vs. Oro</p>
                <p className="text-xs text-slate-300">Gráficos interactivos de cambio de Au</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Dataset Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">4</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Drillholes</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">~1.2k</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Samples</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">682</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Assays</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">Real-time</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">API</p>
        </Card>
      </div>
    </div>
  )
}
