import { Search, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface SearchFilterProps {
  searchTerm: string
  onSearchChange: (term: string) => void
}

export function SearchFilter({
  searchTerm,
  onSearchChange,
}: SearchFilterProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center space-x-2 text-base">
          <Search className="w-4 h-4" />
          <span>Search Drillholes</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by hole ID..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-9 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
