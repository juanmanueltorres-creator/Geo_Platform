import React from 'react';
import { Badge } from './ui/Badge';
import { rankProject } from '../lib/ranking';

interface ProjectOverviewProps {
  project: any;
}

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({ project }) => {
  if (!project) return null;
  const ranking = rankProject(project);
  return (
    <div className="rounded-lg bg-slate-900/80 border border-slate-800 px-5 py-5 mb-6 text-sm text-slate-200 shadow-sm">
      {/* 1. Top row: Project identity */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg font-extrabold text-slate-50 tracking-tight">{project.name}</span>
        {project.status_label && (
          <Badge color="amber" className="ml-2 text-[11px] font-semibold px-1.5 py-0.5 bg-amber-200/40 text-amber-900 border-amber-300/40" style={{letterSpacing:0.2}}>
            {project.status_label}
          </Badge>
        )}
        <Badge color={
          ranking.priority === 'HIGH' ? 'amber' : ranking.priority === 'MEDIUM' ? 'slate' : 'slate'
        } className={`ml-2 text-xs px-2 py-0.5 font-bold border-2 ${
          ranking.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border-amber-400/60' :
          ranking.priority === 'MEDIUM' ? 'bg-slate-700/60 text-slate-200 border-slate-400/40' :
          'bg-slate-800/60 text-slate-400 border-slate-500/40'
        }`}>
          {ranking.priority} PRIORITY
        </Badge>
        <span className="ml-2 text-xs text-slate-400">Confidence: <span className="font-semibold text-slate-200">{ranking.confidence}</span></span>
      </div>

      {/* 2. Secondary metadata row */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-2">
        <span className="text-slate-100 font-medium">{project.company}</span>
        <span className="text-slate-500 font-normal">{project.commodity}</span>
        <span className="text-slate-500 font-normal">{project.jurisdiction}</span>
      </div>

      {/* 3. Geological context block (compact, labeled) */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-2">
        {project.district && (
          <span className="text-slate-400"><span className="font-semibold text-slate-300">District:</span> {project.district}</span>
        )}
        {project.deposit_model && (
          <span className="text-slate-400"><span className="font-semibold text-slate-300">Model:</span> {project.deposit_model}</span>
        )}
        {project.host_rocks && (
          <span className="text-slate-400"><span className="font-semibold text-slate-300">Host:</span> {project.host_rocks}</span>
        )}
        {project.mineralization_style && (
          <span className="text-slate-400"><span className="font-semibold text-slate-300">Mineralization:</span> {project.mineralization_style}</span>
        )}
      </div>
      {project.geological_setting && (
        <div className="text-xs text-slate-500 mb-2 ml-1">{project.geological_setting}</div>
      )}

      {/* 4. Location/context row */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-2">
        {project.elevation_m && (
          <span className="text-slate-400"><span className="font-semibold text-slate-300">Elevation:</span> {project.elevation_m} m</span>
        )}
        <span className="text-slate-400">Lat: {project.lat?.toFixed ? project.lat.toFixed(4) : project.lat}</span>
        <span className="text-slate-400">Lon: {project.lon?.toFixed ? project.lon.toFixed(4) : project.lon}</span>
      </div>

      {/* 5. Notes (short, concluding) */}
      {project.notes && (
        <div className="mt-2 text-slate-100 text-[13px] italic border-l-2 border-amber-400/30 pl-3 leading-relaxed truncate">
          {project.notes}
        </div>
      )}

      {/* 6. Ranking reasons (lighter, separate) */}
      {ranking.reasons.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-slate-400 mb-1 font-semibold">Why ranked this way:</div>
          <div className="flex flex-wrap gap-2">
            {ranking.reasons.map((reason, i) => (
              <span key={i} className="bg-slate-800/70 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-300 whitespace-nowrap">
                {reason}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
