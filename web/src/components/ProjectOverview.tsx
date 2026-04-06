import React from 'react';
import { Badge } from './ui/Badge';

interface ProjectOverviewProps {
  project: any;
}

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({ project }) => {
  if (!project) return null;
  return (
    <div className="rounded-lg bg-slate-900/80 border border-slate-800 px-4 py-4 mb-4 text-sm text-slate-200 shadow">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg font-bold text-slate-50">{project.name}</span>
        {project.status_label && (
          <Badge color="amber" className="ml-2 text-xs font-semibold px-2 py-0.5 bg-amber-600/80 text-white border-amber-400/60">
            {project.status_label}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-1">
        <span className="text-slate-400">{project.company}</span>
        <span className="text-slate-400">{project.project_type}</span>
        <span className="text-slate-400">{project.commodity}</span>
        <span className="text-slate-400">{project.jurisdiction}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-1">
        <span className="text-slate-500">Lat: {project.lat}</span>
        <span className="text-slate-500">Lon: {project.lon}</span>
      </div>
      {project.notes && (
        <div className="mt-2 text-slate-300 text-xs italic border-l-2 border-amber-400/40 pl-3">
          {project.notes}
        </div>
      )}
    </div>
  );
};
