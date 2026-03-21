import { Search, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface SearchFilterProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  auFilter: { min: number; max: number }
  onAuFilterChange: (filter: { min: number; max: number }) => void
  maxAuValue: number
}

export function SearchFilter({
  searchTerm,
  onSearchChange,
  auFilter,
  onAuFilterChange,
  maxAuValue,
}: SearchFilterProps) {
  const handleReset = () => {
    onSearchChange('')
    onAuFilterChange({ min: 0, max: maxAuValue })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-base">
          <Filter className="w-4 h-4" />
          <span>Buscar & Filtrar</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar drillhole..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Au Filter */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Au (ppb)</label>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
              {auFilter.min.toFixed(2)} - {auFilter.max.toFixed(2)}
            </span>
          </div>

          {/* Range Slider - Min */}
          <div className="space-y-1">
            <input
              type="range"
              min="0"
              max={maxAuValue}
              step="0.1"
              value={auFilter.min}
              onChange={(e) =>
                onAuFilterChange({
                  ...auFilter,
                  min: Math.min(parseFloat(e.target.value), auFilter.max),
                })
              }
              className="w-full h-2 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <p className="text-xs text-slate-500">Mínimo: {auFilter.min.toFixed(2)} ppb</p>
          </div>

          {/* Range Slider - Max */}
          <div className="space-y-1">
            <input
              type="range"
              min="0"
              max={maxAuValue}
              step="0.1"
              value={auFilter.max}
              onChange={(e) =>
                onAuFilterChange({
                  ...auFilter,
                  max: Math.max(parseFloat(e.target.value), auFilter.min),
                })
              }
              className="w-full h-2 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <p className="text-xs text-slate-500">Máximo: {auFilter.max.toFixed(2)} ppb</p>
          </div>
        </div>

        {/* Reset Button */}
        <Button
          onClick={handleReset}
          className="w-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 text-sm"
        >
          Limpiar Filtros
        </Button>

        {/* Info */}
        <p className="text-xs text-slate-500 dark:text-slate-400 p-2 bg-slate-50 dark:bg-slate-800 rounded">
          💡 Ordena los drillholes por Au máximo y explora los datos de mayor valor.
        </p>
      </CardContent>
    </Card>
  )
}
