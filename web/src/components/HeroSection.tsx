import { MapPin, BarChart3, Layers } from 'lucide-react'

export function HeroSection() {
  return (
    <div className="mb-5">
      {/* Compact banner — product identity in one breath */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
        <div>
          <h2 className="text-xl font-bold text-white">
            Filo del Sol — Unlocking a World-Class Cu-Au System
          </h2>
          <p className="text-sm text-slate-400">
            High-sulfidation epithermal target at 4,200 m in the Andean Cordillera. Explore grade, geology, and structure in real time.
          </p>
        </div>
        {/* 3 inline capability pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { icon: MapPin, label: 'Spatial' },
            { icon: BarChart3, label: 'Assays' },
            { icon: Layers, label: 'Geology' },
          ].map(c => (
            <span
              key={c.label}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700/50 text-[11px] text-slate-400"
            >
              <c.icon className="w-3 h-3 text-amber-400" />
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
