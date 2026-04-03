import { Search, X } from 'lucide-react'

interface SearchFilterProps {
  searchTerm: string
  onSearchChange: (term: string) => void
}

export function SearchFilter({
  searchTerm,
  onSearchChange,
}: SearchFilterProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
      <input
        type="text"
        placeholder="Search drillholes..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-10 pr-9 py-2 rounded-lg border border-slate-700 bg-slate-800/50 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-colors"
      />
      {searchTerm && (
        <button
          onClick={() => onSearchChange('')}
          className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
