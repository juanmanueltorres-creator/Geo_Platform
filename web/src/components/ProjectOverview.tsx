import React from 'react';
import { Badge } from './ui/Badge';

interface ProjectOverviewProps {
  project: any;
}

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({ project }) => {
  if (!project) return null;
  return (
    <div className="rounded-lg bg-slate-900/80 border border-slate-800 px-5 py-5 mb-6 text-sm text-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg font-extrabold text-slate-50 tracking-tight">{project.name}</span>
        {project.status_label && (
          <Badge color="amber" className="ml-2 text-[11px] font-semibold px-1.5 py-0.5 bg-amber-200/40 text-amber-900 border-amber-300/40" style={{letterSpacing:0.2}}>
            {project.status_label}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-2">
        <span className="text-slate-100 font-medium">{project.company}</span>
        <span className="text-slate-100 font-medium">{project.project_type}</span>
        <span className="text-slate-500 font-normal">{project.commodity}</span>
        <span className="text-slate-500 font-normal">{project.jurisdiction}</span>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-2">
        <span className="text-slate-400">Lat: {project.lat?.toFixed ? project.lat.toFixed(4) : project.lat}</span>
        <span className="text-slate-400">Lon: {project.lon?.toFixed ? project.lon.toFixed(4) : project.lon}</span>
      </div>
      {project.notes && (
        <div className="mt-3 text-slate-100 text-[13px] italic border-l-2 border-amber-400/30 pl-3 leading-relaxed">
          {project.notes}
        </div>
      )}
    </div>
  );
};
