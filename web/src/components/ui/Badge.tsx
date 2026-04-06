import React from 'react';

export function Badge({ children, color = 'amber', className = '' }: { children: React.ReactNode, color?: string, className?: string }) {
  const colorClass = color === 'amber'
    ? 'bg-amber-600/80 text-white border-amber-400/60'
    : 'bg-slate-700 text-white border-slate-500/60';
  return (
    <span className={`inline-block rounded px-2 py-0.5 border font-semibold ${colorClass} ${className}`}>
      {children}
    </span>
  );
}
